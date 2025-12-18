/**
 * Coordinate Parsing and Validation Utilities
 * Supports multiple coordinate formats and normalizes to Decimal Degrees (DD)
 */

export type CoordinateFormat = 
  | 'DD'           // Decimal Degrees: "43.238949, 76.889709"
  | 'DMS'          // Degrees/Minutes/Seconds: 43°14'20.2"N 76°53'23.0"E
  | 'GOOGLE_MAPS'  // Google Maps URL: https://maps.google.com/?q=43.238949,76.889709
  | 'UNKNOWN';

export interface ParsedCoordinates {
  lat: number;
  lng: number;
  format: CoordinateFormat;
  normalized: string; // Canonical format: "43.238949, 76.889709"
}

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
  const parsers = [
    parseDecimalDegrees,
    parseGoogleMapsUrl,
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
 *   - https://goo.gl/maps/... (redirects, not supported)
 */
function parseGoogleMapsUrl(input: string): ParsedCoordinates | null {
  // Check if input looks like a URL
  if (!input.includes('google.com') && !input.includes('maps')) {
    return null;
  }

  try {
    const url = new URL(input);
    
    // Try to parse from "q" parameter
    const qParam = url.searchParams.get('q');
    if (qParam) {
      const coords = parseDecimalDegrees(qParam);
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
  } catch (error) {
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
