/**
 * Coordinate Parsing Tests
 *
 * Tests for src/lib/utils/coordinates.ts
 * Covers all supported input formats: DD, DMS, Google Maps URL, Yandex Maps URL, 2GIS URL
 *
 * Test framework: Jest (existing)
 * Environment: node (pure logic, no DOM)
 */

import {
  parseCoordinates,
  validateCoordinates,
  normalizeCoordinates,
  isShortGoogleMapsLink,
  isShortMapLink,
  generateNavigationUrls,
} from "@/lib/utils/coordinates";

// ============================================================================
// § 1. Decimal Degrees (DD) — existing parser
// ============================================================================

describe("parseCoordinates — Decimal Degrees", () => {
  test("comma + space separator", () => {
    const result = parseCoordinates("43.238949, 76.889709");
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(43.238949, 6);
    expect(result!.lng).toBeCloseTo(76.889709, 6);
    expect(result!.format).toBe("DD");
  });

  test("comma separator (no space)", () => {
    const result = parseCoordinates("43.238949,76.889709");
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(43.238949, 6);
    expect(result!.lng).toBeCloseTo(76.889709, 6);
  });

  test("space separator", () => {
    const result = parseCoordinates("43.238949 76.889709");
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(43.238949, 6);
    expect(result!.lng).toBeCloseTo(76.889709, 6);
  });

  test("negative coordinates", () => {
    const result = parseCoordinates("-43.238949, -76.889709");
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(-43.238949, 6);
    expect(result!.lng).toBeCloseTo(-76.889709, 6);
  });

  test("integer coordinates (no decimals)", () => {
    const result = parseCoordinates("43, 76");
    expect(result).not.toBeNull();
    expect(result!.lat).toBe(43);
    expect(result!.lng).toBe(76);
  });

  test("leading/trailing whitespace is trimmed", () => {
    const result = parseCoordinates("  43.238949, 76.889709  ");
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(43.238949, 6);
  });

  test("returns normalized string", () => {
    const result = parseCoordinates("43.2, 76.8");
    expect(result).not.toBeNull();
    expect(result!.normalized).toBe("43.200000, 76.800000");
  });

  test("rejects lat > 90", () => {
    expect(parseCoordinates("91, 76")).toBeNull();
  });

  test("rejects lat < -90", () => {
    expect(parseCoordinates("-91, 76")).toBeNull();
  });

  test("rejects lng > 180", () => {
    expect(parseCoordinates("43, 181")).toBeNull();
  });

  test("rejects lng < -180", () => {
    expect(parseCoordinates("43, -181")).toBeNull();
  });

  test("rejects empty string", () => {
    expect(parseCoordinates("")).toBeNull();
  });

  test("rejects whitespace-only", () => {
    expect(parseCoordinates("   ")).toBeNull();
  });

  test("rejects random text", () => {
    expect(parseCoordinates("hello world")).toBeNull();
  });

  test("rejects single number", () => {
    expect(parseCoordinates("43.238949")).toBeNull();
  });
});

// ============================================================================
// § 2. Google Maps URLs — existing parser
// ============================================================================

describe("parseCoordinates — Google Maps URLs", () => {
  test("?q= parameter", () => {
    const result = parseCoordinates(
      "https://maps.google.com/?q=43.238949,76.889709"
    );
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(43.238949, 6);
    expect(result!.lng).toBeCloseTo(76.889709, 6);
    expect(result!.format).toBe("GOOGLE_MAPS");
  });

  test("?query= parameter (API format)", () => {
    const result = parseCoordinates(
      "https://www.google.com/maps/search/?api=1&query=43.238949,76.889709"
    );
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(43.238949, 6);
    expect(result!.lng).toBeCloseTo(76.889709, 6);
    expect(result!.format).toBe("GOOGLE_MAPS");
  });

  test("/@lat,lng,zoom format", () => {
    const result = parseCoordinates(
      "https://www.google.com/maps/@43.238949,76.889709,15z"
    );
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(43.238949, 6);
    expect(result!.lng).toBeCloseTo(76.889709, 6);
    expect(result!.format).toBe("GOOGLE_MAPS");
  });

  test("/place/lat,lng format", () => {
    const result = parseCoordinates(
      "https://www.google.com/maps/place/43.238949,76.889709"
    );
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(43.238949, 6);
    expect(result!.lng).toBeCloseTo(76.889709, 6);
    expect(result!.format).toBe("GOOGLE_MAPS");
  });

  test("/place/Name/@lat,lng,zoom/data=... (most common browser format)", () => {
    const result = parseCoordinates(
      "https://www.google.com/maps/place/Almaty,+Kazakhstan/@43.238949,76.889709,13z/data=!3m1!4b1!4m2!3m1!1s0x38836"
    );
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(43.238949, 6);
    expect(result!.lng).toBeCloseTo(76.889709, 6);
    expect(result!.format).toBe("GOOGLE_MAPS");
  });

  test("maps.google.com domain", () => {
    const result = parseCoordinates(
      "https://maps.google.com/?q=55.751244,37.618423"
    );
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(55.751244, 6);
  });

  test("rejects short link goo.gl", () => {
    expect(
      parseCoordinates("https://goo.gl/maps/abc123")
    ).toBeNull();
  });

  test("rejects short link maps.app.goo.gl", () => {
    expect(
      parseCoordinates("https://maps.app.goo.gl/abc123")
    ).toBeNull();
  });

  test("rejects non-Google URL", () => {
    expect(
      parseCoordinates("https://example.com/maps?q=43.238949,76.889709")
    ).toBeNull();
  });
});

// ============================================================================
// § 3. DMS (Degrees/Minutes/Seconds) — existing parser
// ============================================================================

describe("parseCoordinates — DMS", () => {
  test("standard DMS: 43°14'20.2\"N 76°53'23.0\"E", () => {
    const result = parseCoordinates("43°14'20.2\"N 76°53'23.0\"E");
    expect(result).not.toBeNull();
    expect(result!.format).toBe("DMS");
    // 43 + 14/60 + 20.2/3600 ≈ 43.238944
    expect(result!.lat).toBeCloseTo(43.2389, 3);
    // 76 + 53/60 + 23.0/3600 ≈ 76.889722
    expect(result!.lng).toBeCloseTo(76.8897, 3);
  });

  test("DMS with spaces: 43° 14' 20.2\" N, 76° 53' 23.0\" E", () => {
    const result = parseCoordinates("43° 14' 20.2\" N, 76° 53' 23.0\" E");
    expect(result).not.toBeNull();
    expect(result!.format).toBe("DMS");
  });

  test("DMS hemisphere prefix: N43°14'20.2\" E76°53'23.0\"", () => {
    const result = parseCoordinates("N43°14'20.2\" E76°53'23.0\"");
    expect(result).not.toBeNull();
    expect(result!.format).toBe("DMS");
  });

  test("DMS southern hemisphere", () => {
    const result = parseCoordinates("43°14'20.2\"S 76°53'23.0\"W");
    expect(result).not.toBeNull();
    expect(result!.lat).toBeLessThan(0);
    expect(result!.lng).toBeLessThan(0);
  });
});

// ============================================================================
// § 4. Yandex Maps URLs — new parser
// ============================================================================

describe("parseCoordinates — Yandex Maps URLs", () => {
  // --- Positive cases ---

  test("pt parameter (placemark) — lng,lat order, Moscow", () => {
    // Moscow: lat=55.751244, lng=37.618423
    // Yandex pt uses lng,lat → 37.618423,55.751244
    const result = parseCoordinates(
      "https://yandex.ru/maps/?pt=37.618423,55.751244&z=15&l=map"
    );
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(55.751244, 5);
    expect(result!.lng).toBeCloseTo(37.618423, 5);
    expect(result!.format).toBe("YANDEX_MAPS");
  });

  test("pt parameter with multiple points — takes first", () => {
    // Saint Petersburg + Moscow — takes SPb
    const result = parseCoordinates(
      "https://yandex.ru/maps/?pt=30.315868,59.939095~37.618423,55.751244&z=12&l=map"
    );
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(59.939095, 5); // SPb lat
    expect(result!.lng).toBeCloseTo(30.315868, 5); // SPb lng
  });

  test("ll parameter (map center) — lng,lat order, Almaty", () => {
    // Almaty: lat=43.238949, lng=76.889709
    const result = parseCoordinates(
      "https://yandex.ru/maps/?ll=76.889709,43.238949&z=12"
    );
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(43.238949, 5);
    expect(result!.lng).toBeCloseTo(76.889709, 5);
    expect(result!.format).toBe("YANDEX_MAPS");
  });

  test("whatshere[point] parameter — lng,lat order", () => {
    // Moscow
    const result = parseCoordinates(
      "https://yandex.ru/maps/?whatshere[point]=37.444076,55.776788&whatshere[zoom]=17"
    );
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(55.776788, 5);
    expect(result!.lng).toBeCloseTo(37.444076, 5);
    expect(result!.format).toBe("YANDEX_MAPS");
  });

  test("whatshere with URL-encoded brackets (%5B %5D)", () => {
    const result = parseCoordinates(
      "https://yandex.ru/maps/?whatshere%5Bpoint%5D=37.444076,55.776788&whatshere%5Bzoom%5D=17"
    );
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(55.776788, 5);
    expect(result!.lng).toBeCloseTo(37.444076, 5);
  });

  test("rtext parameter (route) — lat,lng order (!), takes first waypoint", () => {
    // Route from SPb to Moscow — takes SPb (first waypoint)
    // rtext uses lat,lng — 59.967870,30.242658 means lat=59.967870, lng=30.242658
    const result = parseCoordinates(
      "https://yandex.ru/maps/?rtext=59.967870,30.242658~55.751244,37.618423&rtt=auto"
    );
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(59.967870, 5);
    expect(result!.lng).toBeCloseTo(30.242658, 5);
  });

  test("rtext with empty start (tilde prefix) — takes destination", () => {
    // "~55.733836,37.588134" — empty start, destination only
    const result = parseCoordinates(
      "https://yandex.ru/maps/?rtext=~55.733836,37.588134"
    );
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(55.733836, 5);
    expect(result!.lng).toBeCloseTo(37.588134, 5);
  });

  test("yandex.com domain", () => {
    const result = parseCoordinates(
      "https://yandex.com/maps/?ll=76.889709,43.238949&z=12"
    );
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(43.238949, 5);
  });

  test("yandex.kz domain", () => {
    const result = parseCoordinates(
      "https://yandex.kz/maps/?pt=76.889709,43.238949&z=15"
    );
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(43.238949, 5);
  });

  test("priority: pt over ll", () => {
    // pt=Almaty, ll=Moscow — should take pt (Almaty)
    const result = parseCoordinates(
      "https://yandex.ru/maps/?pt=76.889709,43.238949&ll=37.618423,55.751244&z=12"
    );
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(43.238949, 5); // Almaty
    expect(result!.lng).toBeCloseTo(76.889709, 5);
  });

  // --- Negative cases ---

  test("rejects short link yandex.ru/maps/-/...", () => {
    expect(
      parseCoordinates("https://yandex.ru/maps/-/CCUkr2Hj3A")
    ).toBeNull();
  });

  test("rejects yandex.ru without /maps/ path", () => {
    expect(
      parseCoordinates("https://yandex.ru/search/?text=cafe")
    ).toBeNull();
  });

  test("rejects org link without coordinates", () => {
    // org links don't contain coordinates in URL params
    expect(
      parseCoordinates("https://yandex.ru/maps/org/1184371713")
    ).toBeNull();
  });

  test("rejects non-Yandex URL with ll param", () => {
    expect(
      parseCoordinates("https://example.com/maps/?ll=37.618423,55.751244")
    ).toBeNull();
  });
});

// ============================================================================
// § 5. 2GIS URLs — new parser
// ============================================================================

describe("parseCoordinates — 2GIS URLs", () => {
  // --- Positive cases ---

  test("/geo/ path with city — Moscow, lng,lat order", () => {
    // Moscow: lat=55.751244, lng=37.618423
    // 2GIS /geo/ uses lng,lat → /geo/37.618423,55.751244
    const result = parseCoordinates(
      "https://2gis.ru/moscow/geo/37.618423,55.751244"
    );
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(55.751244, 5);
    expect(result!.lng).toBeCloseTo(37.618423, 5);
    expect(result!.format).toBe("TWOGIS");
  });

  test("/geo/ path with city — Almaty on .kz domain", () => {
    // Almaty: lat=43.238949, lng=76.889709
    const result = parseCoordinates(
      "https://2gis.kz/almaty/geo/76.889709,43.238949"
    );
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(43.238949, 5);
    expect(result!.lng).toBeCloseTo(76.889709, 5);
    expect(result!.format).toBe("TWOGIS");
  });

  test("/geo/ path without city", () => {
    const result = parseCoordinates(
      "https://2gis.ru/geo/37.618423,55.751244"
    );
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(55.751244, 5);
    expect(result!.lng).toBeCloseTo(37.618423, 5);
  });

  test("2gis.com domain", () => {
    const result = parseCoordinates(
      "https://2gis.com/moscow/geo/37.618423,55.751244"
    );
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(55.751244, 5);
  });

  test("/geo/ path with trailing segments", () => {
    // Sometimes 2GIS appends additional path segments
    const result = parseCoordinates(
      "https://2gis.ru/moscow/geo/37.618423,55.751244/routeTab/rsType/bus"
    );
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(55.751244, 5);
    expect(result!.lng).toBeCloseTo(37.618423, 5);
  });

  test("/firm/ link with coordinates in path (URL-encoded comma)", () => {
    // Real-world URL: firm page with %2C encoded comma
    const result = parseCoordinates(
      "https://2gis.kz/almaty/firm/70000001082637794/76.872734%2C43.234182?m=76.872672%2C43.233969%2F18.81"
    );
    expect(result).not.toBeNull();
    // Coordinates from path: lng=76.872734, lat=43.234182 (Almaty)
    expect(result!.lat).toBeCloseTo(43.234182, 5);
    expect(result!.lng).toBeCloseTo(76.872734, 5);
    expect(result!.format).toBe("TWOGIS");
  });

  test("/firm/ link with only m parameter (no coords in path)", () => {
    const result = parseCoordinates(
      "https://2gis.kz/almaty/firm/70000001082637794?m=76.872672%2C43.233969%2F18.81"
    );
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(43.233969, 5);
    expect(result!.lng).toBeCloseTo(76.872672, 5);
  });

  test("m parameter without zoom", () => {
    const result = parseCoordinates(
      "https://2gis.ru/moscow?m=37.618423%2C55.751244"
    );
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(55.751244, 5);
    expect(result!.lng).toBeCloseTo(37.618423, 5);
  });

  test("search page with m parameter", () => {
    const result = parseCoordinates(
      "https://2gis.kz/almaty/search/cafe?m=76.872672%2C43.233969%2F15"
    );
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(43.233969, 5);
    expect(result!.lng).toBeCloseTo(76.872672, 5);
  });

  test("priority: /geo/ over m parameter", () => {
    // /geo/ is more specific than m
    const result = parseCoordinates(
      "https://2gis.ru/moscow/geo/37.618423,55.751244?m=37.999%2C55.999%2F16"
    );
    expect(result).not.toBeNull();
    // Should use /geo/ coordinates, not m
    expect(result!.lat).toBeCloseTo(55.751244, 5);
    expect(result!.lng).toBeCloseTo(37.618423, 5);
  });

  // --- Negative cases ---

  test("rejects /firm/ link without any coordinates", () => {
    expect(
      parseCoordinates("https://2gis.kz/almaty/firm/9429940000848693")
    ).toBeNull();
  });

  test("rejects /directions/ link", () => {
    expect(
      parseCoordinates("https://2gis.ru/moscow/directions")
    ).toBeNull();
  });

  test("rejects city-only link", () => {
    expect(
      parseCoordinates("https://2gis.ru/moscow")
    ).toBeNull();
  });

  test("rejects non-2GIS URL with /geo/ path", () => {
    expect(
      parseCoordinates("https://example.com/geo/37.618423,55.751244")
    ).toBeNull();
  });
});

// ============================================================================
// § 6. Cross-service lng/lat swap validation
// Uses real city coordinates where incorrect swap would pass validateCoordinates
// but produce a wrong location (both values within valid ranges)
// ============================================================================

describe("parseCoordinates — lng/lat swap safety", () => {
  // Moscow: lat=55.751244, lng=37.618423
  // If swapped incorrectly: lat=37.618423 (valid!), lng=55.751244 (valid!)
  // → would silently point to Iran instead of Moscow

  test("Yandex pt — Moscow coordinates not swapped", () => {
    const result = parseCoordinates(
      "https://yandex.ru/maps/?pt=37.618423,55.751244&z=15"
    );
    expect(result).not.toBeNull();
    // lat should be ~55 (Moscow), NOT ~37
    expect(result!.lat).toBeGreaterThan(50);
    expect(result!.lat).toBeLessThan(60);
    // lng should be ~37 (Moscow), NOT ~55
    expect(result!.lng).toBeGreaterThan(30);
    expect(result!.lng).toBeLessThan(45);
  });

  test("Yandex ll — SPb coordinates not swapped", () => {
    // SPb: lat=59.939095, lng=30.315868
    const result = parseCoordinates(
      "https://yandex.ru/maps/?ll=30.315868,59.939095&z=12"
    );
    expect(result).not.toBeNull();
    expect(result!.lat).toBeGreaterThan(55);
    expect(result!.lat).toBeLessThan(65);
    expect(result!.lng).toBeGreaterThan(25);
    expect(result!.lng).toBeLessThan(35);
  });

  test("2GIS /firm/ — Almaty coordinates not swapped", () => {
    // Almaty: lat=43.234, lng=76.873
    const result = parseCoordinates(
      "https://2gis.kz/almaty/firm/70000001082637794/76.872734%2C43.234182?m=76.872672%2C43.233969%2F18.81"
    );
    expect(result).not.toBeNull();
    // lat should be ~43 (Almaty), NOT ~76
    expect(result!.lat).toBeGreaterThan(40);
    expect(result!.lat).toBeLessThan(50);
    // lng should be ~76 (Almaty), NOT ~43
    expect(result!.lng).toBeGreaterThan(70);
    expect(result!.lng).toBeLessThan(80);
  });

  test("2GIS /geo/ — Moscow coordinates not swapped", () => {
    const result = parseCoordinates(
      "https://2gis.ru/moscow/geo/37.618423,55.751244"
    );
    expect(result).not.toBeNull();
    expect(result!.lat).toBeGreaterThan(50);
    expect(result!.lat).toBeLessThan(60);
    expect(result!.lng).toBeGreaterThan(30);
    expect(result!.lng).toBeLessThan(45);
  });

  test("Yandex rtext — route uses lat,lng (no swap needed)", () => {
    // rtext is lat,lng — so lat=59.967870 should be lat
    const result = parseCoordinates(
      "https://yandex.ru/maps/?rtext=59.967870,30.242658~55.751244,37.618423"
    );
    expect(result).not.toBeNull();
    expect(result!.lat).toBeGreaterThan(55);
    expect(result!.lat).toBeLessThan(65);
    expect(result!.lng).toBeGreaterThan(25);
    expect(result!.lng).toBeLessThan(35);
  });

  test("Google Maps — uses lat,lng natively (sanity check)", () => {
    const result = parseCoordinates(
      "https://www.google.com/maps?q=55.751244,37.618423"
    );
    expect(result).not.toBeNull();
    expect(result!.lat).toBeGreaterThan(50);
    expect(result!.lat).toBeLessThan(60);
  });
});

// ============================================================================
// § 7. isShortMapLink (generalized)
// ============================================================================

describe("isShortMapLink", () => {
  test("detects Google goo.gl short link", () => {
    expect(isShortMapLink("https://goo.gl/maps/abc123")).toBe(true);
  });

  test("detects Google maps.app.goo.gl short link", () => {
    expect(isShortMapLink("https://maps.app.goo.gl/abc123")).toBe(true);
  });

  test("detects Yandex short link /maps/-/...", () => {
    expect(isShortMapLink("https://yandex.ru/maps/-/CCUkr2Hj3A")).toBe(true);
  });

  test("rejects regular Yandex Maps URL", () => {
    expect(
      isShortMapLink("https://yandex.ru/maps/?pt=37.618423,55.751244")
    ).toBe(false);
  });

  test("rejects regular Google Maps URL", () => {
    expect(
      isShortMapLink("https://www.google.com/maps?q=43,76")
    ).toBe(false);
  });

  test("rejects 2GIS URL", () => {
    expect(
      isShortMapLink("https://2gis.ru/moscow/geo/37.618423,55.751244")
    ).toBe(false);
  });

  test("rejects non-URL string", () => {
    expect(isShortMapLink("43.238949, 76.889709")).toBe(false);
  });

  test("backward compat: isShortGoogleMapsLink alias works", () => {
    expect(isShortGoogleMapsLink("https://goo.gl/maps/abc123")).toBe(true);
    expect(isShortGoogleMapsLink("https://yandex.ru/maps/-/CCUkr2Hj3A")).toBe(true);
  });
});

// ============================================================================
// § 8. Utility functions
// ============================================================================

describe("validateCoordinates", () => {
  test("valid coordinates", () => {
    expect(validateCoordinates(43.238949, 76.889709)).toBe(true);
  });

  test("edge: lat = 90", () => {
    expect(validateCoordinates(90, 0)).toBe(true);
  });

  test("edge: lat = -90", () => {
    expect(validateCoordinates(-90, 0)).toBe(true);
  });

  test("edge: lng = 180", () => {
    expect(validateCoordinates(0, 180)).toBe(true);
  });

  test("edge: lng = -180", () => {
    expect(validateCoordinates(0, -180)).toBe(true);
  });

  test("rejects NaN", () => {
    expect(validateCoordinates(NaN, 76)).toBe(false);
    expect(validateCoordinates(43, NaN)).toBe(false);
  });

  test("rejects Infinity", () => {
    expect(validateCoordinates(Infinity, 76)).toBe(false);
    expect(validateCoordinates(43, -Infinity)).toBe(false);
  });
});

describe("normalizeCoordinates", () => {
  test("formats to 6 decimal places", () => {
    expect(normalizeCoordinates(43.2, 76.8)).toBe("43.200000, 76.800000");
  });

  test("preserves precision up to 6 decimals", () => {
    expect(normalizeCoordinates(43.238949, 76.889709)).toBe(
      "43.238949, 76.889709"
    );
  });
});

describe("isShortGoogleMapsLink", () => {
  test("detects goo.gl short link", () => {
    expect(isShortGoogleMapsLink("https://goo.gl/maps/abc123")).toBe(true);
  });

  test("detects maps.app.goo.gl short link", () => {
    expect(isShortGoogleMapsLink("https://maps.app.goo.gl/abc123")).toBe(true);
  });

  test("rejects regular Google Maps URL", () => {
    expect(
      isShortGoogleMapsLink("https://www.google.com/maps?q=43,76")
    ).toBe(false);
  });

  test("rejects non-URL string", () => {
    expect(isShortGoogleMapsLink("43.238949, 76.889709")).toBe(false);
  });
});

describe("generateNavigationUrls", () => {
  test("generates correct URLs for all services", () => {
    const urls = generateNavigationUrls(43.238949, 76.889709);
    expect(urls.googleMaps).toContain("43.238949,76.889709");
    expect(urls.appleMaps).toContain("43.238949,76.889709");
    // Yandex uses lng,lat order
    expect(urls.yandexMaps).toContain("76.889709,43.238949");
    // 2GIS uses lng,lat order
    expect(urls.twogis).toContain("76.889709,43.238949");
  });
});
