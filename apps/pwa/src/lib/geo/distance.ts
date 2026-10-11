/**
 * Haversine distance and proximity checks.
 *
 * Used by:
 *   - lib/osm/overpass.ts (to rank POIs by distance from user)
 *   - features/proof/judgeService.ts (to verify the photo's GPS is
 *     within `radiusMeters` of the quest target)
 */

const EARTH_RADIUS_METERS = 6371000

export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function isWithinRadius(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  radiusMeters: number,
): boolean {
  return haversine(lat1, lng1, lat2, lng2) <= radiusMeters
}

/**
 * Bearing from point 1 to point 2, in degrees [0, 360).
 * Used to display "head northeast" cues during the lockout.
 */
export function bearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const toDeg = (rad: number) => (rad * 180) / Math.PI
  const φ1 = toRad(lat1)
  const φ2 = toRad(lat2)
  const Δλ = toRad(lng2 - lng1)
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

export function compassDirection(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round(deg / 45) % 8]
}

/**
 * Rough walking distance estimate via road network — we don't have routing
 * data offline, so this is a haversine with a "walkability factor" of 1.3
 * to account for non-straight paths.
 */
export function estimatedWalkDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return haversine(lat1, lng1, lat2, lng2) * 1.3
}

/** Rough walking time in minutes (avg 5 km/h, with a 2-min fixed overhead). */
export function estimatedWalkMinutes(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dist = estimatedWalkDistance(lat1, lng1, lat2, lng2)
  return Math.ceil(dist / 1000 / 5 * 60 + 2)
}
