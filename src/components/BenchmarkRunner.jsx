import React, { useState } from 'react';
import { Gauge, Play } from 'lucide-react';

export function BenchmarkRunner({ onRunBenchmark, benchmarkReport, loading }) {
  const [iterations, setIterations] = useState(50);

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h3 className="panel-title">
            <Gauge size={16} color="#38bdf8" />
            Reproducible Benchmark Suite (Same Graph &amp; Objective)
          </h3>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
            Measures visited-node reduction and averaged runtime over repeated iterations on the active network.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label className="field-label" htmlFor="bench-iters" style={{ margin: 0 }}>
            Iterations
          </label>
          <input
            id="bench-iters"
            type="number"
            min={5}
            max={200}
            value={iterations}
            onChange={(e) => setIterations(Number(e.target.value) || 25)}
            className="text-input mono"
            style={{ width: 78 }}
          />
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => onRunBenchmark(iterations)}
            disabled={loading}
          >
            <Play size={13} />
            {loading ? 'Running...' : 'Run Benchmark'}
          </button>
        </div>
      </div>

      {benchmarkReport ? (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Route</th>
                <th>Optimal Distance</th>
                <th>Stops</th>
                <th>Dijkstra Visited</th>
                <th>A* Visited</th>
                <th>Node Reduction</th>
                <th>Dijkstra Avg</th>
                <th>A* Avg</th>
              </tr>
            </thead>
            <tbody>
              {benchmarkReport.results.map((row) => (
                <tr key={row.label}>
                  <td style={{ fontWeight: 600 }}>{row.label}</td>
                  <td className="mono">{row.totalDistanceKm.toLocaleString()} km</td>
                  <td className="mono">{row.stops}</td>
                  <td className="mono" style={{ color: '#6d28d9' }}>{row.dijkstraVisited}</td>
                  <td className="mono" style={{ color: '#0369a1' }}>{row.astarVisited}</td>
                  <td className="mono" style={{ color: '#047857', fontWeight: 700 }}>
                    {row.nodeReductionPct}% fewer
                  </td>
                  <td className="mono">{row.dijkstraAvgMs.toFixed(3)} ms</td>
                  <td className="mono">{row.astarAvgMs.toFixed(3)} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="alert-banner info">
          <span>
            Click <strong>Run Benchmark</strong> to execute live measurements across NYC &rarr; LA, London &rarr; Tokyo, Sydney &rarr; Paris, Delhi &rarr; SFO, São Paulo &rarr; Singapore, and Miami &rarr; Bangkok.
          </span>
        </div>
      )}
    </div>
  );
}
