/**
 * Paywall UI Suppression Tests
 *
 * Validates UX_CONTRACT_PAYWALL_SOFT_BETA_STRICT.md compliance:
 * - SOFT_BETA_STRICT: HARD paywall options (pricing/subscriptions)
 *   MUST NOT exist in the normalized UI config.
 * - HARD mode: pricing options MUST be rendered as before.
 *
 * Test framework: Jest (existing)
 * Environment: node (pure logic, no DOM)
 */

import {
  getPaywallUiConfig,
  BETA_PAYWALL_COPY,
  REASON_CONFIG,
} from "@/lib/billing/ui/reasonMapping";
import type {
  PaywallDetails,
  PaywallOptionParsed,
} from "@/lib/billing/ui/types";

// ============================================================================
// Fixtures
// ============================================================================

/** SOFT_BETA_STRICT payload: backend sends BETA_CONTINUE + HARD options */
function makeBetaPaywallDetails(
  overrides?: Partial<PaywallDetails>
): PaywallDetails {
  return {
    reason: "PUBLISH_REQUIRES_PAYMENT",
    currentPlanId: null,
    meta: { requestedParticipants: 50, freeLimit: 15 },
    options: [
      { type: "BETA_CONTINUE" },
      {
        type: "ONE_OFF_CREDIT",
        productCode: "EVENT_UPGRADE_500",
        price: 5000,
        currencyCode: "KZT",
        provider: "kaspi",
      },
      {
        type: "CLUB_ACCESS",
        recommendedPlanId: "club_50",
      },
    ],
    ...overrides,
  };
}

/** HARD mode payload: only pricing options, no BETA_CONTINUE */
function makeHardPaywallDetails(
  overrides?: Partial<PaywallDetails>
): PaywallDetails {
  return {
    reason: "PUBLISH_REQUIRES_PAYMENT",
    currentPlanId: null,
    meta: { requestedParticipants: 50 },
    options: [
      {
        type: "ONE_OFF_CREDIT",
        productCode: "EVENT_UPGRADE_500",
        price: 5000,
        currencyCode: "KZT",
        provider: "kaspi",
      },
      {
        type: "CLUB_ACCESS",
        recommendedPlanId: "club_50",
      },
    ],
    ...overrides,
  };
}

/** HARD option types that MUST be absent in SOFT_BETA_STRICT */
const HARD_OPTION_TYPES: PaywallOptionParsed["type"][] = [
  "ONE_OFF_CREDIT",
  "CLUB_ACCESS",
];

// ============================================================================
// TEST 1 — SOFT_BETA_STRICT UI suppression
// ============================================================================

describe("TEST 1 — SOFT_BETA_STRICT UI suppression", () => {
  it("should set isBetaContinue=true when BETA_CONTINUE option is present", () => {
    const details = makeBetaPaywallDetails();
    const config = getPaywallUiConfig(details);

    expect(config.isBetaContinue).toBe(true);
  });

  it("should NOT include ONE_OFF_CREDIT in options", () => {
    const details = makeBetaPaywallDetails();
    const config = getPaywallUiConfig(details);

    const oneOffOptions = config.options.filter(
      (o) => o.type === "ONE_OFF_CREDIT"
    );
    expect(oneOffOptions).toHaveLength(0);
  });

  it("should NOT include CLUB_ACCESS in options", () => {
    const details = makeBetaPaywallDetails();
    const config = getPaywallUiConfig(details);

    const clubOptions = config.options.filter(
      (o) => o.type === "CLUB_ACCESS"
    );
    expect(clubOptions).toHaveLength(0);
  });

  it("should contain ONLY BETA_CONTINUE in options array", () => {
    const details = makeBetaPaywallDetails();
    const config = getPaywallUiConfig(details);

    expect(config.options.length).toBeGreaterThan(0);
    for (const option of config.options) {
      expect(option.type).toBe("BETA_CONTINUE");
    }
  });

  it("should suppress HARD options even when backend sends all three types", () => {
    const details = makeBetaPaywallDetails({
      options: [
        { type: "ONE_OFF_CREDIT", productCode: "X", price: 1000 },
        { type: "CLUB_ACCESS", recommendedPlanId: "club_500" },
        { type: "BETA_CONTINUE" },
      ],
    });
    const config = getPaywallUiConfig(details);

    const hardOptions = config.options.filter((o) =>
      HARD_OPTION_TYPES.includes(o.type)
    );
    expect(hardOptions).toHaveLength(0);
    expect(config.options).toHaveLength(1);
    expect(config.options[0].type).toBe("BETA_CONTINUE");
  });

  it("should NOT have a secondaryCta (no pricing navigation)", () => {
    const details = makeBetaPaywallDetails();
    const config = getPaywallUiConfig(details);

    expect(config.secondaryCta).toBeUndefined();
  });

  it("should use beta-specific title from BETA_PAYWALL_COPY", () => {
    const details = makeBetaPaywallDetails();
    const config = getPaywallUiConfig(details);

    expect(config.title).toBe(BETA_PAYWALL_COPY.title);
  });

  it("should substitute {N} in beta message with requestedParticipants", () => {
    const details = makeBetaPaywallDetails({
      meta: { requestedParticipants: 100, freeLimit: 15 },
    });
    const config = getPaywallUiConfig(details);

    expect(config.message).toContain("100");
    expect(config.message).not.toContain("{N}");
  });
});

// ============================================================================
// TEST 2 — HARD mode regression guard
// ============================================================================

describe("TEST 2 — HARD mode regression guard", () => {
  it("should set isBetaContinue=false when no BETA_CONTINUE option", () => {
    const details = makeHardPaywallDetails();
    const config = getPaywallUiConfig(details);

    expect(config.isBetaContinue).toBe(false);
  });

  it("should preserve ONE_OFF_CREDIT options in HARD mode", () => {
    const details = makeHardPaywallDetails();
    const config = getPaywallUiConfig(details);

    const oneOff = config.options.filter((o) => o.type === "ONE_OFF_CREDIT");
    expect(oneOff.length).toBeGreaterThan(0);
  });

  it("should preserve CLUB_ACCESS options in HARD mode", () => {
    const details = makeHardPaywallDetails();
    const config = getPaywallUiConfig(details);

    const club = config.options.filter((o) => o.type === "CLUB_ACCESS");
    expect(club.length).toBeGreaterThan(0);
  });

  it("should NOT render beta_continue action in HARD mode", () => {
    const details = makeHardPaywallDetails();
    const config = getPaywallUiConfig(details);

    expect(config.primaryCta.action).not.toBe("beta_continue");
    expect(config.isBetaContinue).toBe(false);
  });

  it("should NOT include BETA_CONTINUE in options in HARD mode", () => {
    const details = makeHardPaywallDetails();
    const config = getPaywallUiConfig(details);

    const beta = config.options.filter((o) => o.type === "BETA_CONTINUE");
    expect(beta).toHaveLength(0);
  });

  it("should use reason-specific title (not beta title)", () => {
    const details = makeHardPaywallDetails();
    const config = getPaywallUiConfig(details);

    expect(config.title).not.toBe(BETA_PAYWALL_COPY.title);
    expect(config.title).toBe(
      REASON_CONFIG["PUBLISH_REQUIRES_PAYMENT"].title
    );
  });

  it("should have pricing-related primaryCta in HARD mode", () => {
    const details = makeHardPaywallDetails();
    const config = getPaywallUiConfig(details);

    // Primary CTA should be "purchase" (ONE_OFF_CREDIT is first option)
    expect(["pricing", "purchase", "club_create"]).toContain(
      config.primaryCta.action
    );
  });

  it("should preserve secondaryCta in HARD mode for PUBLISH_REQUIRES_PAYMENT", () => {
    const details = makeHardPaywallDetails();
    const config = getPaywallUiConfig(details);

    // PUBLISH_REQUIRES_PAYMENT has secondaryCta "Создать клуб"
    expect(config.secondaryCta).toBeDefined();
  });
});

// ============================================================================
// TEST 3 — Semantic action validation
// ============================================================================

describe("TEST 3 — Semantic action validation (SOFT_BETA_STRICT)", () => {
  it("primaryCta.action MUST be 'beta_continue'", () => {
    const details = makeBetaPaywallDetails();
    const config = getPaywallUiConfig(details);

    expect(config.primaryCta.action).toBe("beta_continue");
  });

  it("primaryCta.label MUST match BETA_PAYWALL_COPY.primaryCta", () => {
    const details = makeBetaPaywallDetails();
    const config = getPaywallUiConfig(details);

    expect(config.primaryCta.label).toBe(BETA_PAYWALL_COPY.primaryCta);
  });

  it("no pricing-related actions should exist in config", () => {
    const details = makeBetaPaywallDetails();
    const config = getPaywallUiConfig(details);

    // Primary action must not be pricing-related
    expect(config.primaryCta.action).not.toBe("pricing");
    expect(config.primaryCta.action).not.toBe("purchase");
    expect(config.primaryCta.action).not.toBe("club_create");

    // No secondary CTA at all
    expect(config.secondaryCta).toBeUndefined();

    // No pricing href
    expect(config.primaryCta.href).toBeUndefined();
  });

  it("options should not contain any pricing-related data", () => {
    const details = makeBetaPaywallDetails();
    const config = getPaywallUiConfig(details);

    for (const option of config.options) {
      expect(option.type).not.toBe("ONE_OFF_CREDIT");
      expect(option.type).not.toBe("CLUB_ACCESS");
      expect(option.productCode).toBeUndefined();
      expect(option.price).toBeUndefined();
      expect(option.recommendedPlanId).toBeUndefined();
    }
  });
});

// ============================================================================
// TEST 4 — Structure assertion (data model proof)
// ============================================================================

describe("TEST 4 — Structure assertion: HARD options absent in SOFT_BETA_STRICT", () => {
  it("full config snapshot should not contain HARD option artifacts", () => {
    const details = makeBetaPaywallDetails({
      options: [
        {
          type: "ONE_OFF_CREDIT",
          productCode: "EVENT_UPGRADE_500",
          price: 5000,
          currencyCode: "KZT",
          provider: "kaspi",
        },
        {
          type: "CLUB_ACCESS",
          recommendedPlanId: "club_500",
          requiredPlanId: "club_500",
        },
        { type: "BETA_CONTINUE" },
      ],
    });
    const config = getPaywallUiConfig(details);

    // Serialize to JSON to prove no HARD data leaks anywhere
    const serialized = JSON.stringify(config);

    // HARD option type strings must not appear
    expect(serialized).not.toContain('"ONE_OFF_CREDIT"');
    expect(serialized).not.toContain('"CLUB_ACCESS"');

    // Pricing-related data must not appear
    expect(serialized).not.toContain("EVENT_UPGRADE_500");
    expect(serialized).not.toContain("5000");
    expect(serialized).not.toContain("kaspi");
    expect(serialized).not.toContain("club_500");
    expect(serialized).not.toContain("club_50");

    // Beta data MUST be present
    expect(serialized).toContain('"BETA_CONTINUE"');
    expect(serialized).toContain('"beta_continue"');
    expect(serialized).toContain('"isBetaContinue":true');
  });

  it("options array should have exactly 1 element of type BETA_CONTINUE", () => {
    const details = makeBetaPaywallDetails();
    const config = getPaywallUiConfig(details);

    expect(config.options).toEqual([{ type: "BETA_CONTINUE" }]);
  });

  it("HARD mode config should NOT contain beta artifacts", () => {
    const details = makeHardPaywallDetails();
    const config = getPaywallUiConfig(details);

    const serialized = JSON.stringify(config);

    expect(serialized).not.toContain('"BETA_CONTINUE"');
    expect(serialized).not.toContain('"beta_continue"');
    expect(config.isBetaContinue).toBe(false);
  });

  it("should handle edge case: BETA_CONTINUE as the only option", () => {
    const details: PaywallDetails = {
      reason: "PUBLISH_REQUIRES_PAYMENT",
      currentPlanId: null,
      meta: { requestedParticipants: 30 },
      options: [{ type: "BETA_CONTINUE" }],
    };
    const config = getPaywallUiConfig(details);

    expect(config.isBetaContinue).toBe(true);
    expect(config.options).toHaveLength(1);
    expect(config.options[0].type).toBe("BETA_CONTINUE");
    expect(config.primaryCta.action).toBe("beta_continue");
  });

  it("should handle edge case: empty options array (no BETA_CONTINUE)", () => {
    const details: PaywallDetails = {
      reason: "PUBLISH_REQUIRES_PAYMENT",
      currentPlanId: null,
      meta: { requestedParticipants: 30 },
      options: [],
    };
    const config = getPaywallUiConfig(details);

    expect(config.isBetaContinue).toBe(false);
    // Fallback to HARD mode with default CTA
    expect(config.primaryCta.action).not.toBe("beta_continue");
  });

  it("should handle edge case: undefined options (legacy payload)", () => {
    const details: PaywallDetails = {
      reason: "PUBLISH_REQUIRES_PAYMENT",
      currentPlanId: null,
      meta: { requestedParticipants: 30 },
    };
    const config = getPaywallUiConfig(details);

    expect(config.isBetaContinue).toBe(false);
    expect(config.primaryCta.action).not.toBe("beta_continue");
  });
});
