import { createDefaultGraph, BENCHMARK_PRESETS } from '../data/airports.js';
import { runBenchmarkSuite } from './benchmark.js';

const graph = createDefaultGraph('global');
const report = runBenchmarkSuite(graph, BENCHMARK_PRESETS, 50, 'distance');

console.log('=== Flight Route Optimizer — Reproducible JS Graph Engine Benchmark ===');
console.log(
  `Network: ${report.graphStats.airportCount} airports, ${report.graphStats.routeCount} undirected corridors (${report.graphStats.directedEdgeCount} directed edges)`
);
console.log(`Iterations per route: ${report.iterations}\n`);

console.table(
  report.results.map((r) => ({
    Route: r.label,
    'Distance (km)': r.totalDistanceKm,
    Stops: r.stops,
    'Dijkstra Visited': r.dijkstraVisited,
    'A* Visited': r.astarVisited,
    'Reduction (%)': `${r.nodeReductionPct}%`,
    'Dijkstra Avg (ms)': r.dijkstraAvgMs,
    'A* Avg (ms)': r.astarAvgMs,
    'Optimal Match': r.sameOptimalCost ? 'YES' : 'NO',
  }))
);
