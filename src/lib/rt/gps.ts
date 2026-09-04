/** GPS / geolocation helpers for live-run mode. */

export interface GPSPoint {
  lat: number;
  lng: number;
  t: number; // ms since epoch
}

/** Haversine distance between two lat/lng points, in meters. */
export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000; // earth radius in meters
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Total distance of a trace in meters. */
export function traceDistanceMeters(points: GPSPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineMeters(points[i - 1], points[i]);
  }
  return total;
}

/** Total distance in km (rounded). */
export function traceDistanceKm(points: GPSPoint[]): number {
  return Math.round((traceDistanceMeters(points) / 1000) * 100) / 100;
}

/** Simplify a trace using a basic distance-threshold decimation.
 *  Reduces the number of points for storage/display without losing the path shape. */
export function simplifyTrace(points: GPSPoint[], minDeltaMeters = 8): GPSPoint[] {
  if (points.length <= 2) return points;
  const out: GPSPoint[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const last = out[out.length - 1];
    if (haversineMeters(last, points[i]) >= minDeltaMeters) {
      out.push(points[i]);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

/** Compute the bounding box [minLat, minLng, maxLat, maxLng] for a set of points. */
export function traceBounds(points: GPSPoint[]): {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
} | null {
  if (points.length === 0) return null;
  let minLat = points[0].lat;
  let minLng = points[0].lng;
  let maxLat = points[0].lat;
  let maxLng = points[0].lng;
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  return { minLat, minLng, maxLat, maxLng };
}

/** Encode a polyline into an SVG path `d` string for rendering on a map.
 *  Coordinates are mapped into a 0..1 space using the bounds, then scaled to the SVG size. */
export function traceToSvgPath(
  points: GPSPoint[],
  width: number,
  height: number,
  pad = 0.05
): string {
  if (points.length === 0) return "";
  const bounds = traceBounds(points);
  if (!bounds) return "";
  const latSpan = Math.max(bounds.maxLat - bounds.minLat, 0.0001);
  const lngSpan = Math.max(bounds.maxLng - bounds.minLng, 0.0001);
  // maintain aspect ratio: pick the larger span to fill the viewBox
  const span = Math.max(latSpan, lngSpan);
  const scale = Math.min(width, height) * (1 - pad * 2);
  const offsetX = (width - scale) / 2;
  const offsetY = (height - scale) / 2;
  const project = (p: GPSPoint) => {
    // lng → x, lat → y (inverted because SVG y goes down)
    const x = offsetX + ((p.lng - bounds.minLng) / span) * scale;
    const y = offsetY + ((bounds.maxLat - p.lat) / span) * scale;
    return [x, y];
  };
  return points
    .map((p, i) => {
      const [x, y] = project(p);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}
