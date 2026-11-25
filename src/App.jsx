import React, { useState, useEffect, useMemo } from 'react';
import { Navigation, BookOpen, Gauge, X } from 'lucide-react';
import { createDefaultGraph } from './data/airports.js';
import { OBJECTIVE_MODES } from './engine/Graph.js';
import { compareAlgorithms, runBenchmarkSuite } from './engine/benchmark.js';
import { Sidebar } from './components/Sidebar.jsx';
import { VisualizerCanvas } from './components/VisualizerCanvas.jsx';
import { MetricsComparison } from './components/MetricsComparison.jsx';
import { AlgorithmExplainer } from './components/AlgorithmExplainer.jsx';
import { BenchmarkRunner } from './components/BenchmarkRunner.jsx';

export default function App() {
  const [graphVersion, setGraphVersion] = useState(0);
  const [graph, setGraph] = useState(() => createDefaultGraph('visualizer'));

  const [algorithm, setAlgorithm] = useState('astar');
  const [objective, setObjective] = useState(OBJECTIVE_MODES.DISTANCE);
  const [sourceId, setSourceId] = useState('SEA');
  const [targetId, setTargetId] = useState('MIA');

  const [mode, setMode] = useState('select'); // 'select' | 'editAirports' | 'drawRoutes'
  const [routeDraftFrom, setRouteDraftFrom] = useState('');
  const [customCounter, setCustomCounter] = useState(1);

  const [playbackStep, setPlaybackStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);

  const [activeModal, setActiveModal] = useState(null); // null | 'compare' | 'benchmark'
  const [benchmarkReport, setBenchmarkReport] = useState(null);
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);

  const airports = useMemo(
    () => graph.getAllAirports(),
    [graph, graphVersion]
  );

  const routes = useMemo(
    () => graph.getAllRoutes(true),
    [graph, graphVersion]
  );

  const airportsById = useMemo(() => {
    const map = new Map();
    for (const a of airports) {
      map.set(a.id, a);
    }
    return map;
  }, [airports]);

  const comparison = useMemo(() => {
    if (!sourceId || !targetId) return null;
    return compareAlgorithms(graph, sourceId, targetId, {
      objective,
      recordSteps: true,
    });
  }, [graph, graphVersion, sourceId, targetId, objective]);

  const maxSteps = useMemo(() => {
    if (!comparison) return 0;
    return algorithm === 'dijkstra'
      ? comparison.dijkstra.visitedCount
      : comparison.astar.visitedCount;
  }, [comparison, algorithm]);

  useEffect(() => {
    if (!isPlaying || maxSteps <= 0) return;
    const timer = setInterval(() => {
      setPlaybackStep((prev) => {
        const next = prev < 0 ? 1 : prev + 1;
        if (next >= maxSteps) {
          setIsPlaying(false);
          return maxSteps;
        }
        return next;
      });
    }, 240);
    return () => clearInterval(timer);
  }, [isPlaying, maxSteps]);

  const handleAirportClick = (id) => {
    if (mode === 'editAirports') {
      graph.removeAirport(id);
      if (sourceId === id) setSourceId('');
      if (targetId === id) setTargetId('');
      setGraphVersion((v) => v + 1);
      return;
    }

    if (mode === 'drawRoutes') {
      if (!routeDraftFrom) {
        setRouteDraftFrom(id);
      } else if (routeDraftFrom === id) {
        setRouteDraftFrom('');
      } else {
        graph.addRoute({ from: routeDraftFrom, to: id, frequencyPerDay: 1 }, true);
        setRouteDraftFrom('');
        setGraphVersion((v) => v + 1);
      }
      return;
    }

    setIsPlaying(false);
    setPlaybackStep(-1);
    if (!sourceId || (sourceId && targetId)) {
      setSourceId(id);
      setTargetId('');
    } else if (id !== sourceId) {
      setTargetId(id);
    }
  };

  const handleCanvasClick = ({ x, y, lat, lon }) => {
    if (mode !== 'editAirports') return;
    const code = `A${customCounter}`;
    setCustomCounter((c) => c + 1);
    graph.addAirport({
      id: code,
      iata: code,
      name: `Custom Airport ${code}`,
      city: `Node ${code}`,
      x,
      y,
      lat,
      lon,
    });
    setGraphVersion((v) => v + 1);
  };

  const handleToggleAirport = (id, enabled) => {
    graph.setAirportEnabled(id, enabled);
    setGraphVersion((v) => v + 1);
  };

  const handleUpdateRoute = (from, to, patch) => {
    graph.updateRoute(from, to, patch, true);
    setGraphVersion((v) => v + 1);
  };

  const handleResetGraph = () => {
    setGraph(createDefaultGraph('visualizer'));
    setSourceId('SEA');
    setTargetId('MIA');
    setMode('select');
    setRouteDraftFrom('');
    setIsPlaying(false);
    setPlaybackStep(-1);
    setGraphVersion((v) => v + 1);
  };

  const handleRunBenchmark = (iterations) => {
    setBenchmarkLoading(true);
    setTimeout(() => {
      const targetRoutes = [
        { label: 'SEA → MIA', source: 'SEA', target: 'MIA' },
        { label: 'HNL → BOS', source: 'HNL', target: 'BOS' },
        { label: 'SAN → YYZ', source: 'SAN', target: 'YYZ' },
        { label: 'SFO → MCO', source: 'SFO', target: 'MCO' },
      ];
      const report = runBenchmarkSuite(graph, targetRoutes, iterations, objective);
      setBenchmarkReport(report);
      setBenchmarkLoading(false);
    }, 10);
  };

  return (
    <div className="visualizer-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <div className="brand-mark" aria-hidden="true">
            <Navigation size={17} />
          </div>
          <div>
            <div className="brand-name">airplaneflightoptimizer</div>
            <div className="brand-sub">Shortest-Path Aviation Network &amp; Haversine Explorer</div>
          </div>
        </div>

        <div className="topbar-actions">
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setActiveModal('compare')}
          >
            <BookOpen size={13} />
            Compare &amp; Haversine
          </button>

          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => setActiveModal('benchmark')}
          >
            <Gauge size={13} />
            Benchmarks
          </button>
        </div>
      </header>

      <div className="workspace-body">
        <main className="canvas-stage">
          <VisualizerCanvas
            airports={airports}
            routes={routes}
            sourceId={sourceId}
            targetId={targetId}
            algorithm={algorithm}
            comparison={comparison}
            playbackStep={playbackStep}
            mode={mode}
            routeDraftFrom={routeDraftFrom}
            onAirportClick={handleAirportClick}
            onCanvasClick={handleCanvasClick}
            onToggleAirport={handleToggleAirport}
            onUpdateRoute={handleUpdateRoute}
          />
        </main>

        <Sidebar
          airports={airports}
          algorithm={algorithm}
          onAlgorithmChange={(algo) => {
            setAlgorithm(algo);
            setIsPlaying(false);
            setPlaybackStep(-1);
          }}
          objective={objective}
          onObjectiveChange={(obj) => {
            setObjective(obj);
            setIsPlaying(false);
            setPlaybackStep(-1);
          }}
          sourceId={sourceId}
          targetId={targetId}
          onSourceChange={(id) => {
            setSourceId(id);
            setIsPlaying(false);
            setPlaybackStep(-1);
          }}
          onTargetChange={(id) => {
            setTargetId(id);
            setIsPlaying(false);
            setPlaybackStep(-1);
          }}
          onSwapEndpoints={() => {
            setSourceId(targetId);
            setTargetId(sourceId);
            setIsPlaying(false);
            setPlaybackStep(-1);
          }}
          onClearSelection={() => {
            setSourceId('');
            setTargetId('');
            setIsPlaying(false);
            setPlaybackStep(-1);
          }}
          comparison={comparison}
          mode={mode}
          onModeChange={(nextMode) => {
            setMode(nextMode);
            setRouteDraftFrom('');
          }}
          onResetGraph={handleResetGraph}
          isPlaying={isPlaying}
          onTogglePlay={() => {
            if (!isPlaying && (playbackStep < 0 || playbackStep >= maxSteps)) {
              setPlaybackStep(0);
            }
            setIsPlaying((p) => !p);
          }}
          onStepForward={() => {
            setIsPlaying(false);
            setPlaybackStep((prev) => (prev < 0 ? 1 : Math.min(maxSteps, prev + 1)));
          }}
          onResetPlayback={() => {
            setIsPlaying(false);
            setPlaybackStep(-1);
          }}
          playbackStep={playbackStep < 0 ? maxSteps : playbackStep}
          maxSteps={maxSteps}
        />
      </div>

      {activeModal && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: '0.95rem' }}>
                {activeModal === 'compare'
                  ? 'Algorithm Comparison & Haversine Analysis'
                  : 'Reproducible Benchmark Suite'}
              </strong>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setActiveModal(null)}
              >
                <X size={14} /> Close
              </button>
            </div>

            {activeModal === 'compare' ? (
              comparison ? (
                <>
                  <MetricsComparison
                    comparison={comparison}
                    objective={objective}
                    airportsById={airportsById}
                  />
                  <AlgorithmExplainer
                    airportsById={airportsById}
                    sourceId={sourceId}
                    targetId={targetId}
                    comparison={comparison}
                    playbackStep={playbackStep}
                  />
                </>
              ) : (
                <div className="alert-banner info">
                  Select an origin and destination airport first to inspect Dijkstra vs. A* metrics and Haversine calculations.
                </div>
              )
            ) : (
              <BenchmarkRunner
                onRunBenchmark={handleRunBenchmark}
                benchmarkReport={benchmarkReport}
                loading={benchmarkLoading}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
