import React from 'react';
import {
  ArrowLeftRight,
  Navigation,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import { BENCHMARK_PRESETS } from '../data/airports.js';
import { OBJECTIVE_MODES } from '../engine/Graph.js';

export function ControlPanel({
  dataset,
  airports,
  sourceId,
  targetId,
  objective,
  onSourceChange,
  onTargetChange,
  onSwap,
  onObjectiveChange,
  onRunSearch,
  isPlaying,
  onTogglePlay,
  onStepForward,
  onResetPlayback,
  playbackStep,
  maxSteps,
  playbackSpeedMs,
  onSpeedChange,
}) {
  const sortedAirports = [...airports].sort((a, b) => a.iata.localeCompare(b.iata));
  const presets =
    dataset === 'academic'
      ? [{ label: 'Slide 16: A → D (500 km)', source: 'A', target: 'D' }]
      : BENCHMARK_PRESETS;

  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title">
          <Navigation size={15} color="#38bdf8" />
          Flight Search Controls
        </h2>
      </div>

      <div className="endpoint-row">
        <div>
          <label className="field-label" htmlFor="source-select">
            Origin
          </label>
          <select
            id="source-select"
            className="select-input"
            value={sourceId}
            onChange={(e) => onSourceChange(e.target.value)}
          >
            {sortedAirports.map((a) => (
              <option key={a.id} value={a.id}>
                {a.iata} — {a.city || a.name} {!a.enabled ? '(Disabled)' : ''}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="btn swap-btn"
          onClick={onSwap}
          title="Swap origin and destination"
          aria-label="Swap origin and destination"
        >
          <ArrowLeftRight size={14} />
        </button>

        <div>
          <label className="field-label" htmlFor="target-select">
            Destination
          </label>
          <select
            id="target-select"
            className="select-input"
            value={targetId}
            onChange={(e) => onTargetChange(e.target.value)}
          >
            {sortedAirports.map((a) => (
              <option key={a.id} value={a.id}>
                {a.iata} — {a.city || a.name} {!a.enabled ? '(Disabled)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginTop: '0.85rem' }}>
        <label className="field-label" htmlFor="objective-select">
          <Sliders size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          Optimization Objective (Edge Weight)
        </label>
        <select
          id="objective-select"
          className="select-input"
          value={objective}
          onChange={(e) => onObjectiveChange(e.target.value)}
        >
          <option value={OBJECTIVE_MODES.DISTANCE}>
            Shortest Geographic Distance (km)
          </option>
          <option value={OBJECTIVE_MODES.PENALTY}>
            Distance + Delay &amp; Frequency Penalty
          </option>
          <option value={OBJECTIVE_MODES.STOPS}>
            Minimum Intermediate Stops (Hop Count)
          </option>
        </select>
      </div>

      <div style={{ marginTop: '0.85rem' }}>
        <span className="field-label">Quick Route Presets</span>
        <div className="preset-grid">
          {presets.map((preset) => {
            const isActive =
              preset.source === sourceId && preset.target === targetId;
            return (
              <button
                key={preset.label}
                type="button"
                className={`preset-chip ${isActive ? 'active' : ''}`}
                onClick={() => onRunSearch(preset.source, preset.target)}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        className="btn btn-primary"
        style={{ width: '100%', marginTop: '0.9rem' }}
        onClick={() => onRunSearch(sourceId, targetId)}
      >
        Compare Dijkstra vs. A*
      </button>

      <div className="playback-bar">
        <button
          type="button"
          className="btn btn-sm"
          onClick={onTogglePlay}
          disabled={maxSteps <= 0}
          title={isPlaying ? 'Pause search replay' : 'Animate search exploration'}
        >
          {isPlaying ? <Pause size={13} /> : <Play size={13} />}
          {isPlaying ? 'Pause' : 'Animate'}
        </button>

        <button
          type="button"
          className="btn btn-sm"
          onClick={onStepForward}
          disabled={maxSteps <= 0 || playbackStep >= maxSteps}
          title="Advance one node expansion"
        >
          <SkipForward size={13} />
          Step
        </button>

        <button
          type="button"
          className="btn btn-sm"
          onClick={onResetPlayback}
          disabled={maxSteps <= 0}
          title="Show full final state"
        >
          <RotateCcw size={13} />
        </button>

        <span className="mono" style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
          Step {Math.min(playbackStep, maxSteps)}/{maxSteps}
        </span>

        <select
          className="select-input"
          style={{ width: 'auto', padding: '0.22rem 0.4rem', fontSize: '0.73rem' }}
          value={playbackSpeedMs}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
          aria-label="Animation speed"
        >
          <option value={450}>0.5x</option>
          <option value={220}>1x</option>
          <option value={90}>2.5x</option>
        </select>
      </div>
    </div>
  );
}
