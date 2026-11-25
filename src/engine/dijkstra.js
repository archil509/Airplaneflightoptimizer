import { MinHeap } from './MinHeap.js';
import { OBJECTIVE_MODES } from './Graph.js';

const nowMs = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

/**
 * Reconstructs path and leg-by-leg metrics from predecessor pointers.
 */
export function reconstructRoute(graph, previous, previousEdge, sourceId, targetId, objective) {
  const path = [];
  const legs = [];
  let cursor = targetId;

  while (cursor !== null && cursor !== undefined) {
    path.unshift(cursor);
    const edge = previousEdge.get(cursor);
    if (edge) {
      legs.unshift({
        from: edge.from,
        to: edge.to,
        distanceKm: edge.distanceKm,
        flightTimeMin: edge.flightTimeMin,
        delayMin: edge.delayMin || 0,
        frequencyPerDay: edge.frequencyPerDay ?? 4,
        weight: graph.getEdgeWeight(edge, objective),
      });
    }
    cursor = previous.get(cursor) ?? null;
  }

  if (path[0] !== sourceId) {
    return { path: [], legs: [], totalDistanceKm: 0, totalFlightTimeMin: 0, totalDelayMin: 0 };
  }

  let totalDistanceKm = 0;
  let totalFlightTimeMin = 0;
  let totalDelayMin = 0;
  for (const leg of legs) {
    totalDistanceKm += leg.distanceKm;
    totalFlightTimeMin += leg.flightTimeMin + leg.delayMin;
    totalDelayMin += leg.delayMin;
  }

  return {
    path,
    legs,
    totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
    totalFlightTimeMin,
    totalDelayMin,
  };
}

/**
 * Executes Dijkstra's Shortest-Path Algorithm using an adjacency list and binary min-heap.
 * Time Complexity: O((V + E) log V) for non-negative edge weights.
 */
export function runDijkstra(graph, sourceInput, targetInput, options = {}) {
  const startTime = nowMs();
  const objective = options.objective || OBJECTIVE_MODES.DISTANCE;
  const recordSteps = options.recordSteps !== false;

  const sourceId = String(sourceInput || '').trim().toUpperCase();
  const targetId = String(targetInput || '').trim().toUpperCase();

  const sourceAirport = graph.getAirport(sourceId);
  const targetAirport = graph.getAirport(targetId);

  if (!sourceAirport || !targetAirport) {
    return {
      algorithm: 'dijkstra',
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
      executionTimeMs: nowMs() - startTime,
      steps: [],
    };
  }

  if (!sourceAirport.enabled || !targetAirport.enabled) {
    return {
      algorithm: 'dijkstra',
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
      executionTimeMs: nowMs() - startTime,
      steps: [],
    };
  }

  if (sourceId === targetId) {
    return {
      algorithm: 'dijkstra',
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
      executionTimeMs: nowMs() - startTime,
      steps: recordSteps
        ? [{ step: 1, current: sourceId, gScore: 0, hScore: 0, fScore: 0, frontier: [] }]
        : [],
    };
  }

  const dist = new Map();
  const previous = new Map();
  const previousEdge = new Map();
  const finalized = new Set();
  const visitedOrder = [];
  const steps = [];
  let relaxations = 0;

  for (const airport of graph.getAllAirports()) {
    dist.set(airport.id, Infinity);
  }
  dist.set(sourceId, 0);

  const pq = new MinHeap((a, b) => a.priority - b.priority);
  pq.push({ node: sourceId, priority: 0 });

  while (!pq.isEmpty()) {
    const { node: u, priority: currentDist } = pq.pop();

    if (finalized.has(u)) continue;
    if (currentDist > dist.get(u)) continue;

    finalized.add(u);
    visitedOrder.push(u);

    const neighbors = graph.getNeighbors(u);
    const updatedNeighbors = [];

    if (u === targetId) {
      if (recordSteps) {
        steps.push({
          step: visitedOrder.length,
          current: u,
          gScore: Math.round(currentDist * 100) / 100,
          hScore: 0,
          fScore: Math.round(currentDist * 100) / 100,
          updatedNeighbors,
          frontier: Array.from(
            new Set(pq.heap.map((item) => item.node).filter((n) => !finalized.has(n)))
          ),
        });
      }
      break;
    }

    for (const edge of neighbors) {
      const v = edge.to;
      if (finalized.has(v)) continue;

      const weight = graph.getEdgeWeight(edge, objective);
      if (weight < 0) {
        throw new Error(`Dijkstra requires non-negative edge weights; got ${weight} on ${edge.id}`);
      }

      const candidate = currentDist + weight;
      if (candidate < dist.get(v)) {
        dist.set(v, candidate);
        previous.set(v, u);
        previousEdge.set(v, edge);
        pq.push({ node: v, priority: candidate });
        relaxations++;
        updatedNeighbors.push({ to: v, newCost: Math.round(candidate * 100) / 100 });
      }
    }

    if (recordSteps) {
      steps.push({
        step: visitedOrder.length,
        current: u,
        gScore: Math.round(currentDist * 100) / 100,
        hScore: 0,
        fScore: Math.round(currentDist * 100) / 100,
        updatedNeighbors,
        frontier: Array.from(
          new Set(pq.heap.map((item) => item.node).filter((n) => !finalized.has(n)))
        ),
      });
    }
  }

  const executionTimeMs = nowMs() - startTime;
  const reached = finalized.has(targetId) && Number.isFinite(dist.get(targetId));

  if (!reached) {
    return {
      algorithm: 'dijkstra',
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

  return {
    algorithm: 'dijkstra',
    objective,
    found: true,
    path: reconstructed.path,
    legs: reconstructed.legs,
    stops: Math.max(0, reconstructed.path.length - 2),
    totalCost: Math.round(dist.get(targetId) * 100) / 100,
    totalDistanceKm: reconstructed.totalDistanceKm,
    totalFlightTimeMin: reconstructed.totalFlightTimeMin,
    totalDelayMin: reconstructed.totalDelayMin,
    visitedOrder,
    visitedCount: visitedOrder.length,
    relaxations,
    executionTimeMs,
    steps,
  };
}
