# airplaneflightoptimizer — End-to-End Project

An end-to-end **Flight Route Optimization** system built with a **React + Vite** interactive map interface, a **JavaScript Graph Engine** (`MinHeap.js`, `haversine.js`, `Graph.js`, `dijkstra.js`, `astar.js`), a **Node.js / Express REST API**, and a portable **C++17 / CMake** performance layer.

## Architecture Overview

- **React Frontend (`src/App.jsx`, `src/components/`)**
  - **Interactive World Map (`WorldMap.jsx`)**: Renders global landmasses (`world-atlas` + `topojson-client`), curved great-circle flight corridors, straight-line Haversine reference arcs, animated search-exploration steps, zoom/pan, and click/right-click airport controls.
  - **Algorithm Comparison (`MetricsComparison.jsx`)**: Side-by-side comparison of **Dijkstra's Algorithm** ($g(n)$) vs. **A* Search** ($f(n) = g(n) + h(n)$) across visited nodes, node-reduction percentage, edge relaxations, execution time, and leg-by-leg route details.
  - **Haversine & Trace Inspector (`AlgorithmExplainer.jsx`)**: Live $\Delta\phi, \Delta\lambda, a, c, d$ breakdown ($R = 6,371\text{ km}$) and step-by-step A* priority-queue trace.
  - **Benchmark Suite (`BenchmarkRunner.jsx`)**: Repeatable multi-route benchmark runner under identical graph and objective rules.
  - **Network & Delay Simulator (`NetworkEditor.jsx`)**: Add custom airports/routes, disable/enable airports, and inject corridor delays to observe objective sensitivity.
- **JavaScript Graph Engine (`src/engine/`)**
  - `MinHeap.js`, `haversine.js`, `Graph.js`, `dijkstra.js`, `astar.js`, `benchmark.js`, `runBenchmarkCli.js`
- **Express REST API (`server/index.js`)**
  - `/api/health`, `/api/network`, `/api/optimize`, `/api/compare`, `/api/benchmark`, `/api/haversine`, `/api/airports`, `/api/routes`, `/api/reset`
- **C++17 Performance Layer (`cpp/`)**
  - `CMakeLists.txt`, `include/Haversine.hpp`, `include/Graph.hpp`, `src/Graph.cpp`, `src/Dijkstra.cpp`, `src/AStar.cpp`, `src/main.cpp`, `tests/test_engine.cpp`

## Datasets Included

1. **Global Airport Network (`global`)**: 92 real-world airports with WGS84 coordinates modeled on OpenFlights and 358 undirected flight corridors (716 directed edges).
2. **Academic Sample Graph (`academic`)**: The exact 4-node network (`A, B, C, D`) demonstrating why `A → C → B → D` (500 km, 2 stops) beats `A → B → D` (550 km, 1 stop).

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run automated unit & API integration tests
npm test

# 3. Run the CLI benchmark
npm run benchmark

# 4. Build the React frontend
npm run build

# 5. Start the Express server (serves both API and built frontend on http://localhost:3001)
npm start
```

For development hot-reload with Vite (`http://localhost:5173` proxied to Express on `:3001`):

```bash
npm run server
# in another terminal:
npm run dev
```

## C++17 Build (Optional — requires a working C++17 compiler & CMake)

```bash
cmake -S cpp -B cpp/build
cmake --build cpp/build
ctest --test-dir cpp/build --output-on-failure
```
