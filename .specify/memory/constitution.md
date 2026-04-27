<!--
SYNC IMPACT REPORT
==================
Version change: (placeholder) → 1.0.0
Bump rationale: MAJOR — First concrete constitution; all placeholders resolved, 10 principles defined.

Principles defined:
  I.   Code Quality & Standards        (new)
  II.  Architecture Principles         (new)
  III. UI & Frontend Rules             (new)
  IV.  Testing & Reliability           (new)
  V.   Performance Constraints         (new)
  VI.  Error Handling & Logging        (new)
  VII. Security Rules                  (new)
  VIII.Documentation                   (new)
  IX.  Development Workflow            (new)
  X.   AI & Automation Usage           (new)

Added sections: Quality Gates, Governance
Removed sections: [SECTION_2_NAME], [SECTION_3_NAME] (replaced with concrete sections)

Templates reviewed:
  ✅ .specify/templates/plan-template.md  — Constitution Check gate present; no changes required
  ✅ .specify/templates/spec-template.md  — Requirements/edge-cases sections align with principles
  ✅ .specify/templates/tasks-template.md — Phase categories (setup, foundation, testing) align with principles
  ✅ No command template files found under .specify/templates/commands/

Deferred TODOs: none
-->

# Chat App AI Constitution

## Core Principles

### I. Code Quality & Standards

All code MUST be written in TypeScript with strict typing enabled (`strict: true` in tsconfig).
Use of `any` is PROHIBITED unless explicitly justified with an inline comment explaining
why no alternative exists. Functions MUST be small, single-responsibility, and reusable.
Naming MUST be clear, descriptive, and consistent across the codebase (camelCase for
variables/functions, PascalCase for types/components). Duplicate logic is PROHIBITED;
the DRY principle MUST be enforced at all times.

### II. Architecture Principles

The codebase MUST follow modular, component-based architecture. Each feature MUST be
isolated and independently maintainable. Business logic MUST be separated from UI
components. Unnecessary abstractions are PROHIBITED; prefer simplicity (KISS principle).
Shared logic MUST be extracted into reusable hooks or utilities rather than duplicated
across components.

### III. UI & Frontend Rules

UI components MUST be reusable and composable. Designs MUST be responsive across all
screen sizes. Both LTR and RTL layouts MUST be supported consistently. Accessibility
standards (ARIA roles, semantic HTML) MUST be respected on all interactive elements.
Inline styles MUST NOT be used unless no alternative exists; prefer theme-based styling
via design tokens or a styling system.

### IV. Testing & Reliability (NON-NEGOTIABLE)

Test-driven development (TDD) is the preferred workflow: tests MUST be written before
implementation for all critical logic. No feature is considered complete until all
associated tests pass. Edge cases and error scenarios MUST be covered. Real integration
testing MUST be preferred over mocks wherever feasible. The Red-Green-Refactor cycle
MUST be respected.

### V. Performance Constraints

Pages MUST load efficiently and avoid unnecessary re-renders. Lazy loading and code
splitting MUST be applied wherever they improve time-to-interactive. Images and assets
MUST be optimized before shipping. Heavy computations MUST NOT run on the main thread;
offload to Web Workers or server-side processing as appropriate.

### VI. Error Handling & Logging

Errors MUST NEVER fail silently. Every error MUST surface a meaningful, actionable
message to the operator or user. Centralized error handling MUST be used wherever
possible. All external inputs (API responses, user data, env vars) MUST be strictly
validated and sanitized at system boundaries.

### VII. Security Rules

Secrets and sensitive data MUST NOT be hardcoded in the codebase; use environment
variables or a secrets manager. All user-supplied and external inputs MUST be validated
and sanitized before use. API communication MUST follow secure practices (HTTPS,
authenticated endpoints, CORS policies). Authentication and authorization MUST be
enforced on all protected routes and resources. Code MUST be free from vulnerabilities
outlined in the OWASP Top 10.

### VIII. Documentation

Complex logic MUST be documented with clear, concise inline comments. Key architectural
decisions MUST be recorded in ADRs or equivalent design documents. Public-facing
functions and components MUST include documentation (JSDoc or equivalent) covering
purpose, parameters, return values, and notable side effects.

### IX. Development Workflow

All code MUST pass linting and formatting checks before merging. Pull requests MUST be
reviewed and approved before merge. Changes MUST NOT break existing functionality;
regression tests MUST pass on every PR. Commits MUST be small, clear, and meaningful —
follow Conventional Commits format (feat:, fix:, docs:, refactor:, test:, chore:).

### X. AI & Automation Usage

AI-generated code MUST be reviewed by a human developer before being committed.
All generated code MUST comply with every principle in this constitution. Generated
output MUST NEVER be trusted blindly; validation against requirements and tests is
mandatory before acceptance.

## Quality Gates

The following gates MUST be verified at every pull request:

- TypeScript compilation passes with `strict: true` and zero type errors.
- All unit and integration tests pass (`npm test` or equivalent).
- Linting and formatting checks pass without suppressed warnings.
- No new `any` usages introduced without documented justification.
- No secrets or sensitive values introduced into source files.
- Accessibility audit passes for any UI changes (ARIA, semantic HTML).
- Bundle size and performance budget checks pass where configured.

## Governance

This constitution supersedes all other informal practices or conventions in this
repository. Any amendment MUST:

1. Be proposed via a pull request that edits this file directly.
2. Document the rationale for the change.
3. Increment the version according to semantic versioning rules:
   - **MAJOR**: Backward-incompatible governance change, principle removal, or
     redefinition that invalidates existing code.
   - **MINOR**: New principle or section added, or material expansion of guidance.
   - **PATCH**: Clarifications, wording improvements, or non-semantic refinements.
4. Update `Last Amended` to the date of merge.
5. Propagate necessary changes to all dependent templates under `.specify/templates/`.

All contributors MUST verify compliance with this constitution during code review.
Complexity deviations MUST be explicitly justified. The plan-template's Constitution
Check gate MUST reference the principles most relevant to each feature.

**Version**: 1.0.0 | **Ratified**: 2026-04-26 | **Last Amended**: 2026-04-26
