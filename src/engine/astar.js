import { MinHeap } from './MinHeap.js';
import { OBJECTIVE_MODES } from './Graph.js';
import { haversineDistance } from './haversine.js';
import { reconstructRoute } from './dijkstra.js';

const nowMs = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

/**
 * Computes the A* heuristic h(n) from node to goal.
 * - For 'distance' and 'penalty' objectives (where penalty >= 0 adds onto distanceKm),
 *   Haversine great-circle distance is an admissible lower bound: h(n) <= trueRemainingCost(n).
 * - For 'stops' objective (unit edge weights), h(n) = 1 for any non-goal node (admissible hop lower bound).
 */
export function computeHeuristic(nodeAirport, goalAirport, objective) {
  if (nodeAirport.id === goalAirport.id) {
    return { value: 0, haversineKm: 0, admissible: true };
  }
  const haversineKm = haversineDistance(
    nodeAirport.lat,
    nodeAirport.lon,
    goalAirport.lat,
    goalAirport.lon
  );

  if (objective === OBJECTIVE_MODES.STOPS) {
    return {
      value: 1,
      haversineKm,
      admissible: true,
      note: 'Hop-count mode uses admissible 1-stop lower bound instead of raw km.',
    };
  }

  return {
    value: haversineKm,
    haversineKm,
    admissible: true,
  };
}

/**
 * Executes A* Search using f(n) = g(n) + h(n) with Haversine geographic heuristic.
 */
export function runAStar(graph, sourceInput, targetInput, options = {}) {
  const startTime = nowMs();
  const objective = options.objective || OBJECTIVE_MODES.DISTANCE;
  const recordSteps = options.recordSteps !== false;

  const sourceId = String(sourceInput || '').trim().toUpperCase();
  const targetId = String(targetInput || '').trim().toUpperCase();

  const sourceAirport = graph.getAirport(sourceId);
  const targetAirport = graph.getAirport(targetId);

  if (!sourceAirport || !targetAirport) {
    return {
      algorithm: 'astar',
      objective,
      found: false,
      error: !sourceAirport
        ? `Unknown source airport: ${sourceId}`
        : `Unknown destination airport: ${targetId}`,
      path: [],
      legs: [],
      stops: 0,
      totalCost: 0,
      totalDistanceKm: 0,
      totalFlightTimeMin: 0,
      totalDelayMin: 0,
      visitedOrder: [],
      visitedCount: 0,
      relaxations: 0,
      heuristicAdmissible: true,
      executionTimeMs: nowMs() - startTime,
      steps: [],
    };
  }

  if (!sourceAirport.enabled || !targetAirport.enabled) {
    return {
      algorithm: 'astar',
      objective,
      found: false,
      error: !sourceAirport.enabled
        ? `Source airport ${sourceId} is currently disabled.`
        : `Destination airport ${targetId} is currently disabled.`,
      path: [],
      legs: [],
      stops: 0,
      totalCost: 0,
      totalDistanceKm: 0,
      totalFlightTimeMin: 0,
      totalDelayMin: 0,
      visitedOrder: [],
      visitedCount: 0,
      relaxations: 0,
      heuristicAdmissible: true,
      executionTimeMs: nowMs() - startTime,
      steps: [],
    };
  }

  if (sourceId === targetId) {
    return {
      algorithm: 'astar',
      objective,
      found: true,
      path: [sourceId],
      legs: [],
      stops: 0,
      totalCost: 0,
      totalDistanceKm: 0,
      totalFlightTimeMin: 0,
      totalDelayMin: 0,
      visitedOrder: [sourceId],
      visitedCount: 1,
      relaxations: 0,
      heuristicAdmissible: true,
      executionTimeMs: nowMs() - startTime,
      steps: recordSteps
        ? [{ step: 1, current: sourceId, gScore: 0, hScore: 0, fScore: 0, frontier: [] }]
        : [],
    };
  }

  const gScore = new Map();
  const fScore = new Map();
  const hCache = new Map();
  const previous = new Map();
  const previousEdge = new Map();
  const closedSet = new Set();
  const visitedOrder = [];
  const steps = [];
  let relaxations = 0;

  const getH = (airportId) => {
    if (hCache.has(airportId)) return hCache.get(airportId);
    const node = graph.getAirport(airportId);
    const result = computeHeuristic(node, targetAirport, objective);
    hCache.set(airportId, result.value);
    return result.value;
  };

  for (const airport of graph.getAllAirports()) {
    gScore.set(airport.id, Infinity);
    fScore.set(airport.id, Infinity);
  }

  const hStart = getH(sourceId);
  gScore.set(sourceId, 0);
  fScore.set(sourceId, hStart);

  // Tie-break equal f(n) toward smaller h(n) (closer to goal)
  const pq = new MinHeap((a, b) => {
    const diff = a.f - b.f;
    if (Math.abs(diff) > 1e-9) return diff;
    return a.h - b.h;
  });
  pq.push({ node: sourceId, f: hStart, h: hStart, g: 0 });

  while (!pq.isEmpty()) {
    const { node: u, g: poppedG } = pq.pop();

    if (closedSet.has(u)) continue;
    if (poppedG > gScore.get(u)) continue;

    closedSet.add(u);
    visitedOrder.push(u);

    const hU = getH(u);
    const fU = poppedG + hU;
    const updatedNeighbors = [];

    if (u === targetId) {
      if (recordSteps) {
        steps.push({
          step: visitedOrder.length,
          current: u,
          gScore: Math.round(poppedG * 100) / 100,
          hScore: Math.round(hU * 100) / 100,
          fScore: Math.round(fU * 100) / 100,
          updatedNeighbors,
          frontier: Array.from(
            new Set(pq.heap.map((item) => item.node).filter((n) => !closedSet.has(n)))
          ),
        });
      }
      break;
    }

    const neighbors = graph.getNeighbors(u);
    for (const edge of neighbors) {
      const v = edge.to;
      if (closedSet.has(v)) continue;

      const weight = graph.getEdgeWeight(edge, objective);
      if (weight < 0) {
        throw new Error(`A* requires non-negative edge weights; got ${weight} on ${edge.id}`);
      }

      const tentativeG = poppedG + weight;
      if (tentativeG < gScore.get(v)) {
        const hV = getH(v);
        const fV = tentativeG + hV;
        gScore.set(v, tentativeG);
        fScore.set(v, fV);
        previous.set(v, u);
        previousEdge.set(v, edge);
        pq.push({ node: v, f: fV, h: hV, g: tentativeG });
        relaxations++;
        updatedNeighbors.push({
          to: v,
          gScore: Math.round(tentativeG * 100) / 100,
          hScore: Math.round(hV * 100) / 100,
          fScore: Math.round(fV * 100) / 100,
        });
      }
    }

    if (recordSteps) {
      steps.push({
        step: visitedOrder.length,
        current: u,
        gScore: Math.round(poppedG * 100) / 100,
        hScore: Math.round(hU * 100) / 100,
        fScore: Math.round(fU * 100) / 100,
        updatedNeighbors,
        frontier: Array.from(
          new Set(pq.heap.map((item) => item.node).filter((n) => !closedSet.has(n)))
        ),
      });
    }
  }

  const executionTimeMs = nowMs() - startTime;
  const reached = closedSet.has(targetId) && Number.isFinite(gScore.get(targetId));

  if (!reached) {
    return {
      algorithm: 'astar',
      objective,
      found: false,
      error: `No reachable route exists between ${sourceId} and ${targetId}.`,
      path: [],
      legs: [],
      stops: 0,
      totalCost: Infinity,
      totalDistanceKm: 0,
      totalFlightTimeMin: 0,
      totalDelayMin: 0,
      visitedOrder,
      visitedCount: visitedOrder.length,
      relaxations,
      heuristicAdmissible: true,
      executionTimeMs,
      steps,
    };
  }

  const reconstructed = reconstructRoute(
    graph,
    previous,
    previousEdge,
    sourceId,
    targetId,
    objective
  );

  // Check if any edge along the graph has weight < geometric distance (possible if user manually lowers distance below straight-line)
  let heuristicAdmissible = true;
  if (objective !== OBJECTIVE_MODES.STOPS) {
    for (const route of graph.getAllRoutes(false)) {
      const a = graph.getAirport(route.from);
      const b = graph.getAirport(route.to);
      if (a && b) {
        const directKm = haversineDistance(a.lat, a.lon, b.lat, b.lon);
        if (graph.getEdgeWeight(route, objective) + 1e-3 < directKm) {
          heuristicAdmissible = false;
          break;
        }
      }
    }
  }

  return {
    algorithm: 'astar',
    objective,
    found: true,
    path: reconstructed.path,
    legs: reconstructed.legs,
    stops: Math.max(0, reconstructed.path.length - 2),
    totalCost: Math.round(gScore.get(targetId) * 100) / 100,
    totalDistanceKm: reconstructed.totalDistanceKm,
    totalFlightTimeMin: reconstructed.totalFlightTimeMin,
    totalDelayMin: reconstructed.totalDelayMin,
    visitedOrder,
    visitedCount: visitedOrder.length,
    relaxations,
    heuristicAdmissible,
    executionTimeMs,
    steps,
  };
}
