# Project Structure

This document provides a detailed, file-by-file breakdown of the project structure.

## Root Directory

-   `.gitignore`: Specifies intentionally untracked files to ignore.
-   `.tsconfigignore`: Specifies files to ignore for TypeScript compilation.
-   `apply_migrations.sh`: Script for applying database migrations.
-   `build-stage3.log`: Log file for the build process.
-   `CLUBS_DOMAIN_AUDIT_REPORT.md`: Audit report for the clubs domain.
-   `components.json`: Configuration for UI components.
-   `eslint.config.mjs`: Configuration for ESLint.
-   `jest.config.js`: Configuration for Jest testing framework.
-   `jest.setup.js`: Setup file for Jest.
-   `migration_output.log`: Log file for database migrations.
-   `next.config.ts`: Configuration for Next.js.
-   `package-lock.json`: Records the exact version of each dependency.
-   `package.json`: Lists project dependencies and scripts.
-   `playwright.config.ts`: Configuration for Playwright E2E testing.
-   `postcss.config.mjs`: Configuration for PostCSS.
-   `PROJECT_STRUCTURE.md`: This file.
-   `QUICK_START.md`: Quick start guide for new developers.
-   `README.md`: Main project README file.

## Directories

### `.cursor/`

-   Cursor IDE configuration files.

### `.husky/`

-   Git hooks configuration.

### `.swc/`

-   SWC compiler cache and configuration.

### `.temp_old_migrations/`

-   Temporary directory for old database migrations.

### `app/`

-   Next.js app directory structure (likely a mirror of `src/app`).

### `docs/`

-   Project documentation.

### `public/`

-   Static assets.

### `scripts/`

-   `migrate-to-logger.sh`: Script to migrate logging implementation.

### `src/`

-   Main application source code.
    -   `middleware.ts`: Next.js middleware.
    -   `components/`: React components.
        -   `brand-select.tsx`
        -   `error-boundary.tsx`
        -   `multi-brand-select.tsx`
        -   `scroll-restoration-wrapper.tsx`
        -   `user-card.tsx`
        -   `auth/`: Authentication components.
            -   `auth-modal-host.tsx`
            -   `auth-modal-provider.tsx`
            -   `auth-modal.tsx`
            -   `auth-provider.tsx`
            -   `auth-status.tsx`
            -   `login-button.tsx`
            -   `protected-page.tsx`
        -   `billing/`: Billing components.
            -   `credit-badge.tsx`
            -   `credit-confirmation-modal.tsx`
            -   `paywall-modal.tsx`
        -   `clubs/`: Club-related components.
            -   `club-card.tsx`
            -   `club-form.tsx`
            -   `club-members-list.tsx`
            -   `club-subscription-card.tsx`
            -   `create-club-button.tsx`
            -   `create-club-page-content.tsx`
        -   `events/`: Event-related components.
            -   `create-event-button.tsx`
            -   `event-access-badge.tsx`
            -   `event-card-compact.tsx`
            -   `event-card-detailed.tsx`
            -   `event-danger-zone.tsx`
            -   `event-form.tsx`
            -   `event-locations-card.tsx`
            -   `event-registration-control.tsx`
            -   `event-status-badge.tsx`
            -   `events-grid.tsx`
            -   `events-page-client.tsx`
            -   `location-header-item.tsx`
            -   `location-point-display.tsx`
            -   `owner-actions.tsx`
            -   `participant-actions.tsx`
            -   `participant-form.tsx`
            -   `participant-modal.tsx`
            -   `event-form/index.ts`
            -   `locations/`: Event location components.
                -   `location-item.tsx`
                -   `map-preview-modal.tsx`
                -   `navigation-chooser.tsx`
        -   `landing/`: Landing page components.
            -   `hero.tsx`
        -   `layout/`: Layout components.
            -   `header-actions.tsx`
            -   `header-user-section.tsx`
            -   `main-footer-client.tsx`
            -   `main-footer.tsx`
            -   `main-header.tsx`
            -   `mobile-nav.tsx`
            -   `user-menu-items.tsx`
        -   `pricing/`: Pricing components.
            -   `pricing-card-button.tsx`
        -   `profile/`: User profile components.
            -   `notification-settings-form.tsx`
            -   `profile-credits-section.tsx`
            -   `profile-page-client.tsx`
            -   `user-clubs-list.tsx`
            -   `user-plan-card.tsx`
            -   `user-stats-card.tsx`
        -   `ui/`: Generic UI components.
            -   `action-card.tsx`
            -   `alert.tsx`
            -   `avatar.tsx`
            -   `calendar.tsx`
            -   `city-autocomplete.tsx`
            -   `city-select.tsx`
            -   `command.tsx`
            -   `delayed-spinner.tsx`
            -   `dialog.tsx`
            -   `field-card.tsx`
            -   `label.tsx`
            -   `sheet.tsx`
            -   `suspense-wrapper.tsx`
            -   `switch.tsx`
            -   `toaster.tsx`
            -   `tooltip.tsx`
            -   `use-toast.ts`
    -   `hooks/`: React hooks.
        -   `index.ts`
        -   `use-club-data.ts`
        -   `use-club-plan.ts`
        -   `use-clubs-data.ts`
        -   `use-delayed-loading.ts`
        -   `use-events-data.ts`
        -   `use-events-query.ts`
        -   `use-loading-transition.ts`
        -   `use-optimistic-state.ts`
        -   `use-profile-data.ts`
        -   `use-scroll-restoration.ts`
        -   `use-scroll-save.ts`
    -   `lib/`: Core application logic.
        -   `errors.ts`
        -   `mappers.ts`
        -   `utils.ts`
        -   `api/`: API-related utilities.
            -   `response.ts`
        -   `auth/`: Authentication logic.
            -   `cookies.ts`
            -   `currentUser.ts`
            -   `guestSession.ts`
            -   `jwt.ts`
        -   `cache/`: Caching logic.
            -   `staticCache.ts`
        -   `config/`: Application configuration.
            -   `protected-routes.ts`
            -   `rateLimits.ts`
        -   `constants/`: Application constants.
            -   `notificationTypes.ts`
        -   `db/`: Database repositories and client.
            -   `billingCreditsRepo.ts`
            -   `billingPolicyRepo.ts`
            -   `billingProductsRepo.ts`
            -   `billingTransactionsRepo.ts`
            -   `carBrandRepo.ts`
            -   `cityRepo.ts`
            -   `client.ts`
            -   `clubAuditLogRepo.ts`
            -   `clubInviteRepo.ts`
            -   `clubJoinRequestRepo.ts`
            -   `clubMemberRepo.ts`
            -   `clubRepo.ts`
            -   `clubSubscriptionRepo.ts`
            -   `currencyRepo.ts`
            -   `eventAccessRepo.ts`
            -   `eventCategoryRepo.ts`
            -   `eventLocationsRepo.ts`
            -   `eventRepo.ts`
            -   `idempotencyRepo.ts`
            -   `notificationQueueRepo.ts`
            -   `notificationSettingsRepo.ts`
            -   `participantRepo.ts`
            -   `planRepo.ts`
            -   `types.ts`
            -   `userCarRepo.ts`
            -   `userRepo.ts`
            -   `userStatsRepo.ts`
            -   `vehicleTypeRepo.ts`
        -   `errors/`: Custom error classes.
            -   `PaywallError.ts`
        -   `events/`: Event-driven logic.
            -   `auth-events.ts`
        -   `hooks/`: Library-level hooks.
            -   `use-auth-modal.ts`
            -   `use-logout.ts`
            -   `use-protected-action.ts`
        -   `services/`: Business logic services.
            -   `accessControl.ts`
            -   `clubAuditLog.ts`
            -   `clubs.ts`
            -   `creditTransaction.ts`
            -   `eventEntitlements.ts`
            -   `events.ts`
            -   `notifications.ts`
            -   `participants.ts`
            -   `userCars.ts`
            -   `userStats.ts`
            -   `withIdempotency.ts`
            -   `ai/`: AI-related services.
                -   `eventDataResolver.ts`
                -   `openai.ts`
            -   `telegram/`: Telegram integration.
                -   `bot.ts`
                -   `formatters.ts`
        -   `types/`: TypeScript types.
            -   `ai.ts`
            -   `billing.ts`
            -   `city.ts`
            -   `club.ts`
            -   `currency.ts`
            -   `db.ts`
            -   `errors.ts`
            -   `event.ts`
            -   `eventCategory.ts`
            -   `eventLocation.ts`
            -   `notification.ts`
            -   `participant.ts`
            -   `user.ts`
            -   `userCar.ts`
            -   `vehicleType.ts`
        -   `ui/`: UI-related logic.
            -   `actionController.ts`
        -   `utils/`: Utility functions.
            -   `coordinates.ts`
            -   `customFields.ts`
            -   `dates.ts`
            -   `eventCategories.ts`
            -   `eventChanges.ts`
            -   `eventFormatters.ts`
            -   `eventPermissions.ts`
            -   `eventVisibility.ts`
            -   `form-validation.ts`
-   `supabase/`: Supabase configuration and migrations.
-   `tests/`: Test files.
