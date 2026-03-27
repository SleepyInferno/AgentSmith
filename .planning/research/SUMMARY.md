# Research Summary

## Stack

Use a TypeScript-first internal web stack with a React frontend, Node API, PostgreSQL data layer, and scheduled connector/job workers. Keep Microsoft tenant integrations and backup connectors isolated behind provider-specific services so the application can reason over a stable internal model.

## Table Stakes

- Secure operator sign-in and authorization
- Reliable connector sync visibility
- Actionable prioritized dashboards instead of passive status pages
- Strong audit trails for workflow actions
- Searchable documentation with ownership and review history

## Watch Out For

- Over-automating sensitive tasks before review and audit controls are in place
- Exposing raw provider schemas directly to the UI
- Presenting stale data as trustworthy
- Letting the product balloon into a full RMM/PSA replacement too early

## Build Strategy

Build the shared foundation first, then ship value in this order:
1. Asset health dashboard
2. Onboarding/offboarding automator
3. Network visibility lite
4. Backup confidence dashboard
5. Documentation assistant
