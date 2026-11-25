import React, { useState } from 'react';
import { Wrench, Plus, Power, Clock } from 'lucide-react';

export function NetworkEditor({
  airports,
  routes,
  onToggleAirport,
  onAddAirport,
  onAddRoute,
  onUpdateRoute,
}) {
  const [newCode, setNewCode] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newLat, setNewLat] = useState('');
  const [newLon, setNewLon] = useState('');
  const [routeFrom, setRouteFrom] = useState(airports[0]?.id || '');
  const [routeTo, setRouteTo] = useState(airports[1]?.id || '');
  const [routeFreq, setRouteFreq] = useState(4);
  const [selectedRouteKey, setSelectedRouteKey] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const sortedAirports = [...airports].sort((a, b) => a.iata.localeCompare(b.iata));
  const activeSelectedRoute =
    routes.find((r) => `${r.from}-${r.to}` === selectedRouteKey) || routes[0] || null;

  const handleCreateAirport = (e) => {
    e.preventDefault();
    try {
      onAddAirport({
        id: newCode.trim().toUpperCase(),
        iata: newCode.trim().toUpperCase(),
        name: `${newCity || newCode} Airport`,
        city: newCity || newCode.trim().toUpperCase(),
        country: 'Custom',
        lat: Number(newLat),
        lon: Number(newLon),
      });
      setStatusMessage(`Added airport ${newCode.trim().toUpperCase()}`);
      setNewCode('');
      setNewCity('');
      setNewLat('');
      setNewLon('');
    } catch (err) {
      setStatusMessage(`Error: ${err.message}`);
    }
  };

  const handleCreateRoute = (e) => {
    e.preventDefault();
    try {
      onAddRoute({
        from: routeFrom,
        to: routeTo,
        frequencyPerDay: Number(routeFreq) || 4,
        delayMin: 0,
      });
      setStatusMessage(`Added bidirectional corridor ${routeFrom} ↔ ${routeTo}`);
    } catch (err) {
      setStatusMessage(`Error: ${err.message}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      {statusMessage && (
        <div className="alert-banner info">
          <span>{statusMessage}</span>
        </div>
      )}

      <div className="metrics-grid">
        {/* Corridor Delay & Frequency Simulator */}
        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title">
              <Clock size={15} color="#f59e0b" />
              Corridor Delay &amp; Frequency Inspector
            </h3>
          </div>

          <label className="field-label" htmlFor="corridor-select">
            Select Corridor
          </label>
          <select
            id="corridor-select"
            className="select-input"
            value={activeSelectedRoute ? `${activeSelectedRoute.from}-${activeSelectedRoute.to}` : ''}
            onChange={(e) => setSelectedRouteKey(e.target.value)}
          >
            {routes.slice(0, 120).map((r) => (
              <option key={`${r.from}-${r.to}`} value={`${r.from}-${r.to}`}>
                {r.from} ↔ {r.to} ({r.distanceKm} km, delay {r.delayMin}m, {r.frequencyPerDay}/day)
              </option>
            ))}
          </select>

          {activeSelectedRoute && (
            <div style={{ marginTop: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              <div className="stat-row">
                <span className="stat-label">Base Distance</span>
                <span className="stat-value">{activeSelectedRoute.distanceKm} km</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Simulated Delay</span>
                <span className="stat-value" style={{ color: '#fbbf24' }}>
                  +{activeSelectedRoute.delayMin} min
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {[0, 30, 60, 120].map((d) => (
                  <button
                    key={d}
                    type="button"
                    className="btn btn-sm"
                    onClick={() =>
                      onUpdateRoute(activeSelectedRoute.from, activeSelectedRoute.to, { delayMin: d })
                    }
                  >
                    {d === 0 ? 'Clear Delay' : `+${d}m Delay`}
                  </button>
                ))}
                <button
                  type="button"
                  className={`btn btn-sm ${activeSelectedRoute.enabled ? 'btn-danger' : ''}`}
                  onClick={() =>
                    onUpdateRoute(activeSelectedRoute.from, activeSelectedRoute.to, {
                      enabled: !activeSelectedRoute.enabled,
                    })
                  }
                >
                  {activeSelectedRoute.enabled ? 'Close Corridor' : 'Reopen Corridor'}
                </button>
              </div>
              <p style={{ margin: 0, fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                Switch Objective to <strong>Distance + Delay &amp; Frequency Penalty</strong> to see delayed corridors reroute automatically.
              </p>
            </div>
          )}
        </div>

        {/* Add Custom Airport */}
        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title">
              <Plus size={15} color="#38bdf8" />
              Add Custom Airport Node
            </h3>
          </div>
          <form onSubmit={handleCreateAirport} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.45rem' }}>
              <input
                className="text-input"
                placeholder="IATA (e.g. XYZ)"
                maxLength={5}
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                required
              />
              <input
                className="text-input"
                placeholder="City Name"
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem' }}>
              <input
                className="text-input"
                type="number"
                step="any"
                placeholder="Latitude (-90..90)"
                value={newLat}
                onChange={(e) => setNewLat(e.target.value)}
                required
              />
              <input
                className="text-input"
                type="number"
                step="any"
                placeholder="Longitude (-180..180)"
                value={newLon}
                onChange={(e) => setNewLon(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-sm">
              Add Airport Node
            </button>
          </form>
        </div>

        {/* Add Custom Route */}
        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title">
              <Wrench size={15} color="#4ade80" />
              Connect Two Airports
            </h3>
          </div>
          <form onSubmit={handleCreateRoute} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem' }}>
              <select
                className="select-input"
                value={routeFrom}
                onChange={(e) => setRouteFrom(e.target.value)}
              >
                {sortedAirports.map((a) => (
                  <option key={a.id} value={a.id}>{a.iata}</option>
                ))}
              </select>
              <select
                className="select-input"
                value={routeTo}
                onChange={(e) => setRouteTo(e.target.value)}
              >
                {sortedAirports.map((a) => (
                  <option key={a.id} value={a.id}>{a.iata}</option>
                ))}
              </select>
            </div>
            <input
              className="text-input"
              type="number"
              min={1}
              max={12}
              value={routeFreq}
              onChange={(e) => setRouteFreq(e.target.value)}
              placeholder="Flights per day"
            />
            <button type="submit" className="btn btn-primary btn-sm">
              Add Route (Auto Haversine Distance)
            </button>
          </form>
        </div>
      </div>

      {/* Airport Outage Toggle Grid */}
      <div className="panel">
        <div className="panel-header">
          <h3 className="panel-title">
            <Power size={15} color="#f43f5e" />
            Airport Operational Status (Click to Disable / Enable)
          </h3>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
          {sortedAirports.map((airport) => (
            <button
              key={airport.id}
              type="button"
              className={`preset-chip mono ${airport.enabled ? '' : 'btn-danger'}`}
              style={{
                padding: '0.28rem 0.5rem',
                background: airport.enabled ? 'var(--bg-card)' : 'rgba(244, 63, 94, 0.14)',
                borderColor: airport.enabled ? 'var(--border-subtle)' : 'rgba(244, 63, 94, 0.45)',
                color: airport.enabled ? 'var(--text-primary)' : '#fda4af',
              }}
              onClick={() => onToggleAirport(airport.id, !airport.enabled)}
              title={`${airport.name} (${airport.city})`}
            >
              {airport.iata}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
