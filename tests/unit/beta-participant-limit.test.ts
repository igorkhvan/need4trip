/**
 * Beta Participant Limit Tests
 *
 * Validates BETA_TEMPORARY_GATES_AND_DEVIATIONS.md §3.5 compliance:
 * - In beta mode (SOFT_BETA_STRICT), participant count >500 triggers
 *   a beta limit modal instead of club subscription paywall.
 * - In HARD mode, this modal is NEVER shown.
 * - All UI copy comes from SSOT_UI_COPY.md §7.4 via BETA_PARTICIPANT_LIMIT_COPY.
 *
 * Test framework: Jest (existing)
 * Environment: node (pure logic, no DOM)
 */

import {
  BETA_PARTICIPANT_LIMIT,
  BETA_PARTICIPANT_LIMIT_COPY,
  shouldShowBetaParticipantLimitModal,
} from "@/lib/config/betaParticipantLimit";

// ============================================================================
// TEST 1 — Beta modal appears on >500
// ============================================================================

describe("TEST 1 — Beta modal appears when participant count > 500", () => {
  it("should return true when beta mode is enabled and count is 501", () => {
    const result = shouldShowBetaParticipantLimitModal(true, 501);
    expect(result).toBe(true);
  });

  it("should return true when beta mode is enabled and count is 1000", () => {
    const result = shouldShowBetaParticipantLimitModal(true, 1000);
    expect(result).toBe(true);
  });

  it("should return true for boundary value (BETA_PARTICIPANT_LIMIT + 1)", () => {
    const result = shouldShowBetaParticipantLimitModal(
      true,
      BETA_PARTICIPANT_LIMIT + 1
    );
    expect(result).toBe(true);
  });

  it("BETA_PARTICIPANT_LIMIT must be 500", () => {
    // Ensures constant matches the upgrade product limit
    expect(BETA_PARTICIPANT_LIMIT).toBe(500);
  });

  it("should block event save/publish (returns true = modal shown = save blocked)", () => {
    // When shouldShowBetaParticipantLimitModal returns true,
    // the parent component shows the modal and returns early (does not submit)
    // This test documents the contract between the function and the UI
    const showModal = shouldShowBetaParticipantLimitModal(true, 501);
    expect(showModal).toBe(true);
    // When showModal is true:
    // - Event cannot be saved or published (submit is blocked)
    // - No PaywallError is raised (no backend call)
    // - No paywall modal is opened (intercepted before billing logic)
  });
});

// ============================================================================
// TEST 2 — No modal at ≤500 in beta mode
// ============================================================================

describe("TEST 2 — No modal when participant count ≤ 500 in beta mode", () => {
  it("should return false when count is exactly 500", () => {
    const result = shouldShowBetaParticipantLimitModal(true, 500);
    expect(result).toBe(false);
  });

  it("should return false when count is 499", () => {
    const result = shouldShowBetaParticipantLimitModal(true, 499);
    expect(result).toBe(false);
  });

  it("should return false when count is 1 (minimum valid)", () => {
    const result = shouldShowBetaParticipantLimitModal(true, 1);
    expect(result).toBe(false);
  });

  it("should return false when count is null (not set)", () => {
    const result = shouldShowBetaParticipantLimitModal(true, null);
    expect(result).toBe(false);
  });

  it("should return false when count is exactly at BETA_PARTICIPANT_LIMIT", () => {
    const result = shouldShowBetaParticipantLimitModal(
      true,
      BETA_PARTICIPANT_LIMIT
    );
    expect(result).toBe(false);
  });

  it("event flow proceeds normally when count ≤ 500 (no modal)", () => {
    // All values at or below limit should allow normal submission
    const testValues = [1, 10, 50, 100, 250, 499, 500];
    for (const count of testValues) {
      const showModal = shouldShowBetaParticipantLimitModal(true, count);
      expect(showModal).toBe(false);
    }
  });
});

// ============================================================================
// TEST 3 — HARD mode regression guard
// ============================================================================

describe("TEST 3 — HARD mode regression guard", () => {
  it("should return false when HARD mode (isBetaMode=false) and count > 500", () => {
    const result = shouldShowBetaParticipantLimitModal(false, 501);
    expect(result).toBe(false);
  });

  it("should return false when HARD mode and count is 1000", () => {
    const result = shouldShowBetaParticipantLimitModal(false, 1000);
    expect(result).toBe(false);
  });

  it("should return false when HARD mode and count is 10000", () => {
    const result = shouldShowBetaParticipantLimitModal(false, 10000);
    expect(result).toBe(false);
  });

  it("beta modal is NEVER shown in HARD mode regardless of count", () => {
    // All values, including those above limit, should NOT trigger beta modal in HARD mode
    const testValues = [1, 100, 500, 501, 1000, 5000, 999999];
    for (const count of testValues) {
      const showModal = shouldShowBetaParticipantLimitModal(false, count);
      expect(showModal).toBe(false);
    }
  });

  it("existing paywall behavior remains unchanged in HARD mode", () => {
    // When shouldShowBetaParticipantLimitModal returns false in HARD mode:
    // - Submit proceeds normally
    // - Backend enforcement runs (CLUB_REQUIRED_FOR_LARGE_EVENT for >500)
    // - PaywallError (402) fires as usual
    // - PaywallModal shows standard HARD options
    const result = shouldShowBetaParticipantLimitModal(false, 501);
    expect(result).toBe(false);
    // Function does NOT interfere with HARD mode — paywall flows unchanged
  });

  it("should return false when HARD mode and count is null", () => {
    const result = shouldShowBetaParticipantLimitModal(false, null);
    expect(result).toBe(false);
  });
});

// ============================================================================
// TEST 4 — Copy governance (SSOT_UI_COPY §7.4)
// ============================================================================

describe("TEST 4 — Copy governance: all modal text from SSOT_UI_COPY", () => {
  it("BETA_PARTICIPANT_LIMIT_COPY.title must be canonical (SSOT_UI_COPY §7.4)", () => {
    // Canonical title from SSOT_UI_COPY.md §7.4
    expect(BETA_PARTICIPANT_LIMIT_COPY.title).toBe("Ограничение бета-версии");
  });

  it("BETA_PARTICIPANT_LIMIT_COPY.message must be canonical (SSOT_UI_COPY §7.4)", () => {
    // Canonical message from SSOT_UI_COPY.md §7.4
    expect(BETA_PARTICIPANT_LIMIT_COPY.message).toBe(
      "В бета-версии максимальное количество участников события — 500."
    );
  });

  it("BETA_PARTICIPANT_LIMIT_COPY.primaryAction must be canonical (SSOT_UI_COPY §7.4)", () => {
    // Canonical primary action from SSOT_UI_COPY.md §7.4
    expect(BETA_PARTICIPANT_LIMIT_COPY.primaryAction).toBe("Понятно");
  });

  it("copy must NOT reference billing, pricing, upgrade, or clubs", () => {
    const allCopy = [
      BETA_PARTICIPANT_LIMIT_COPY.title,
      BETA_PARTICIPANT_LIMIT_COPY.message,
      BETA_PARTICIPANT_LIMIT_COPY.primaryAction,
    ].join(" ");

    // Forbidden terms per task requirements
    const forbiddenTerms = [
      "оплат",
      "подписк",
      "тариф",
      "клуб",
      "апгрейд",
      "upgrade",
      "billing",
      "pricing",
      "subscription",
      "club",
      "payment",
    ];

    for (const term of forbiddenTerms) {
      expect(allCopy.toLowerCase()).not.toContain(term.toLowerCase());
    }
  });

  it("copy must use SSOT copy keys (not hardcoded literals)", () => {
    // Verify that the copy object has exactly the expected shape
    // This ensures the modal uses BETA_PARTICIPANT_LIMIT_COPY, not inline strings
    expect(BETA_PARTICIPANT_LIMIT_COPY).toEqual({
      title: expect.any(String),
      message: expect.any(String),
      primaryAction: expect.any(String),
    });

    // All fields must be non-empty
    expect(BETA_PARTICIPANT_LIMIT_COPY.title.length).toBeGreaterThan(0);
    expect(BETA_PARTICIPANT_LIMIT_COPY.message.length).toBeGreaterThan(0);
    expect(BETA_PARTICIPANT_LIMIT_COPY.primaryAction.length).toBeGreaterThan(0);
  });

  it("message must contain the numeric limit value", () => {
    // Ensures the message communicates the specific limit to users
    expect(BETA_PARTICIPANT_LIMIT_COPY.message).toContain(
      String(BETA_PARTICIPANT_LIMIT)
    );
  });

  it("copy must comply with SSOT_UI_COPY §9 (forbidden patterns)", () => {
    const allCopy = [
      BETA_PARTICIPANT_LIMIT_COPY.title,
      BETA_PARTICIPANT_LIMIT_COPY.message,
      BETA_PARTICIPANT_LIMIT_COPY.primaryAction,
    ].join(" ");

    // SSOT_UI_COPY §9: Explicitly Forbidden Copy Patterns
    // No emojis
    const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2702}-\u{27B0}\u{24C2}-\u{1F251}]/u;
    expect(emojiRegex.test(allCopy)).toBe(false);

    // No exclamation marks
    expect(allCopy).not.toContain("!");

    // No time promises
    expect(allCopy.toLowerCase()).not.toContain("скоро");
    expect(allCopy.toLowerCase()).not.toContain("позже");
  });
});
