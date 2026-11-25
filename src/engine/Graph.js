import { haversineDistance, isValidCoordinate } from './haversine.js';

export const OBJECTIVE_MODES = {
  DISTANCE: 'distance',
  PENALTY: 'penalty',
  STOPS: 'stops',
};

/**
 * Weighted Airport Network Graph using an Adjacency List representation.
 * Nodes are airports with geographic coordinates; edges are flight corridors
 * with distance, duration, daily frequency, and configurable delay penalties.
 */
export class AirportGraph {
  constructor() {
    this.airports = new Map();
    this.adjacency = new Map();
  }

  addAirport(airport) {
    const id = String(airport.id || airport.iata).trim().toUpperCase();
    if (!id) {
      throw new Error('Airport must have a non-empty id or IATA code.');
    }
    if (!isValidCoordinate(airport.lat, airport.lon)) {
      throw new Error(`Invalid coordinates for airport ${id}: (${airport.lat}, ${airport.lon})`);
    }

    const record = {
      id,
      iata: airport.iata || id,
      name: airport.name || id,
      city: airport.city || '',
      country: airport.country || '',
      region: airport.region || 'Global',
      lat: Number(airport.lat),
      lon: Number(airport.lon),
      x: typeof airport.x === 'number' ? airport.x : undefined,
      y: typeof airport.y === 'number' ? airport.y : undefined,
      enabled: airport.enabled !== false,
    };

    this.airports.set(id, record);
    if (!this.adjacency.has(id)) {
      this.adjacency.set(id, []);
    }
    return record;
  }

  removeAirport(id) {
    const key = String(id).toUpperCase();
    this.airports.delete(key);
    this.adjacency.delete(key);
    for (const [source, edges] of this.adjacency.entries()) {
      this.adjacency.set(
        source,
        edges.filter((edge) => edge.to !== key)
      );
    }
  }

  setAirportEnabled(id, enabled) {
    const airport = this.airports.get(String(id).toUpperCase());
    if (airport) {
      airport.enabled = Boolean(enabled);
    }
  }

  addRoute(route, bidirectional = true) {
    const from = String(route.from).trim().toUpperCase();
    const to = String(route.to).trim().toUpperCase();

    const sourceAirport = this.airports.get(from);
    const destAirport = this.airports.get(to);
    if (!sourceAirport || !destAirport) {
      throw new Error(`Cannot add route ${from} -> ${to}: missing airport node.`);
    }
    if (from === to) {
      throw new Error(`Self-loop route ${from} -> ${to} is not permitted.`);
    }

    const computedDistance =
      typeof route.distanceKm === 'number' && Number.isFinite(route.distanceKm)
        ? route.distanceKm
        : Math.round(
            haversineDistance(
              sourceAirport.lat,
              sourceAirport.lon,
              destAirport.lat,
              destAirport.lon
            )
          );

    if (computedDistance < 0) {
      throw new Error(`Route ${from} -> ${to} has negative weight: ${computedDistance}`);
    }

    const flightTimeMin =
      typeof route.flightTimeMin === 'number' && Number.isFinite(route.flightTimeMin)
        ? route.flightTimeMin
        : Math.max(25, Math.round((computedDistance / 820) * 60 + 25));

    const edge = {
      id: `${from}-${to}`,
      from,
      to,
      distanceKm: computedDistance,
      flightTimeMin,
      frequencyPerDay: route.frequencyPerDay ?? 4,
      delayMin: Math.max(0, route.delayMin ?? 0),
      enabled: route.enabled !== false,
    };

    this.#upsertEdge(from, edge);

    if (bidirectional) {
      this.#upsertEdge(to, {
        ...edge,
        id: `${to}-${from}`,
        from: to,
        to: from,
      });
    }
  }

  #upsertEdge(from, edge) {
    const list = this.adjacency.get(from) || [];
    const existingIdx = list.findIndex((e) => e.to === edge.to);
    if (existingIdx >= 0) {
      list[existingIdx] = edge;
    } else {
      list.push(edge);
    }
    this.adjacency.set(from, list);
  }

  updateRoute(from, to, patch, bidirectional = true) {
    const src = String(from).toUpperCase();
    const dst = String(to).toUpperCase();
    const applyPatch = (u, v) => {
      const edges = this.adjacency.get(u) || [];
      const edge = edges.find((e) => e.to === v);
      if (edge) {
        if (typeof patch.distanceKm === 'number' && patch.distanceKm >= 0) {
          edge.distanceKm = patch.distanceKm;
        }
        if (typeof patch.flightTimeMin === 'number' && patch.flightTimeMin >= 0) {
          edge.flightTimeMin = patch.flightTimeMin;
        }
        if (typeof patch.delayMin === 'number' && patch.delayMin >= 0) {
          edge.delayMin = patch.delayMin;
        }
        if (typeof patch.frequencyPerDay === 'number' && patch.frequencyPerDay >= 1) {
          edge.frequencyPerDay = patch.frequencyPerDay;
        }
        if (typeof patch.enabled === 'boolean') {
          edge.enabled = patch.enabled;
        }
      }
    };
    applyPatch(src, dst);
    if (bidirectional) {
      applyPatch(dst, src);
    }
  }

  getAirport(id) {
    return this.airports.get(String(id).toUpperCase()) || null;
  }

  getNeighbors(id) {
    const key = String(id).toUpperCase();
    const edges = this.adjacency.get(key) || [];
    return edges.filter((edge) => {
      if (!edge.enabled) return false;
      const target = this.airports.get(edge.to);
      return target && target.enabled;
    });
  }

  /**
   * Computes non-negative edge cost according to the selected objective mode.
   */
  getEdgeWeight(edge, objective = OBJECTIVE_MODES.DISTANCE) {
    if (objective === OBJECTIVE_MODES.STOPS) {
      return 1;
    }
    if (objective === OBJECTIVE_MODES.PENALTY) {
      const delayPenalty = (edge.delayMin || 0) * 12;
      const freqPenalty =
        (edge.frequencyPerDay || 4) >= 6 ? 0 : (6 - (edge.frequencyPerDay || 4)) * 35;
      return edge.distanceKm + delayPenalty + freqPenalty;
    }
    return edge.distanceKm;
  }

  getAllAirports() {
    return Array.from(this.airports.values());
  }

  getAllRoutes(deduplicateUndirected = true) {
    const routes = [];
    const seen = new Set();
    for (const edges of this.adjacency.values()) {
      for (const edge of edges) {
        if (deduplicateUndirected) {
          const pairKey = [edge.from, edge.to].sort().join('::');
          if (seen.has(pairKey)) continue;
          seen.add(pairKey);
        }
        routes.push(edge);
      }
    }
    return routes;
  }

  getStats() {
    const airports = this.getAllAirports();
    const routes = this.getAllRoutes(true);
    return {
      airportCount: airports.length,
      activeAirports: airports.filter((a) => a.enabled).length,
      routeCount: routes.length,
      activeRoutes: routes.filter((r) => r.enabled).length,
      directedEdgeCount: this.getAllRoutes(false).length,
    };
  }

  clone() {
    const copy = new AirportGraph();
    for (const airport of this.airports.values()) {
      copy.addAirport({ ...airport });
    }
    for (const edges of this.adjacency.values()) {
      for (const edge of edges) {
        copy.addRoute({ ...edge }, false);
      }
    }
    return copy;
  }
}
