import React from 'react';
import { BarChart3, AlertTriangle, CheckCircle2, Clock, Route } from 'lucide-react';
import { OBJECTIVE_MODES } from '../engine/Graph.js';

function formatDuration(minutes) {
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hrs}h ${mins}m`;
}

export function MetricsComparison({ comparison, objective, airportsById }) {
  if (!comparison) return null;

  const { dijkstra, astar, comparison: summary } = comparison;

  if (!dijkstra.found && !astar.found) {
    return (
      <div className="panel">
        <div className="alert-banner error">
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>No Reachable Route Found:</strong>{' '}
            {astar.error || dijkstra.error || 'Origin and destination are disconnected in the active graph.'}
          </div>
        </div>
      </div>
    );
  }

  const maxVisited = Math.max(1, dijkstra.visitedCount, astar.visitedCount);
  const dijkstraPct = Math.round((dijkstra.visitedCount / maxVisited) * 100);
  const astarPct = Math.round((astar.visitedCount / maxVisited) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">
            <BarChart3 size={16} color="#38bdf8" />
            Dijkstra vs. A* Search Comparison ({comparison.source} &rarr; {comparison.target})
          </h2>
          {summary.sameOptimalCost && (
            <span className="pill-badge" style={{ color: '#047857', borderColor: 'rgba(5, 150, 105, 0.35)' }}>
              <CheckCircle2 size={13} />
              Optimal Cost Verified ({astar.totalCost.toLocaleString()})
            </span>
          )}
        </div>

        <div className="metrics-grid">
          {/* Dijkstra Card */}
          <div className="algo-card dijkstra">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <strong style={{ color: '#6d28d9', fontSize: '0.9rem' }}>Dijkstra&apos;s Algorithm</strong>
              <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                Priority: g(n)
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Visited Nodes</span>
              <span className="stat-value">{dijkstra.visitedCount}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Edge Relaxations</span>
              <span className="stat-value">{dijkstra.relaxations}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Total Distance</span>
              <span className="stat-value">{dijkstra.totalDistanceKm.toLocaleString()} km</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Modeled Cost</span>
              <span className="stat-value">{dijkstra.totalCost.toLocaleString()}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Execution Time</span>
              <span className="stat-value">{dijkstra.executionTimeMs.toFixed(3)} ms</span>
            </div>
            <div style={{ marginTop: '0.55rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                <span>Exploration Breadth</span>
                <span className="mono">{dijkstra.visitedCount} nodes</span>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${dijkstraPct}%`, background: 'var(--accent-violet)' }}
                />
              </div>
            </div>
          </div>

          {/* A* Card */}
          <div className="algo-card astar">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <strong style={{ color: '#0369a1', fontSize: '0.9rem' }}>A* Heuristic Search</strong>
              <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                f(n) = g(n) + h(n)
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Visited Nodes</span>
              <span className="stat-value" style={{ color: '#047857' }}>
                {astar.visitedCount}{' '}
                {summary.nodeReductionPct > 0 && (
                  <span style={{ fontSize: '0.72rem' }}>(-{summary.nodeReductionPct}%)</span>
                )}
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Edge Relaxations</span>
              <span className="stat-value">{astar.relaxations}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Total Distance</span>
              <span className="stat-value">{astar.totalDistanceKm.toLocaleString()} km</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Modeled Cost</span>
              <span className="stat-value">{astar.totalCost.toLocaleString()}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Execution Time</span>
              <span className="stat-value">{astar.executionTimeMs.toFixed(3)} ms</span>
            </div>
            <div style={{ marginTop: '0.55rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                <span>Exploration Breadth</span>
                <span className="mono">{astar.visitedCount} nodes</span>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${astarPct}%`, background: 'var(--accent-sky)' }}
                />
              </div>
            </div>
          </div>

          {/* Route Summary Card */}
          <div className="algo-card winner">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <strong style={{ color: '#047857', fontSize: '0.9rem' }}>Recommended Route</strong>
              <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                {astar.stops} {astar.stops === 1 ? 'stop' : 'stops'}
              </span>
            </div>
            <div
              className="mono"
              style={{
                fontSize: '0.84rem',
                fontWeight: 600,
                padding: '0.45rem 0.55rem',
                borderRadius: 7,
                background: '#ffffff',
                border: '1px solid var(--border-soft)',
                marginBottom: '0.55rem',
                wordBreak: 'break-word',
              }}
            >
              {astar.path.join(' → ')}
            </div>
            <div className="stat-row">
              <span className="stat-label">Est. Flight + Delay</span>
              <span className="stat-value">
                <Clock size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                {formatDuration(astar.totalFlightTimeMin)}
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Active Delays</span>
              <span className="stat-value" style={{ color: astar.totalDelayMin > 0 ? '#b45309' : 'inherit' }}>
                {astar.totalDelayMin} min
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Nodes Saved by A*</span>
              <span className="stat-value" style={{ color: '#047857' }}>
                {summary.nodesSaved >= 0 ? `+${summary.nodesSaved}` : summary.nodesSaved} nodes
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Leg-by-leg Breakdown */}
      {astar.legs.length > 0 && (
        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title">
              <Route size={15} color="#4ade80" />
              Leg-by-Leg Route Breakdown
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Objective: <strong className="mono">{objective}</strong>
            </span>
          </div>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Leg</th>
                  <th>Segment</th>
                  <th>Origin &rarr; Destination</th>
                  <th>Distance</th>
                  <th>Flight Time</th>
                  <th>Delay</th>
                  <th>Freq/day</th>
                  <th>Edge Weight</th>
                </tr>
              </thead>
              <tbody>
                {astar.legs.map((leg, idx) => {
                  const fromAirport = airportsById.get(leg.from);
                  const toAirport = airportsById.get(leg.to);
                  return (
                    <tr key={`${leg.from}-${leg.to}-${idx}`}>
                      <td className="mono">#{idx + 1}</td>
                      <td className="mono" style={{ fontWeight: 600, color: '#0369a1' }}>
                        {leg.from} &rarr; {leg.to}
                      </td>
                      <td>
                        {fromAirport?.city || leg.from} &rarr; {toAirport?.city || leg.to}
                      </td>
                      <td className="mono">{leg.distanceKm.toLocaleString()} km</td>
                      <td className="mono">{formatDuration(leg.flightTimeMin)}</td>
                      <td className="mono" style={{ color: leg.delayMin > 0 ? '#b45309' : 'var(--text-secondary)' }}>
                        {leg.delayMin > 0 ? `+${leg.delayMin} min` : '0 min'}
                      </td>
                      <td className="mono">{leg.frequencyPerDay}/day</td>
                      <td className="mono" style={{ fontWeight: 600 }}>
                        {leg.weight.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Academic Caveat / Interpretability Note */}
      <div className={`alert-banner ${astar.heuristicAdmissible ? 'info' : ''}`}>
        <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          {!astar.heuristicAdmissible ? (
            <>
              <strong>Heuristic Admissibility Warning:</strong> At least one edge weight is currently lower than its straight-line Haversine distance, so A* is not guaranteed optimal under those custom weights.
            </>
          ) : (
            <>
              <strong>Model Interpretation (Slide 05 &amp; 17):</strong> This route minimizes the selected graph cost (
              <span className="mono">{objective}</span>
              {objective === OBJECTIVE_MODES.STOPS
                ? '; hop-count mode uses an admissible 1-stop lower bound'
                : '; Haversine great-circle distance is used as the A* heuristic'}
              ). Shortest geographic path is not automatically the cheapest, fastest, or currently bookable commercial itinerary.
            </>
          )}
        </div>
      </div>
    </div>
  );
}
