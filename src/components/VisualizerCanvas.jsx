import React, { useMemo, useState, useRef } from 'react';
import { X } from 'lucide-react';
import { canvasCoordsToGeo } from '../data/visualizerGraph.js';

const VIEW_W = 980;
const VIEW_H = 620;

export function VisualizerCanvas({
  airports,
  routes,
  sourceId,
  targetId,
  algorithm,
  comparison,
  playbackStep,
  mode,
  routeDraftFrom,
  onAirportClick,
  onCanvasClick,
  onToggleAirport,
  onUpdateRoute,
}) {
  const svgRef = useRef(null);
  const [hoveredAirport, setHoveredAirport] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);

  const airportMap = useMemo(() => {
    const map = new Map();
    for (const a of airports) {
      map.set(a.id, a);
    }
    return map;
  }, [airports]);

  const activeResult = useMemo(() => {
    if (!comparison) return null;
    return algorithm === 'dijkstra' ? comparison.dijkstra : comparison.astar;
  }, [comparison, algorithm]);

  const exploredInfo = useMemo(() => {
    const list = activeResult?.visitedOrder || [];
    const limit =
      typeof playbackStep === 'number' && playbackStep >= 0
        ? Math.min(playbackStep, list.length)
        : list.length;
    const explored = new Set(list.slice(0, limit));
    const currentStepObj =
      activeResult?.steps && limit > 0
        ? activeResult.steps[Math.min(limit - 1, activeResult.steps.length - 1)]
        : null;
    return {
      explored,
      frontier: new Set(currentStepObj?.frontier || []),
      currentNode: currentStepObj?.current || null,
    };
  }, [activeResult, playbackStep]);

  const optimalPathSet = useMemo(() => {
    if (!activeResult?.found) return new Set();
    return new Set(activeResult.path);
  }, [activeResult]);

  const optimalEdgeSet = useMemo(() => {
    const set = new Set();
    if (!activeResult?.found) return set;
    for (const leg of activeResult.legs || []) {
      set.add([leg.from, leg.to].sort().join('::'));
    }
    return set;
  }, [activeResult]);

  const getNodeXY = (airport) => {
    if (typeof airport.x === 'number' && typeof airport.y === 'number') {
      return { x: airport.x, y: airport.y };
    }
    const x = 480 + ((airport.lon + 95.0) / 8.0) * 960;
    const y = 310 + ((44.0 - airport.lat) / 5.0) * 620;
    return { x, y };
  };

  const handleSvgClick = (e) => {
    if (mode !== 'editAirports' || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * VIEW_W;
    const relY = ((e.clientY - rect.top) / rect.height) * VIEW_H;
    const { lat, lon } = canvasCoordsToGeo(relX, relY);
    onCanvasClick({ x: Math.round(relX), y: Math.round(relY), lat, lon });
  };

  const activeEdgeData = selectedEdge
    ? routes.find((r) => [r.from, r.to].sort().join('::') === selectedEdge)
    : null;

  return (
    <div className="viz-canvas-wrap">
      <svg
        ref={svgRef}
        className="viz-svg"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid meet"
        onClick={handleSvgClick}
        style={{
          cursor:
            mode === 'editAirports'
              ? 'crosshair'
              : mode === 'drawRoutes'
              ? 'cell'
              : 'default',
        }}
      >
        <defs>
          <pattern id="chartGrid" width="45" height="45" patternUnits="userSpaceOnUse">
            <path
              d="M 45 0 L 0 0 0 45"
              fill="none"
              stroke="rgba(148, 163, 184, 0.22)"
              strokeWidth="0.7"
            />
          </pattern>
        </defs>

        <rect width={VIEW_W} height={VIEW_H} fill="url(#chartGrid)" />

        {/* Gently curved aeronautical flight corridors */}
        <g>
          {routes.map((route, idx) => {
            const a = airportMap.get(route.from);
            const b = airportMap.get(route.to);
            if (!a || !b) return null;
            const p1 = getNodeXY(a);
            const p2 = getNodeXY(b);
            const edgeKey = [route.from, route.to].sort().join('::');
            const isOptimal = optimalEdgeSet.has(edgeKey);
            const isSelected = selectedEdge === edgeKey;

            // Gentle deterministic curvature
            const mx = (p1.x + p2.x) / 2;
            const my = (p1.y + p2.y) / 2;
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const len = Math.hypot(dx, dy) || 1;
            const curveSign = idx % 2 === 0 ? 1 : -1;
            const offset = Math.min(22, len * 0.1) * curveSign;
            const cx = mx + (-dy / len) * offset;
            const cy = my + (dx / len) * offset;

            // Point at t=0.5 on quadratic Bezier for crisp label badge
            const lx = 0.25 * p1.x + 0.5 * cx + 0.25 * p2.x;
            const ly = 0.25 * p1.y + 0.5 * cy + 0.25 * p2.y;
            const pathD = `M ${p1.x} ${p1.y} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${p2.x} ${p2.y}`;

            return (
              <g
                key={edgeKey}
                style={{ cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedEdge(isSelected ? null : edgeKey);
                }}
              >
                <path d={pathD} fill="none" stroke="transparent" strokeWidth={14} />

                {isOptimal ? (
                  <>
                    <path
                      d={pathD}
                      fill="none"
                      stroke="rgba(5, 150, 105, 0.22)"
                      strokeWidth={8}
                      strokeLinecap="round"
                    />
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#059669"
                      strokeWidth={3}
                      strokeLinecap="round"
                      className="animated-route-line"
                    />
                  </>
                ) : (
                  <path
                    d={pathD}
                    fill="none"
                    stroke={
                      !route.enabled
                        ? 'rgba(225, 29, 72, 0.35)'
                        : isSelected
                        ? '#0284c7'
                        : route.delayMin > 0
                        ? 'rgba(217, 119, 6, 0.65)'
                        : '#cbd5e1'
                    }
                    strokeWidth={isSelected ? 2.4 : 1.5}
                    strokeDasharray={!route.enabled ? '5 4' : undefined}
                  />
                )}

                {/* Crisp pill distance tag */}
                <g transform={`translate(${lx}, ${ly})`}>
                  <rect
                    x={-26}
                    y={-9}
                    width={52}
                    height={17}
                    rx={8.5}
                    fill={isOptimal ? '#ecfdf5' : '#ffffff'}
                    stroke={
                      isOptimal
                        ? '#10b981'
                        : route.delayMin > 0
                        ? '#f59e0b'
                        : '#e2e8f0'
                    }
                    strokeWidth={1}
                  />
                  <text
                    textAnchor="middle"
                    y={2.5}
                    fill={isOptimal ? '#065f46' : '#334155'}
                    fontSize="9"
                    fontWeight="700"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {route.distanceKm}km
                  </text>
                </g>
              </g>
            );
          })}
        </g>

        {/* Airport Waypoint Badges (Distinct IATA pill + radar node) */}
        <g>
          {airports.map((airport) => {
            const { x, y } = getNodeXY(airport);
            const isSource = airport.id === sourceId;
            const isTarget = airport.id === targetId;
            const isDraft = airport.id === routeDraftFrom;
            const isOnPath = optimalPathSet.has(airport.id);
            const isExplored = exploredInfo.explored.has(airport.id);
            const isCurrent = exploredInfo.currentNode === airport.id;

            let bg = '#ffffff';
            let border = '#475569';
            let textColor = '#0f172a';
            let halo = null;

            if (!airport.enabled) {
              bg = '#fff1f2';
              border = '#e11d48';
              textColor = '#9f1239';
            } else if (isSource) {
              bg = '#059669';
              border = '#064e3b';
              textColor = '#ffffff';
              halo = 'rgba(5, 150, 105, 0.25)';
            } else if (isTarget) {
              bg = '#0284c7';
              border = '#0c4a6e';
              textColor = '#ffffff';
              halo = 'rgba(2, 132, 199, 0.25)';
            } else if (isDraft) {
              bg = '#d97706';
              border = '#78350f';
              textColor = '#ffffff';
              halo = 'rgba(217, 119, 6, 0.25)';
            } else if (isOnPath) {
              bg = '#d1fae5';
              border = '#059669';
              textColor = '#065f46';
            } else if (isCurrent) {
              bg = '#fef08a';
              border = '#ca8a04';
              textColor = '#713f12';
              halo = 'rgba(234, 179, 8, 0.32)';
            } else if (isExplored) {
              bg = algorithm === 'dijkstra' ? '#ede9fe' : '#fef3c7';
              border = algorithm === 'dijkstra' ? '#7c3aed' : '#d97706';
              textColor = algorithm === 'dijkstra' ? '#5b21b6' : '#92400e';
            }

            return (
              <g
                key={airport.id}
                transform={`translate(${x}, ${y})`}
                style={{ cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  onAirportClick(airport.id);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleAirport(airport.id, !airport.enabled);
                }}
                onMouseEnter={() => setHoveredAirport(airport)}
                onMouseLeave={() => setHoveredAirport(null)}
              >
                {halo && <circle r={24} fill={halo} />}

                {/* Clean rounded IATA waypoint badge */}
                <rect
                  x={-22}
                  y={-13}
                  width={44}
                  height={26}
                  rx={13}
                  fill={bg}
                  stroke={border}
                  strokeWidth={isSource || isTarget || isOnPath ? 2.2 : 1.5}
                />
                <text
                  textAnchor="middle"
                  y={4}
                  fill={textColor}
                  fontSize="11"
                  fontWeight="700"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {airport.iata}
                </text>

                {(isSource || isTarget) && (
                  <text
                    textAnchor="middle"
                    y={-19}
                    fill={isSource ? '#059669' : '#0284c7'}
                    fontSize="8.5"
                    fontWeight="800"
                    letterSpacing="0.06em"
                  >
                    {isSource ? 'ORIGIN' : 'DEST'}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {mode !== 'select' && (
        <div className="viz-mode-banner">
          {mode === 'editAirports'
            ? 'Edit Airports: Click blank chart to add waypoint • Click badge to remove'
            : routeDraftFrom
            ? `Connect Corridor: ${routeDraftFrom} selected → click destination airport`
            : 'Draw Corridor: Click any two airports to connect them'}
        </div>
      )}

      {activeEdgeData && (
        <div className="edge-popover">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
            <strong className="mono" style={{ fontSize: '0.84rem', color: '#0284c7' }}>
              {activeEdgeData.from} ↔ {activeEdgeData.to}
            </strong>
            <button
              type="button"
              className="btn btn-sm"
              style={{ padding: '2px 6px' }}
              onClick={() => setSelectedEdge(null)}
            >
              <X size={13} />
            </button>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Distance: <strong className="mono">{activeEdgeData.distanceKm} km</strong> &bull; Freq:{' '}
            <strong className="mono">{activeEdgeData.frequencyPerDay}/day</strong> &bull; Delay:{' '}
            <strong className="mono" style={{ color: '#d97706' }}>{activeEdgeData.delayMin}m</strong>
          </div>
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() =>
                onUpdateRoute(activeEdgeData.from, activeEdgeData.to, {
                  distanceKm: Math.max(50, activeEdgeData.distanceKm - 100),
                })
              }
            >
              -100 km
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() =>
                onUpdateRoute(activeEdgeData.from, activeEdgeData.to, {
                  distanceKm: activeEdgeData.distanceKm + 100,
                })
              }
            >
              +100 km
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() =>
                onUpdateRoute(activeEdgeData.from, activeEdgeData.to, {
                  frequencyPerDay: (activeEdgeData.frequencyPerDay % 6) + 1,
                })
              }
            >
              Freq +1
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() =>
                onUpdateRoute(activeEdgeData.from, activeEdgeData.to, {
                  delayMin: activeEdgeData.delayMin >= 60 ? 0 : activeEdgeData.delayMin + 30,
                })
              }
            >
              {activeEdgeData.delayMin >= 60 ? 'Clear Delay' : '+30m Delay'}
            </button>
          </div>
        </div>
      )}

      {hoveredAirport && (
        <div className="viz-hover-pill">
          <strong>{hoveredAirport.iata}</strong> &mdash; {hoveredAirport.city || hoveredAirport.name}
          {!hoveredAirport.enabled ? ' (Closed)' : ' • Right-click to toggle closure'}
        </div>
      )}

      <div className="viz-watermark">
        Click waypoints to plan route &bull; Click any corridor pill to edit
      </div>
    </div>
  );
}
