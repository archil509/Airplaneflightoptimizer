import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  BENCHMARK_PRESETS,
  createDefaultGraph,
} from '../src/data/airports.js';
import { OBJECTIVE_MODES } from '../src/engine/Graph.js';
import { runDijkstra } from '../src/engine/dijkstra.js';
import { runAStar } from '../src/engine/astar.js';
import { compareAlgorithms, runBenchmarkSuite } from '../src/engine/benchmark.js';
import { haversineDetailed } from '../src/engine/haversine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const graphs = {
    visualizer: createDefaultGraph('visualizer'),
    global: createDefaultGraph('global'),
    academic: createDefaultGraph('academic'),
  };

  const resolveGraph = (dataset = 'visualizer') => {
    if (dataset === 'academic') return graphs.academic;
    if (dataset === 'global') return graphs.global;
    return graphs.visualizer;
  };

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      engine: 'javascript-graph-engine',
      datasets: {
        visualizer: graphs.visualizer.getStats(),
        global: graphs.global.getStats(),
        academic: graphs.academic.getStats(),
      },
    });
  });

  app.get('/api/network', (req, res) => {
    const dataset = ['academic', 'global', 'visualizer'].includes(req.query.dataset)
      ? req.query.dataset
      : 'visualizer';
    const graph = resolveGraph(dataset);
    res.json({
      dataset,
      stats: graph.getStats(),
      airports: graph.getAllAirports(),
      routes: graph.getAllRoutes(true),
      presets: dataset === 'academic'
        ? [{ label: 'Slide 16: A → D', source: 'A', target: 'D' }]
        : BENCHMARK_PRESETS,
    });
  });

  app.post('/api/optimize', (req, res) => {
    const {
      dataset = 'global',
      source,
      target,
      algorithm = 'astar',
      objective = OBJECTIVE_MODES.DISTANCE,
    } = req.body || {};

    if (!source || !target) {
      return res.status(400).json({ error: 'Both source and target airports are required.' });
    }

    const graph = resolveGraph(dataset);
    const result =
      algorithm === 'dijkstra'
        ? runDijkstra(graph, source, target, { objective })
        : runAStar(graph, source, target, { objective });

    if (!result.found) {
      return res.status(404).json(result);
    }
    return res.json(result);
  });

  app.post('/api/compare', (req, res) => {
    const {
      dataset = 'global',
      source,
      target,
      objective = OBJECTIVE_MODES.DISTANCE,
    } = req.body || {};

    if (!source || !target) {
      return res.status(400).json({ error: 'Both source and target airports are required.' });
    }

    const graph = resolveGraph(dataset);
    const result = compareAlgorithms(graph, source, target, { objective });
    return res.json(result);
  });

  app.post('/api/benchmark', (req, res) => {
    const {
      dataset = 'global',
      iterations = 25,
      objective = OBJECTIVE_MODES.DISTANCE,
      routes,
    } = req.body || {};

    const graph = resolveGraph(dataset);
    const safeIterations = Math.min(200, Math.max(1, Number(iterations) || 25));
    const targetRoutes =
      Array.isArray(routes) && routes.length > 0
        ? routes
        : dataset === 'academic'
        ? [{ label: 'Slide 16: A → D', source: 'A', target: 'D' }]
        : BENCHMARK_PRESETS;

    const report = runBenchmarkSuite(graph, targetRoutes, safeIterations, objective);
    return res.json(report);
  });

  app.get('/api/haversine', (req, res) => {
    const { dataset = 'global', from, to } = req.query;
    const graph = resolveGraph(dataset);
    const a = graph.getAirport(from);
    const b = graph.getAirport(to);
    if (!a || !b) {
      return res.status(404).json({ error: 'Invalid airport code(s) for Haversine lookup.' });
    }
    const details = haversineDetailed(a.lat, a.lon, b.lat, b.lon);
    return res.json({ from: a, to: b, ...details });
  });

  app.post('/api/airports', (req, res) => {
    try {
      const { dataset = 'global', airport } = req.body || {};
      const graph = resolveGraph(dataset);
      const created = graph.addAirport(airport);
      return res.status(201).json({ airport: created, stats: graph.getStats() });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  });

  app.patch('/api/airports/:id', (req, res) => {
    const { dataset = 'global', enabled } = req.body || {};
    const graph = resolveGraph(dataset);
    const id = String(req.params.id).toUpperCase();
    const airport = graph.getAirport(id);
    if (!airport) {
      return res.status(404).json({ error: `Airport ${id} not found.` });
    }
    graph.setAirportEnabled(id, enabled);
    return res.json({ airport: graph.getAirport(id), stats: graph.getStats() });
  });

  app.post('/api/routes', (req, res) => {
    try {
      const { dataset = 'global', route, bidirectional = true } = req.body || {};
      const graph = resolveGraph(dataset);
      graph.addRoute(route, bidirectional);
      return res.status(201).json({ stats: graph.getStats() });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  });

  app.patch('/api/routes', (req, res) => {
    const { dataset = 'global', from, to, patch, bidirectional = true } = req.body || {};
    const graph = resolveGraph(dataset);
    graph.updateRoute(from, to, patch || {}, bidirectional);
    return res.json({ stats: graph.getStats(), routes: graph.getAllRoutes(true) });
  });

  app.post('/api/reset', (req, res) => {
    const dataset = req.body?.dataset === 'academic' ? 'academic' : 'global';
    graphs[dataset] = createDefaultGraph(dataset);
    const graph = graphs[dataset];
    return res.json({
      dataset,
      stats: graph.getStats(),
      airports: graph.getAllAirports(),
      routes: graph.getAllRoutes(true),
    });
  });

  if (fs.existsSync(DIST_DIR)) {
    app.use(express.static(DIST_DIR));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(DIST_DIR, 'index.html'));
    });
  }

  return app;
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);

if (isDirectRun) {
  const port = Number(process.env.PORT) || 3001;
  const app = createApp();
  app.listen(port, () => {
    console.log(`Flight Route Optimizer API listening on http://localhost:${port}`);
  });
}
