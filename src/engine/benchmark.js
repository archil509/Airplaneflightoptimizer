import { runDijkstra } from './dijkstra.js';
import { runAStar } from './astar.js';
import { OBJECTIVE_MODES } from './Graph.js';

/**
 * Runs both Dijkstra and A* on the exact same graph, endpoints, and objective
 * so node counts, route cost, and runtimes can be compared fairly.
 */
export function compareAlgorithms(graph, sourceId, targetId, options = {}) {
  const objective = options.objective || OBJECTIVE_MODES.DISTANCE;
  const recordSteps = options.recordSteps !== false;

  const dijkstra = runDijkstra(graph, sourceId, targetId, { objective, recordSteps });
  const astar = runAStar(graph, sourceId, targetId, { objective, recordSteps });

  const nodeReductionPct =
    dijkstra.visitedCount > 0
      ? Math.round(
          ((dijkstra.visitedCount - astar.visitedCount) / dijkstra.visitedCount) * 1000
        ) / 10
      : 0;

  const sameOptimalCost =
    dijkstra.found &&
    astar.found &&
    Math.abs(dijkstra.totalCost - astar.totalCost) < 1e-4;

  return {
    source: String(sourceId).toUpperCase(),
    target: String(targetId).toUpperCase(),
    objective,
    dijkstra,
    astar,
    comparison: {
      nodeReductionPct,
      nodesSaved: dijkstra.visitedCount - astar.visitedCount,
      sameOptimalCost,
      speedupRatio:
        astar.executionTimeMs > 0
          ? Math.round((dijkstra.executionTimeMs / astar.executionTimeMs) * 100) / 100
          : 1,
    },
  };
}

/**
 * Runs a repeatable multi-route benchmark suite over N iterations (with warm-up)
 * to measure average execution time and explored-node reduction.
 */
export function runBenchmarkSuite(graph, routes, iterations = 25, objective = OBJECTIVE_MODES.DISTANCE) {
  const results = [];

  for (const item of routes) {
    const { label, source, target } = item;

    // Warm up JIT
    runDijkstra(graph, source, target, { objective, recordSteps: false });
    runAStar(graph, source, target, { objective, recordSteps: false });

    let dijkstraTotalMs = 0;
    let astarTotalMs = 0;
    let lastD = null;
    let lastA = null;

    for (let i = 0; i < iterations; i++) {
      lastD = runDijkstra(graph, source, target, { objective, recordSteps: false });
      dijkstraTotalMs += lastD.executionTimeMs;

      lastA = runAStar(graph, source, target, { objective, recordSteps: false });
      astarTotalMs += lastA.executionTimeMs;
    }

    const dijkstraAvgMs = Math.round((dijkstraTotalMs / iterations) * 1000) / 1000;
    const astarAvgMs = Math.round((astarTotalMs / iterations) * 1000) / 1000;
    const nodeReductionPct =
      lastD.visitedCount > 0
        ? Math.round(((lastD.visitedCount - lastA.visitedCount) / lastD.visitedCount) * 1000) / 10
        : 0;

    results.push({
      label: label || `${source} → ${target}`,
      source,
      target,
      found: lastD.found && lastA.found,
      totalDistanceKm: lastA.totalDistanceKm,
      stops: lastA.stops,
      dijkstraVisited: lastD.visitedCount,
      astarVisited: lastA.visitedCount,
      nodeReductionPct,
      dijkstraAvgMs,
      astarAvgMs,
      sameOptimalCost:
        lastD.found && lastA.found && Math.abs(lastD.totalCost - lastA.totalCost) < 1e-4,
    });
  }

  return {
    iterations,
    objective,
    graphStats: graph.getStats(),
    timestamp: new Date().toISOString(),
    results,
  };
}
