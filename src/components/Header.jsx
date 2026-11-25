import React from 'react';
import { Plane, RotateCcw, Globe, GraduationCap } from 'lucide-react';

export function Header({
  dataset,
  onDatasetChange,
  stats,
  apiOnline,
  onResetNetwork,
}) {
  return (
    <header className="top-header">
      <div className="brand-group">
        <div className="brand-icon" aria-hidden="true">
          <Plane size={20} />
        </div>
        <div>
          <h1 className="brand-title">Flight Route Optimizer</h1>
          <p className="brand-subtitle">
            Dijkstra&apos;s Algorithm vs. A* Heuristic Search &bull; Haversine Graph Engine
          </p>
        </div>
      </div>

      <div className="header-controls">
        <div className="segmented-group" role="group" aria-label="Dataset selector">
          <button
            type="button"
            className={`segmented-btn ${dataset === 'global' ? 'active' : ''}`}
            onClick={() => onDatasetChange('global')}
          >
            <Globe size={14} />
            Global Network
          </button>
          <button
            type="button"
            className={`segmented-btn ${dataset === 'academic' ? 'active' : ''}`}
            onClick={() => onDatasetChange('academic')}
          >
            <GraduationCap size={14} />
            Slide 16 Sample (A–D)
          </button>
        </div>

        <span className="pill-badge" title="Active nodes and undirected flight corridors">
          Airports: <strong>{stats.activeAirports}/{stats.airportCount}</strong>
          &nbsp;&bull;&nbsp;
          Routes: <strong>{stats.activeRoutes}</strong>
        </span>

        <span
          className="pill-badge"
          title={
            apiOnline
              ? 'Express REST API connected'
              : 'Running directly on local JavaScript Graph Engine'
          }
        >
          <span className={`status-dot ${apiOnline ? '' : 'offline'}`} />
          {apiOnline ? 'API + JS Engine' : 'Local JS Engine'}
        </span>

        <button
          type="button"
          className="btn btn-sm"
          onClick={onResetNetwork}
          title="Restore default airports, routes, and delays"
        >
          <RotateCcw size={13} />
          Reset Graph
        </button>
      </div>
    </header>
  );
}
