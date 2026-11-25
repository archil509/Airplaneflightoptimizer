/**
 * Clean 18-airport, 34-corridor visualizer graph matching the simple,
 * uncluttered Airport Route Visualizer layout.
 * Coordinates (x, y) are in a 960x620 logical SVG canvas.
 * Latitude/longitude are scaled (~100 px ≈ 90 km) so straight-line Haversine
 * distance h(u, v) is <= edge.distanceKm on every corridor (admissible A*).
 */

function canvasToGeo(x, y) {
  const lat = 44.0 - ((y - 310) / 620) * 5.0;
  const lon = -95.0 + ((x - 480) / 960) * 8.0;
  return { lat: Number(lat.toFixed(4)), lon: Number(lon.toFixed(4)) };
}

const RAW_NODES = [
  { id: 'SEA', iata: 'SEA', name: 'Seattle-Tacoma', city: 'Seattle', x: 105, y: 120 },
  { id: 'SFO', iata: 'SFO', name: 'San Francisco', city: 'San Francisco', x: 240, y: 190 },
  { id: 'YVR', iata: 'YVR', name: 'Vancouver Intl', city: 'Vancouver', x: 425, y: 60 },
  { id: 'DEN', iata: 'DEN', name: 'Denver Intl', city: 'Denver', x: 515, y: 155 },
  { id: 'YYZ', iata: 'YYZ', name: 'Toronto Pearson', city: 'Toronto', x: 695, y: 60 },
  { id: 'BOS', iata: 'BOS', name: 'Boston Logan', city: 'Boston', x: 875, y: 95 },
  { id: 'JFK', iata: 'JFK', name: 'New York JFK', city: 'New York', x: 785, y: 195 },
  { id: 'LAX', iata: 'LAX', name: 'Los Angeles Intl', city: 'Los Angeles', x: 285, y: 315 },
  { id: 'SAN', iata: 'SAN', name: 'San Diego Intl', city: 'San Diego', x: 105, y: 345 },
  { id: 'HNL', iata: 'HNL', name: 'Honolulu Intl', city: 'Honolulu', x: 150, y: 540 },
  { id: 'PHX', iata: 'PHX', name: 'Phoenix Sky Harbor', city: 'Phoenix', x: 240, y: 445 },
  { id: 'ORD', iata: 'ORD', name: "Chicago O'Hare", city: 'Chicago', x: 515, y: 340 },
  { id: 'ATL', iata: 'ATL', name: 'Atlanta Hartsfield', city: 'Atlanta', x: 740, y: 370 },
  { id: 'DFW', iata: 'DFW', name: 'Dallas/Fort Worth', city: 'Dallas', x: 515, y: 505 },
  { id: 'IAH', iata: 'IAH', name: 'Houston Bush', city: 'Houston', x: 425, y: 565 },
  { id: 'CLT', iata: 'CLT', name: 'Charlotte Douglas', city: 'Charlotte', x: 785, y: 445 },
  { id: 'MIA', iata: 'MIA', name: 'Miami Intl', city: 'Miami', x: 875, y: 420 },
  { id: 'MCO', iata: 'MCO', name: 'Orlando Intl', city: 'Orlando', x: 740, y: 565 },
];

export const VISUALIZER_AIRPORTS = RAW_NODES.map((n) => {
  const { lat, lon } = canvasToGeo(n.x, n.y);
  return {
    ...n,
    country: 'North America',
    region: 'Visualizer',
    lat,
    lon,
    enabled: true,
  };
});

export const VISUALIZER_ROUTES = [
  { from: 'SEA', to: 'SFO', distanceKm: 200, frequencyPerDay: 1 },
  { from: 'SFO', to: 'YVR', distanceKm: 2500, frequencyPerDay: 1 },
  { from: 'SFO', to: 'DEN', distanceKm: 900, frequencyPerDay: 1 },
  { from: 'SFO', to: 'LAX', distanceKm: 1100, frequencyPerDay: 1 },
  { from: 'SFO', to: 'SAN', distanceKm: 1000, frequencyPerDay: 1 },
  { from: 'SFO', to: 'ORD', distanceKm: 1200, frequencyPerDay: 1 },
  { from: 'YVR', to: 'DEN', distanceKm: 400, frequencyPerDay: 1 },
  { from: 'DEN', to: 'YYZ', distanceKm: 350, frequencyPerDay: 1 },
  { from: 'DEN', to: 'BOS', distanceKm: 900, frequencyPerDay: 1 },
  { from: 'DEN', to: 'JFK', distanceKm: 1000, frequencyPerDay: 1 },
  { from: 'DEN', to: 'ORD', distanceKm: 900, frequencyPerDay: 1 },
  { from: 'DEN', to: 'ATL', distanceKm: 1400, frequencyPerDay: 1 },
  { from: 'YYZ', to: 'JFK', distanceKm: 600, frequencyPerDay: 1 },
  { from: 'YYZ', to: 'BOS', distanceKm: 450, frequencyPerDay: 1 },
  { from: 'BOS', to: 'JFK', distanceKm: 350, frequencyPerDay: 1 },
  { from: 'JFK', to: 'ATL', distanceKm: 800, frequencyPerDay: 1 },
  { from: 'LAX', to: 'SAN', distanceKm: 500, frequencyPerDay: 1 },
  { from: 'LAX', to: 'ORD', distanceKm: 1300, frequencyPerDay: 1 },
  { from: 'LAX', to: 'DFW', distanceKm: 1300, frequencyPerDay: 1 },
  { from: 'LAX', to: 'PHX', distanceKm: 1200, frequencyPerDay: 1 },
  { from: 'SAN', to: 'PHX', distanceKm: 150, frequencyPerDay: 1 },
  { from: 'SAN', to: 'HNL', distanceKm: 2800, frequencyPerDay: 1 },
  { from: 'PHX', to: 'HNL', distanceKm: 2600, frequencyPerDay: 1 },
  { from: 'PHX', to: 'DFW', distanceKm: 1000, frequencyPerDay: 1 },
  { from: 'ORD', to: 'DFW', distanceKm: 800, frequencyPerDay: 1 },
  { from: 'ORD', to: 'ATL', distanceKm: 1500, frequencyPerDay: 1 },
  { from: 'ORD', to: 'CLT', distanceKm: 1600, frequencyPerDay: 1 },
  { from: 'DFW', to: 'IAH', distanceKm: 400, frequencyPerDay: 1 },
  { from: 'DFW', to: 'ATL', distanceKm: 900, frequencyPerDay: 1 },
  { from: 'DFW', to: 'CLT', distanceKm: 1100, frequencyPerDay: 1 },
  { from: 'IAH', to: 'ATL', distanceKm: 1100, frequencyPerDay: 1 },
  { from: 'ATL', to: 'CLT', distanceKm: 700, frequencyPerDay: 1 },
  { from: 'ATL', to: 'MIA', distanceKm: 700, frequencyPerDay: 1 },
  { from: 'CLT', to: 'MIA', distanceKm: 300, frequencyPerDay: 1 },
  { from: 'CLT', to: 'MCO', distanceKm: 300, frequencyPerDay: 1 },
].map((r) => ({
  ...r,
  flightTimeMin: Math.max(30, Math.round((r.distanceKm / 800) * 60 + 20)),
  delayMin: 0,
}));

export function canvasCoordsToGeo(x, y) {
  return canvasToGeo(x, y);
}
