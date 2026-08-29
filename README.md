# Eventsliner.live — Product & Engineering Plan

This repository is the **product and engineering plan** for Eventsliner.live.

Canonical Git repository: https://github.com/SIDDHARTH-MHC/Live-Eventsliner.git

It is **not** an application yet. No product code has been written. The work here reverse-engineers Dreamcast and the broader event-tech category, then defines the smallest architecture that can eventually compete with enterprise platforms — without copying every feature, and without connecting to Eventsliner Student / Eventsliner.org.

---

## What Eventsliner.live is

Eventsliner.live is a new, independent event technology platform. The long-term goal is a comprehensive system that can run meetups, conferences, workshops, exhibitions, festivals, corporate events, sports events, webinars, and hybrid events on **one core**.

The short-term goal is more precise: **run a real event end-to-end** — publish a branded event page, collect registrations, take payment, issue a QR credential, check people in, and show the organizer what happened.

## What this is not

- Not Eventsliner Student
- Not Eventsliner.org
- Not a Dreamcast clone
- Not a request to start coding features
- Not a plan to build facial recognition, proprietary video, payment processing, or hardware

Dreamcast is the reference competitor because it is the strongest India-first *end-to-end event execution* company. That does not mean Eventsliner should become a hardware-and-ops company. Dreamcast's moat is on-ground execution at mega scale. Eventsliner's opening is **self-serve software** that is India-native and architected so enterprise / on-ground capability can be added later.

## How to read this plan

Start with the executive thesis, then the capability map, then the core platform. Use START HERE only after the plan is approved.

| # | Document | What it answers |
|---|----------|-----------------|
| 0 | [Executive thesis](docs/00-executive-thesis.md) | What Dreamcast actually is, and what Eventsliner should and should not become |
| 1 | [Dreamcast research](docs/01-dreamcast-research.md) | Product offering, positioning, software vs hardware vs ops |
| 2 | [Capability map](docs/02-capability-map.md) | Full Dreamcast-class capability tree with MVP / later / integrate decisions |
| 3 | [Competitive analysis](docs/03-competitive-analysis.md) | Dreamcast, Luma, Eventbrite, Cvent, Bizzabo, Hopin/RC Events, Whova, Airmeet, India peers |
| 4 | [Core platform](docs/04-core-platform.md) | Foundational systems and dependency graph |
| 5 | [Domain & data model](docs/05-domain-model.md) | Entities, fields, relationships, indexes, storage choices |
| 6 | [Users & permissions](docs/06-users-permissions.md) | Roles, journeys, permission matrix |
| 7 | [System & API architecture](docs/07-architecture.md) | Frontend surfaces, backend, infra, APIs |
| 8 | [Registration & payments](docs/08-registration-payments.md) | Registration engine, tickets, Razorpay, refunds |
| 9 | [Check-in & badges](docs/09-checkin-badges.md) | Credentials, QR, scanners, badge/hardware plan |
| 10 | [Website, app, networking, exhibitors](docs/10-experience-surfaces.md) | Event site builder, PWA, matchmaking, exhibitor portal |
| 11 | [Comms, virtual, analytics, security](docs/11-comms-virtual-analytics-security.md) | Communication engine, streaming, analytics, enterprise, security |
| 12 | [Integrations](docs/12-integrations.md) | Build vs buy table, India-first providers |
| 13 | [MVP, roadmap, tickets](docs/13-mvp-roadmap-tickets.md) | Brutally small MVP, phases, epics, implementation tickets |
| 14 | [Prioritization, risks, decisions](docs/14-prioritization-risks-decisions.md) | P0–P3, MUST/SHOULD/LATER/INTEGRATE, risks, open decisions |
| 15 | [START HERE](docs/15-start-here.md) | First 20 engineering tasks after plan approval |

## Product principle

Do not create separate backends for different event types.

```
Event
 ├── Meetup
 ├── Conference
 ├── Workshop
 ├── Exhibition
 ├── Festival
 ├── Corporate Event
 ├── Sports Event
 ├── Webinar
 └── Hybrid Event
```

Event type is configuration and UI, not infrastructure.

## Recommended first architecture (after approval)

A **modular monolith**: Next.js (TypeScript) + PostgreSQL + Redis + object storage + a job queue. One deployable. Bounded modules inside one codebase. No microservices in v1.

Hosting should be India-region first (`ap-south-1` or equivalent) because this product will hold attendee PII.

## Deliverables checklist (plan §29)

| # | Required section | Where |
|---|------------------|-------|
| 1 | Dreamcast capability map | [02](docs/02-capability-map.md), research in [01](docs/01-dreamcast-research.md) |
| 2 | Competitive analysis | [03](docs/03-competitive-analysis.md) |
| 3 | Product architecture | [00](docs/00-executive-thesis.md), [04](docs/04-core-platform.md) |
| 4 | Core domain model | [05](docs/05-domain-model.md) |
| 5 | Database / entity model | [05](docs/05-domain-model.md) |
| 6 | Permission model | [06](docs/06-users-permissions.md) |
| 7 | System architecture | [07](docs/07-architecture.md) |
| 8 | API architecture | [07](docs/07-architecture.md) |
| 9 | User journeys | [06](docs/06-users-permissions.md) |
| 10 | Registration architecture | [08](docs/08-registration-payments.md) |
| 11 | Ticketing / payment architecture | [08](docs/08-registration-payments.md) |
| 12 | Check-in architecture | [09](docs/09-checkin-badges.md) |
| 13 | Communication architecture | [11](docs/11-comms-virtual-analytics-security.md) |
| 14 | Event website architecture | [10](docs/10-experience-surfaces.md) |
| 15 | Event app architecture | [10](docs/10-experience-surfaces.md) |
| 16 | Networking architecture | [10](docs/10-experience-surfaces.md) |
| 17 | Exhibitor architecture | [10](docs/10-experience-surfaces.md) |
| 18 | Virtual / hybrid architecture | [10](docs/10-experience-surfaces.md) |
| 19 | Analytics architecture | [11](docs/11-comms-virtual-analytics-security.md) |
| 20 | Security architecture | [11](docs/11-comms-virtual-analytics-security.md) |
| 21 | Third-party integration strategy | [12](docs/12-integrations.md) |
| 22 | MVP scope | [13](docs/13-mvp-roadmap-tickets.md) |
| 23 | Phased roadmap | [13](docs/13-mvp-roadmap-tickets.md) |
| 24 | Engineering epics | [13](docs/13-mvp-roadmap-tickets.md) |
| 25 | Implementation tickets | [13](docs/13-mvp-roadmap-tickets.md), [15](docs/15-start-here.md) |
| 26 | Feature prioritization | [14](docs/14-prioritization-risks-decisions.md) |
| 27 | Estimated complexity | [14](docs/14-prioritization-risks-decisions.md) |
| 28 | Major technical risks | [14](docs/14-prioritization-risks-decisions.md) |
| 29 | Decisions before coding | [14](docs/14-prioritization-risks-decisions.md), [DECISIONS.md](docs/DECISIONS.md) |
| 30 | Recommended first sprint | [15](docs/15-start-here.md) |

## Status

| Item | Status |
|------|--------|
| Research | Complete |
| Product / engineering plan | Complete |
| Implementation | **Not started — by design** |
| Eventsliner Student / .org connection | Explicitly out of scope |
