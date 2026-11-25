import test from 'node:test';
import assert from 'node:assert/strict';

import { MinHeap } from '../src/engine/MinHeap.js';
import {
  EARTH_RADIUS_KM,
  haversineDetailed,
  haversineDistance,
  isValidCoordinate,
} from '../src/engine/haversine.js';
import { AirportGraph, OBJECTIVE_MODES } from '../src/engine/Graph.js';
import { runDijkstra } from '../src/engine/dijkstra.js';
import { runAStar } from '../src/engine/astar.js';
import { compareAlgorithms, runBenchmarkSuite } from '../src/engine/benchmark.js';
import { createDefaultGraph, BENCHMARK_PRESETS } from '../src/data/airports.js';

test('MinHeap pops items in ascending priority order', () => {
  const heap = new MinHeap();
  heap.push({ node: 'C', priority: 30 });
  heap.push({ node: 'A', priority: 10 });
  heap.push({ node: 'B', priority: 20 });
  heap.push({ node: 'D', priority: 5 });

  assert.equal(heap.size, 4);
  assert.equal(heap.pop().node, 'D');
  assert.equal(heap.pop().node, 'A');
  assert.equal(heap.pop().node, 'B');
  assert.equal(heap.pop().node, 'C');
  assert.equal(heap.isEmpty(), true);
});

test('Haversine computes JFK -> LAX great-circle distance and rejects invalid coords', () => {
  assert.equal(EARTH_RADIUS_KM, 6371);
  assert.equal(isValidCoordinate(40.6413, -73.7781), true);
  assert.equal(isValidCoordinate(95, 0), false);
  assert.equal(isValidCoordinate(NaN, 10), false);

  const d = haversineDistance(40.6413, -73.7781, 33.9416, -118.4085);
  assert.ok(d > 3950 && d < 4000, `Expected ~3974 km, got ${d}`);

  const details = haversineDetailed(0, 0, 0, 0);
  assert.equal(details.distanceKm, 0);

  assert.throws(() => haversineDistance(91, 0, 10, 10), /Invalid coordinates/);
  assert.throws(() => haversineDistance(null, 0, 10, 10), /Invalid coordinates/);
});

test('Slide 16 academic sample: A -> C -> B -> D (500 km) beats A -> B -> D (550 km)', () => {
  const graph = createDefaultGraph('academic');
  const comparison = compareAlgorithms(graph, 'A', 'D', {
    objective: OBJECTIVE_MODES.DISTANCE,
  });

  assert.equal(comparison.dijkstra.found, true);
  assert.equal(comparison.astar.found, true);
  assert.equal(comparison.dijkstra.totalCost, 500);
  assert.equal(comparison.astar.totalCost, 500);
  assert.deepEqual(comparison.dijkstra.path, ['A', 'C', 'B', 'D']);
  assert.deepEqual(comparison.astar.path, ['A', 'C', 'B', 'D']);
  assert.equal(comparison.astar.stops, 2);
});

test('Same source and destination handles zero-length route cleanly', () => {
  const graph = createDefaultGraph('global');
  const d = runDijkstra(graph, 'JFK', 'JFK');
  const a = runAStar(graph, 'JFK', 'JFK');

  assert.equal(d.found, true);
  assert.equal(a.found, true);
  assert.equal(d.totalCost, 0);
  assert.equal(a.totalCost, 0);
  assert.deepEqual(d.path, ['JFK']);
  assert.deepEqual(a.path, ['JFK']);
});

test('Disconnected destination and disabled node handling', () => {
  const graph = new AirportGraph();
  graph.addAirport({ id: 'AAA', lat: 10, lon: 10 });
  graph.addAirport({ id: 'BBB', lat: 12, lon: 12 });
  graph.addAirport({ id: 'ZZZ', lat: 20, lon: 20 });
  graph.addRoute({ from: 'AAA', to: 'BBB' });

  const disconnected = runAStar(graph, 'AAA', 'ZZZ');
  assert.equal(disconnected.found, false);
  assert.match(disconnected.error, /No reachable route/);

  graph.setAirportEnabled('BBB', false);
  const disabledRes = runDijkstra(graph, 'AAA', 'BBB');
  assert.equal(disabledRes.found, false);
  assert.match(disabledRes.error, /disabled/);
});

test('Global network: A* matches Dijkstra optimal cost while visiting fewer or equal nodes', () => {
  const graph = createDefaultGraph('global');
  const report = runBenchmarkSuite(graph, BENCHMARK_PRESETS, 5, OBJECTIVE_MODES.DISTANCE);

  for (const row of report.results) {
    assert.equal(row.found, true, `Expected route found for ${row.label}`);
    assert.equal(row.sameOptimalCost, true, `Optimal cost mismatch on ${row.label}`);
    assert.ok(
      row.astarVisited <= row.dijkstraVisited,
      `Expected A* (${row.astarVisited}) <= Dijkstra (${row.dijkstraVisited}) on ${row.label}`
    );
  }
});

test('Objective sensitivity: adding high delay penalty triggers alternate route', () => {
  const graph = createDefaultGraph('academic');
  // Normally A->C->B->D = 500 km. Inject massive delay on C->B.
  graph.updateRoute('C', 'B', { delayMin: 120 }, true);

  const distRes = runAStar(graph, 'A', 'D', { objective: OBJECTIVE_MODES.DISTANCE });
  const penaltyRes = runAStar(graph, 'A', 'D', { objective: OBJECTIVE_MODES.PENALTY });

  assert.deepEqual(distRes.path, ['A', 'C', 'B', 'D']);
  assert.deepEqual(penaltyRes.path, ['A', 'B', 'D']);
});

test('Visualizer 18-node graph: Haversine is admissible on all edges and A* matches Dijkstra', () => {
  const graph = createDefaultGraph('visualizer');
  const stats = graph.getStats();
  assert.equal(stats.airportCount, 18);
  assert.equal(stats.routeCount, 35);

  const comp = compareAlgorithms(graph, 'SEA', 'MIA', {
    objective: OBJECTIVE_MODES.DISTANCE,
  });
  assert.equal(comp.dijkstra.found, true);
  assert.equal(comp.astar.found, true);
  assert.equal(comp.astar.heuristicAdmissible, true);
  assert.equal(comp.comparison.sameOptimalCost, true);
  assert.ok(comp.astar.visitedCount <= comp.dijkstra.visitedCount);
});
