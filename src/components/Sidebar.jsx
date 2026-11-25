import React from 'react';
import {
  ArrowLeftRight,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  PlusCircle,
  GitBranch,
  RefreshCw,
} from 'lucide-react';
import { OBJECTIVE_MODES } from '../engine/Graph.js';

function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return '--';
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hrs}h ${mins}m`;
}

export function Sidebar({
  airports,
  algorithm,
  onAlgorithmChange,
  objective,
  onObjectiveChange,
  sourceId,
  targetId,
  onSourceChange,
  onTargetChange,
  onSwapEndpoints,
  onClearSelection,
  comparison,
  mode,
  onModeChange,
  onResetGraph,
  isPlaying,
  onTogglePlay,
  onStepForward,
  onResetPlayback,
  playbackStep,
  maxSteps,
}) {
  const activeResult =
    comparison && sourceId && targetId
      ? algorithm === 'dijkstra'
        ? comparison.dijkstra
        : comparison.astar
      : null;

  const sortedAirports = [...airports].sort((a, b) => a.iata.localeCompare(b.iata));

  return (
    <aside className="dispatch-panel">
      {/* Algorithm Switcher */}
      <div className="side-card">
        <div className="side-card-title">Search Strategy</div>
        <div className="segmented-group" role="radiogroup" aria-label="Search algorithm">
          <button
            type="button"
            className={`segmented-btn ${algorithm === 'astar' ? 'active' : ''}`}
            onClick={() => onAlgorithmChange('astar')}
          >
            A* Heuristic
          </button>
          <button
            type="button"
            className={`segmented-btn ${algorithm === 'dijkstra' ? 'active' : ''}`}
            onClick={() => onAlgorithmChange('dijkstra')}
          >
            Dijkstra
          </button>
        </div>

        <div style={{ marginTop: '0.6rem' }}>
          <label className="field-label" htmlFor="cost-objective">
            Cost Model
          </label>
          <select
            id="cost-objective"
            className="select-input"
            value={objective}
            onChange={(e) => onObjectiveChange(e.target.value)}
          >
            <option value={OBJECTIVE_MODES.DISTANCE}>Geographic Distance (km)</option>
            <option value={OBJECTIVE_MODES.PENALTY}>Distance + Delay Penalty</option>
            <option value={OBJECTIVE_MODES.STOPS}>Minimum Stops (Hops)</option>
          </select>
        </div>
      </div>

      {/* Flight Route Planner & Live Metrics */}
      <div className="side-card">
        <div className="side-card-header">
          <span className="side-card-title" style={{ marginBottom: 0 }}>
            Flight Plan
          </span>
          {(sourceId || targetId) && (
            <button
              type="button"
              className="btn btn-sm"
              style={{ padding: '0.18rem 0.45rem', fontSize: '0.7rem' }}
              onClick={onClearSelection}
            >
              Clear
            </button>
          )}
        </div>

        <div className="route-picker-grid">
          <div>
            <label className="field-label" htmlFor="origin-select">
              Origin
            </label>
            <select
              id="origin-select"
              className="select-input mono"
              value={sourceId || ''}
              onChange={(e) => onSourceChange(e.target.value)}
            >
              <option value="">Select</option>
              {sortedAirports.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.iata} — {a.city || a.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="btn btn-sm"
            style={{ height: 32, width: 32, padding: 0 }}
            onClick={onSwapEndpoints}
            title="Swap origin and destination"
            aria-label="Swap origin and destination"
          >
            <ArrowLeftRight size={13} />
          </button>

          <div>
            <label className="field-label" htmlFor="dest-select">
              Destination
            </label>
            <select
              id="dest-select"
              className="select-input mono"
              value={targetId || ''}
              onChange={(e) => onTargetChange(e.target.value)}
            >
              <option value="">Select</option>
              {sortedAirports.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.iata} — {a.city || a.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="kpi-grid">
          <div className="kpi-tile">
            <div className="kpi-label">Distance</div>
            <div className="kpi-value">
              {activeResult?.found ? `${activeResult.totalDistanceKm.toLocaleString()} km` : '--'}
            </div>
          </div>
          <div className="kpi-tile">
            <div className="kpi-label">Est. Time</div>
            <div className="kpi-value">
              {activeResult?.found ? formatDuration(activeResult.totalFlightTimeMin) : '--'}
            </div>
          </div>
          <div className="kpi-tile">
            <div className="kpi-label">Stops</div>
            <div className="kpi-value">
              {activeResult?.found ? `${activeResult.stops}` : '--'}
            </div>
          </div>
          <div className="kpi-tile">
            <div className="kpi-label">Explored</div>
            <div className="kpi-value" style={{ color: '#0284c7' }}>
              {activeResult ? `${activeResult.visitedCount} nodes` : '--'}
            </div>
          </div>
        </div>

        {activeResult?.found && (
          <div className="path-ribbon mono">
            {activeResult.path.join(' → ')}
          </div>
        )}

        {activeResult && !activeResult.found && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.73rem', color: '#e11d48' }}>
            {activeResult.error}
          </div>
        )}

        {activeResult?.found && maxSteps > 0 && (
          <div className="mini-playback">
            <button
              type="button"
              className="btn btn-sm"
              onClick={onTogglePlay}
              title={isPlaying ? 'Pause' : 'Replay exploration'}
            >
              {isPlaying ? <Pause size={12} /> : <Play size={12} />}
              {isPlaying ? 'Pause' : 'Replay'}
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={onStepForward}
              disabled={playbackStep >= maxSteps}
              title="Next step"
            >
              <SkipForward size={12} />
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={onResetPlayback}
              title="Show final state"
            >
              <RotateCcw size={12} />
            </button>
            <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
              {Math.min(playbackStep, maxSteps)}/{maxSteps}
            </span>
          </div>
        )}
      </div>

      {/* Topology Controls */}
      <div className="side-card">
        <div className="side-card-title">Network Editor</div>
        <div className="mgmt-stack">
          <button
            type="button"
            className={`mgmt-btn ${mode === 'editAirports' ? 'active' : ''}`}
            onClick={() => onModeChange(mode === 'editAirports' ? 'select' : 'editAirports')}
          >
            <PlusCircle size={14} />
            Add / Remove Waypoints
          </button>
          <button
            type="button"
            className={`mgmt-btn ${mode === 'drawRoutes' ? 'active' : ''}`}
            onClick={() => onModeChange(mode === 'drawRoutes' ? 'select' : 'drawRoutes')}
          >
            <GitBranch size={14} />
            Connect Corridors
          </button>
          <button type="button" className="mgmt-btn" onClick={onResetGraph}>
            <RefreshCw size={14} />
            Restore Default Graph
          </button>
        </div>
      </div>
    </aside>
  );
}
