/**
 * Coordinate Parsing and Validation Utilities
 * Supports multiple coordinate formats and normalizes to Decimal Degrees (DD)
 */

export type CoordinateFormat = 
  | 'DD'           // Decimal Degrees: "43.238949, 76.889709"
  | 'DMS'          // Degrees/Minutes/Seconds: 43°14'20.2"N 76°53'23.0"E
  | 'GOOGLE_MAPS'  // Google Maps URL: https://maps.google.com/?q=43.238949,76.889709
  | 'YANDEX_MAPS'  // Yandex Maps URL: https://yandex.ru/maps/?pt=76.889709,43.238949
  | 'TWOGIS'       // 2GIS URL: https://2gis.ru/moscow/geo/76.889709,43.238949
  | 'UNKNOWN';

export interface ParsedCoordinates {
  lat: number;
  lng: number;
  format: CoordinateFormat;
  normalized: string; // Canonical format: "43.238949, 76.889709"
}

/**
 * Check if input is a short/unsupported map link that we can't parse client-side
 * These links require redirect resolution which we don't support.
 *
 * Covers:
 *   - Google: goo.gl, maps.app.goo.gl
 *   - Yandex: yandex.ru/maps/-/... (short encoded links)
 */
export function isShortMapLink(input: string): boolean {
  try {
    const url = new URL(input);

    // Google short links
    if (url.hostname.includes('goo.gl')) {
      return true;
    }

    // Yandex short links: yandex.ru/maps/-/CCUkr2Hj3A
    if (url.hostname.includes('yandex.') && url.pathname.includes('/maps/-/')) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * @deprecated Use isShortMapLink instead. Kept for backward compatibility.
 */
export const isShortGoogleMapsLink = isShortMapLink;

/**
 * Parse coordinates from various input formats
 * Returns null if parsing fails
 */
export function parseCoordinates(input: string): ParsedCoordinates | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  // Try parsing in order of likelihood
  // Each parser is gated on its own hostname/format check — no cross-interference
  const parsers = [
    parseDecimalDegrees,
    parseGoogleMapsUrl,
    parseYandexMapsUrl,
    parse2gisUrl,
    parseDMS,
  ];

  for (const parser of parsers) {
    const result = parser(trimmed);
    if (result) {
      return result;
    }
  }

  return null;
}

/**
 * Parse Decimal Degrees format
 * Examples:
 *   - "43.238949, 76.889709"
 *   - "43.238949,76.889709"
 *   - "43.238949 76.889709"
 *   - "-43.238949, -76.889709"
 */
function parseDecimalDegrees(input: string): ParsedCoordinates | null {
  // Regex for DD format (handles comma or space separator)
  const ddRegex = /^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/;
  const match = input.match(ddRegex);

  if (!match) {
    return null;
  }

  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[2]);

  if (!validateCoordinates(lat, lng)) {
    return null;
  }

  return {
    lat,
    lng,
    format: 'DD',
    normalized: normalizeCoordinates(lat, lng),
  };
}

/**
 * Parse Google Maps URLs
 * Examples:
 *   - https://maps.google.com/?q=43.238949,76.889709
 *   - https://www.google.com/maps?q=43.238949,76.889709
 *   - https://maps.google.com/@43.238949,76.889709,15z
 *   - https://www.google.com/maps/place/43.238949,76.889709
 *   - https://goo.gl/maps/... (short links not supported - requires redirect)
 *   - https://maps.app.goo.gl/... (short links not supported - requires redirect)
 */
function parseGoogleMapsUrl(input: string): ParsedCoordinates | null {
  // Check if input looks like a URL
  if (!input.includes('://')) {
    return null;
  }

  try {
    const url = new URL(input);
    
    // Check for short links (goo.gl, maps.app.goo.gl)
    // These require redirect resolution which we don't support client-side
    if (url.hostname.includes('goo.gl')) {
      // Return null - will be caught by validation and show helpful error
      return null;
    }

    // Only proceed if it's a Google Maps URL
    if (!url.hostname.includes('google.com') && !url.hostname.includes('maps.google')) {
      return null;
    }

    // Try to parse from "q" parameter
    const qParam = url.searchParams.get('q');
    if (qParam) {
      const coords = parseDecimalDegrees(qParam);
      if (coords) {
        return { ...coords, format: 'GOOGLE_MAPS' };
      }
    }

    // Try to parse from "query" parameter (API format)
    const queryParam = url.searchParams.get('query');
    if (queryParam) {
      const coords = parseDecimalDegrees(queryParam);
      if (coords) {
        return { ...coords, format: 'GOOGLE_MAPS' };
      }
    }

    // Try to parse from pathname (e.g., /@43.238949,76.889709,15z)
    const pathMatch = url.pathname.match(/\/@?(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (pathMatch) {
      const lat = parseFloat(pathMatch[1]);
      const lng = parseFloat(pathMatch[2]);
      
      if (validateCoordinates(lat, lng)) {
        return {
          lat,
          lng,
          format: 'GOOGLE_MAPS',
          normalized: normalizeCoordinates(lat, lng),
        };
      }
    }

    // Try to parse from /place/ pathname (e.g., /place/43.238949,76.889709)
    const placeMatch = url.pathname.match(/\/place\/(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (placeMatch) {
      const lat = parseFloat(placeMatch[1]);
      const lng = parseFloat(placeMatch[2]);
      
      if (validateCoordinates(lat, lng)) {
        return {
          lat,
          lng,
          format: 'GOOGLE_MAPS',
          normalized: normalizeCoordinates(lat, lng),
        };
      }
    }
  } catch (error) {
    // Invalid URL, continue
  }

  return null;
}

/**
 * Parse Yandex Maps URLs
 * IMPORTANT: Yandex uses longitude,latitude order (lng,lat) for most params,
 * EXCEPT rtext which uses latitude,longitude (lat,lng).
 *
 * Examples:
 *   - https://yandex.ru/maps/?pt=76.889709,43.238949&z=15&l=map
 *   - https://yandex.ru/maps/?ll=76.889709,43.238949&z=12
 *   - https://yandex.ru/maps/?whatshere[point]=76.889709,43.238949&whatshere[zoom]=17
 *   - https://yandex.ru/maps/?rtext=43.238949,76.889709~43.25,76.95
 *   - https://yandex.ru/maps/-/CCUkr2Hj3A (short links - NOT supported)
 */
function parseYandexMapsUrl(input: string): ParsedCoordinates | null {
  if (!input.includes('://')) {
    return null;
  }

  try {
    const url = new URL(input);

    // Hostname gate: yandex.ru, yandex.com, yandex.kz, maps.yandex.ru, etc.
    if (!url.hostname.includes('yandex.')) {
      return null;
    }

    // Must contain /maps in pathname (filter out non-map Yandex pages)
    if (!url.pathname.includes('/maps')) {
      return null;
    }

    // Reject short links: /maps/-/... (require redirect resolution)
    if (url.pathname.includes('/maps/-/')) {
      return null;
    }

    // Helper: parse "lng,lat" string (Yandex default order) -> { lat, lng }
    const parseLngLat = (value: string): ParsedCoordinates | null => {
      const parts = value.split(',');
      if (parts.length < 2) return null;

      const lng = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);

      if (!validateCoordinates(lat, lng)) return null;

      return {
        lat,
        lng,
        format: 'YANDEX_MAPS',
        normalized: normalizeCoordinates(lat, lng),
      };
    };

    // Helper: parse "lat,lng" string (used only for rtext) -> { lat, lng }
    const parseLatLng = (value: string): ParsedCoordinates | null => {
      const parts = value.split(',');
      if (parts.length < 2) return null;

      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);

      if (!validateCoordinates(lat, lng)) return null;

      return {
        lat,
        lng,
        format: 'YANDEX_MAPS',
        normalized: normalizeCoordinates(lat, lng),
      };
    };

    // Priority 1: pt (placemark) — most specific, uses lng,lat
    const ptParam = url.searchParams.get('pt');
    if (ptParam) {
      // pt can contain multiple points: "lng,lat~lng,lat" — take first
      const firstPoint = ptParam.split('~')[0];
      const result = parseLngLat(firstPoint);
      if (result) return result;
    }

    // Priority 2: whatshere[point] — "What's here?", uses lng,lat
    const whatshereParam = url.searchParams.get('whatshere[point]');
    if (whatshereParam) {
      const result = parseLngLat(whatshereParam);
      if (result) return result;
    }

    // Priority 3: ll (map center) — uses lng,lat
    const llParam = url.searchParams.get('ll');
    if (llParam) {
      const result = parseLngLat(llParam);
      if (result) return result;
    }

    // Priority 4: rtext (route) — uses lat,lng (!) — take first waypoint
    const rtextParam = url.searchParams.get('rtext');
    if (rtextParam) {
      // rtext format: "lat,lng~lat,lng" or "~lat,lng" (empty start)
      const waypoints = rtextParam.split('~').filter(Boolean);
      if (waypoints.length > 0) {
        const result = parseLatLng(waypoints[0]);
        if (result) return result;
      }
    }
  } catch {
    // Invalid URL, continue
  }

  return null;
}

/**
 * Parse 2GIS URLs
 * IMPORTANT: 2GIS uses longitude,latitude order (lng,lat) everywhere.
 *
 * Supported URL formats (priority order):
 *   1. /geo/lng,lat — geographic point
 *      https://2gis.ru/moscow/geo/37.618423,55.751244
 *   2. /firm/{id}/lng%2Clat — firm with coordinates in path (%2C = encoded comma)
 *      https://2gis.kz/almaty/firm/70000001082637794/76.872734%2C43.234182
 *   3. ?m=lng,lat/zoom — map view parameter (universal fallback)
 *      https://2gis.kz/almaty/firm/70000001082637794?m=76.872672%2C43.233969%2F18.81
 */
function parse2gisUrl(input: string): ParsedCoordinates | null {
  if (!input.includes('://')) {
    return null;
  }

  try {
    const url = new URL(input);

    // Hostname gate: 2gis.ru, 2gis.kz, 2gis.com (incl. m.2gis.ru etc.)
    if (!url.hostname.includes('2gis.')) {
      return null;
    }

    // Helper: validate lng,lat pair and return ParsedCoordinates
    const fromLngLat = (lngStr: string, latStr: string): ParsedCoordinates | null => {
      const lng = parseFloat(lngStr);
      const lat = parseFloat(latStr);
      if (!validateCoordinates(lat, lng)) return null;
      return {
        lat,
        lng,
        format: 'TWOGIS',
        normalized: normalizeCoordinates(lat, lng),
      };
    };

    // Priority 1: /geo/lng,lat in pathname (most specific)
    const geoMatch = url.pathname.match(/\/geo\/(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (geoMatch) {
      const result = fromLngLat(geoMatch[1], geoMatch[2]);
      if (result) return result;
    }

    // Priority 2: /firm/{id}/lng,lat in decoded pathname
    // URL-encoded comma (%2C) stays encoded in url.pathname, so we decode first
    const decodedPath = decodeURIComponent(url.pathname);
    const firmMatch = decodedPath.match(/\/firm\/\d+\/(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (firmMatch) {
      const result = fromLngLat(firmMatch[1], firmMatch[2]);
      if (result) return result;
    }

    // Priority 3: ?m=lng,lat/zoom query parameter (universal fallback)
    // searchParams.get() auto-decodes %2C and %2F
    const mParam = url.searchParams.get('m');
    if (mParam) {
      // Format: "lng,lat/zoom" or "lng,lat"
      const withoutZoom = mParam.split('/')[0];
      const parts = withoutZoom.split(',');
      if (parts.length >= 2) {
        const result = fromLngLat(parts[0], parts[1]);
        if (result) return result;
      }
    }
  } catch {
    // Invalid URL, continue
  }

  return null;
}

/**
 * Parse DMS (Degrees/Minutes/Seconds) format
 * Examples:
 *   - "43°14'20.2\"N 76°53'23.0\"E"
 *   - "43° 14' 20.2\" N, 76° 53' 23.0\" E"
 *   - "N43°14'20.2\" E76°53'23.0\""
 * 
 * Note: This is a simplified parser for MVP
 */
function parseDMS(input: string): ParsedCoordinates | null {
  // DMS regex pattern (simplified)
  // Matches: 43°14'20.2"N or N43°14'20.2" or 43° 14' 20.2" N
  const dmsRegex = /([NS])?(\d+)[°\s]+(\d+)['′\s]+(\d+\.?\d*)["″\s]*([NS])?[,\s]*([EW])?(\d+)[°\s]+(\d+)['′\s]+(\d+\.?\d*)["″\s]*([EW])?/i;
  
  const match = input.match(dmsRegex);
  if (!match) {
    return null;
  }

  // Extract latitude components
  const latHemisphere = (match[1] || match[5] || 'N').toUpperCase();
  const latDeg = parseInt(match[2], 10);
  const latMin = parseInt(match[3], 10);
  const latSec = parseFloat(match[4]);

  // Extract longitude components
  const lngHemisphere = (match[6] || match[10] || 'E').toUpperCase();
  const lngDeg = parseInt(match[7], 10);
  const lngMin = parseInt(match[8], 10);
  const lngSec = parseFloat(match[9]);

  // Convert DMS to DD
  let lat = latDeg + latMin / 60 + latSec / 3600;
  let lng = lngDeg + lngMin / 60 + lngSec / 3600;

  // Apply hemisphere
  if (latHemisphere === 'S') lat = -lat;
  if (lngHemisphere === 'W') lng = -lng;

  if (!validateCoordinates(lat, lng)) {
    return null;
  }

  return {
    lat,
    lng,
    format: 'DMS',
    normalized: normalizeCoordinates(lat, lng),
  };
}

/**
 * Validate coordinates are within valid ranges
 */
export function validateCoordinates(lat: number, lng: number): boolean {
  return (
    !isNaN(lat) &&
    !isNaN(lng) &&
    isFinite(lat) &&
    isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Normalize coordinates to standard DD format with 6 decimal places
 * Returns: "43.238949, 76.889709"
 */
export function normalizeCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

/**
 * Generate navigation URLs for various map services
 */
export interface NavigationUrls {
  googleMaps: string;
  appleMaps: string;
  yandexMaps: string;
  twogis: string;
}

export function generateNavigationUrls(lat: number, lng: number): NavigationUrls {
  const coords = `${lat},${lng}`;
  
  return {
    googleMaps: `https://www.google.com/maps/search/?api=1&query=${coords}`,
    appleMaps: `https://maps.apple.com/?q=${coords}`,
    yandexMaps: `https://yandex.ru/maps/?pt=${lng},${lat}&z=15&l=map`,
    twogis: `https://2gis.kz/geo/${lng},${lat}`,
  };
}

/**
 * Copy coordinates to clipboard
 * Returns promise that resolves when copied
 */
export async function copyCoordinatesToClipboard(
  lat: number,
  lng: number
): Promise<boolean> {
  try {
    const text = normalizeCoordinates(lat, lng);
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy coordinates:', error);
    return false;
  }
}
