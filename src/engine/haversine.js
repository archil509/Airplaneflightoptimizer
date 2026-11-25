export const EARTH_RADIUS_KM = 6371;

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Validates geographic latitude and longitude values.
 */
export function isValidCoordinate(lat, lon) {
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

export function toRadians(degrees) {
  return degrees * DEG_TO_RAD;
}

/**
 * Computes great-circle distance in kilometers between two coordinates using
 * the Haversine formula (R = 6371 km) and returns intermediate formula terms.
 */
export function haversineDetailed(lat1, lon1, lat2, lon2) {
  if (!isValidCoordinate(lat1, lon1) || !isValidCoordinate(lat2, lon2)) {
    throw new Error(
      `Invalid coordinates provided to haversineDistance: (${lat1}, ${lon1}) -> (${lat2}, ${lon2})`
    );
  }

  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaPhi = toRadians(lat2 - lat1);
  const deltaLambda = toRadians(lon2 - lon1);

  const sinHalfLat = Math.sin(deltaPhi / 2);
  const sinHalfLon = Math.sin(deltaLambda / 2);

  const a =
    sinHalfLat * sinHalfLat +
    Math.cos(phi1) * Math.cos(phi2) * sinHalfLon * sinHalfLon;
  const clampedA = Math.min(1, Math.max(0, a));
  const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));
  const distanceKm = EARTH_RADIUS_KM * c;

  return {
    distanceKm,
    phi1,
    phi2,
    deltaPhi,
    deltaLambda,
    a: clampedA,
    c,
    radiusKm: EARTH_RADIUS_KM,
  };
}

/**
 * Computes great-circle distance in kilometers using the Haversine formula.
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  return haversineDetailed(lat1, lon1, lat2, lon2).distanceKm;
}

/**
 * Generates spherical great-circle intermediate points between two airports
 * for smooth curved rendering on geographic maps. Splits segments if crossing
 * the antimeridian (+/- 180 longitude).
 */
export function interpolateGreatCircle(lat1, lon1, lat2, lon2, segments = 32) {
  if (!isValidCoordinate(lat1, lon1) || !isValidCoordinate(lat2, lon2)) {
    return [];
  }

  const phi1 = toRadians(lat1);
  const lambda1 = toRadians(lon1);
  const phi2 = toRadians(lat2);
  const lambda2 = toRadians(lon2);

  const cosD = Math.min(
    1,
    Math.max(
      -1,
      Math.sin(phi1) * Math.sin(phi2) +
        Math.cos(phi1) * Math.cos(phi2) * Math.cos(lambda2 - lambda1)
    )
  );
  const d = Math.acos(cosD);

  if (d < 1e-6) {
    return [
      [
        { lat: lat1, lon: lon1 },
        { lat: lat2, lon: lon2 },
      ],
    ];
  }

  const points = [];
  const sinD = Math.sin(d);
  for (let i = 0; i <= segments; i++) {
    const f = i / segments;
    const A = Math.sin((1 - f) * d) / sinD;
    const B = Math.sin(f * d) / sinD;
    const x =
      A * Math.cos(phi1) * Math.cos(lambda1) +
      B * Math.cos(phi2) * Math.cos(lambda2);
    const y =
      A * Math.cos(phi1) * Math.sin(lambda1) +
      B * Math.cos(phi2) * Math.sin(lambda2);
    const z = A * Math.sin(phi1) + B * Math.sin(phi2);

    const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) * RAD_TO_DEG;
    const lon = Math.atan2(y, x) * RAD_TO_DEG;
    points.push({ lat, lon });
  }

  // Split path into separate polylines whenever longitude jumps across +/-180
  const chunks = [[]];
  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    const currentChunk = chunks[chunks.length - 1];
    if (currentChunk.length > 0) {
      const prev = currentChunk[currentChunk.length - 1];
      if (Math.abs(pt.lon - prev.lon) > 180) {
        chunks.push([pt]);
        continue;
      }
    }
    currentChunk.push(pt);
  }
  return chunks;
}
