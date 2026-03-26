# AGENTS

## Project Intent

Build an internal web app that helps a solo IT operator monitor endpoint health, automate onboarding and offboarding, audit identity risk, verify backup confidence, and keep documentation useful.

## Working Rules

- Preserve the five-tool v1 scope unless a roadmap update explicitly expands it.
- Favor guided workflows and clear risk queues over broad enterprise-style dashboard sprawl.
- Keep connector-specific logic isolated from internal domain models.
- Treat write actions as high-trust operations that require auditability and clear review UX.

## Near-Term Priorities

1. Foundations and secure tenant data flow
2. Asset health dashboard
3. Lifecycle automation

## Definition of Good

- The app helps a solo admin decide what matters next within a few minutes of opening it.
- Sensitive actions are explicit, reviewable, and logged.
- Each phase produces a usable slice, not just scaffolding.
