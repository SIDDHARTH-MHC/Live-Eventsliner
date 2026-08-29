# 17. Discovery, Event Experience, and the three surfaces

This document is the product definition for **how Eventsliner.live is one Event, three interfaces**. It does **not** authorize building discovery in the first engineering slice. The first 20 tasks ([15-start-here.md](15-start-here.md)) still stop at a published event website. Discovery is a **documented subsystem**, implemented in **Phase 4** after the spine (website → registration → check-in) works.

Related: [00-executive-thesis.md](00-executive-thesis.md), [04-core-platform.md](04-core-platform.md), [05-domain-model.md](05-domain-model.md), [07-architecture.md](07-architecture.md), [10-experience-surfaces.md](10-experience-surfaces.md), [13-mvp-roadmap-tickets.md](13-mvp-roadmap-tickets.md).

---

## 17.1 What Eventsliner.live is (both, not either)

Eventsliner.live is **both**:

| Role | Analogy | What it means here |
|------|---------|-------------------|
| **Public event network / discovery marketplace** | Luma | People find events. Organizers get demand. Cities (Delhi first) have a living inventory. |
| **Event operating system** | Dreamcast | Organizers run the event: branded site, registration, tickets, check-in, later sessions, exhibitors, comms. |

These are **not two products** and **not three backends**. They are three **surfaces** on one **Event** entity.

```
EVENTSLINER.LIVE
       │
┌──────┼──────┐
│      │      │
DISCOVERY   EVENT WEBSITE   EVENT APP
eventsliner.live/discover   /e/:slug   event-specific experience
```

| Surface | URL / home | Job | Same Event? |
|---------|------------|-----|-------------|
| **Discovery** | `/discover` (and later Home / Calendar / Following) | Find events; organizer profiles; city browse | Yes — only **published PUBLIC** events |
| **Event website** | `/e/:slug` | Branded microsite: about, tickets, speakers, venue, register | Yes — the public page for that Event |
| **Event app** | After register, then later universal app, then white-label | Pass, schedule, speakers, exhibitors, networking, notifications | Yes — the in-event experience for that Event |

**Architectural rules (product principles):**

> Every published public event is both an event website and a potential discovery object. Eventsliner.live must treat event discovery as a first-class platform capability, while allowing organizers to opt out through visibility settings.

> Event is the canonical object. Discovery, event website, and event app are interfaces on that object, not separate products.

Do not build website + app + discovery as independent systems, independent event tables, or independent “listing” objects that drift from `events`.

---

## 17.2 Mental model: Event Experience (v1 table stays `event_sites`)

`event_sites` is the **v1 table**. The **concept** is **Event Experience**: the configurable, branded experience that later powers all of:

| Channel | When | Config source |
|---------|------|----------------|
| Event website (`/e/:slug`) | Phase 1 | `event_sites` (theme, sections) |
| Mobile web / PWA | Phase 5 (stage 1) | same Event + experience config |
| Universal Eventsliner app | Stage 2 (after discovery exists) | same Event; shell is the network |
| White-label native app | Stage 3, much later | `event_app_config` / `event_experience` (evolve from `event_sites`) |

**Naming rule**

- **Code/schema v1:** `event_sites` (do not rename the first table).
- **Product language:** Event Experience.
- **Later tables (do not create now):** `event_experience` (canonical rename or 1:1 successor) and `event_app_config` (PWA/native/white-label flags, tab IA, install prompts). They extend the same Event; they are not a second CMS.

The website is not a separate “site product.” The app is not a separate “app product.” Both read the Event + experience config + live operational data (tickets, sessions, credentials).

---

## 17.3 Visibility (domain + product — now, not later)

Visibility is a first-class field on `Event` (`public` | `unlisted` | `private`). It is **not** a discovery-only flag bolted on in Phase 4.

| Value | Who can open `/e/:slug` | In marketplace / `/discover` / search / browse | Typical use |
|-------|-------------------------|-----------------------------------------------|-------------|
| **PUBLIC** | Anyone | **Yes**, once `status = published` | Meetups, paid workshops, public conferences in Delhi and other cities |
| **UNLISTED** | Anyone with the link | **No** | Soft-launch, waitlist before announce, “share with this WhatsApp group only” |
| **PRIVATE** | Invite / permission only | **No** | Corporate, invite-only, internal |

**Publish vs discoverability**

```
Event
  → status: draft | published | …
  → visibility: public | unlisted | private

published + PUBLIC     → event website AND discovery object
published + UNLISTED   → event website (link), not inventory
published + PRIVATE    → gated website, not inventory
draft                  → organizer preview only; not a website for the world; not discovery
```

Every **published PUBLIC** event is both an event website **and** a potential discovery object. Organizers **opt out** of the network by setting UNLISTED or PRIVATE. They do not get a second “submit to marketplace” product.

Default visibility is an open decision: [D16](DECISIONS.md). City-first discovery (India, Delhi example) is [D17](DECISIONS.md).

Corporate event type may **default** modules toward unlisted/private (see [04-core-platform.md](04-core-platform.md)); that is configuration, not a second Event type backend.

---

## 17.4 Flywheel

```
more organizers
    → more events (on one Event entity)
        → more PUBLIC published inventory
            → more discovery (search + city browse)
                → more attendees
                    → more registrations (and payments)
                        → more operational data (check-in, sessions, comms)
                            → more organizer value (the OS)
                                → more organizers
```

Discovery without a working OS is a listing site with no reason to publish. An OS without discovery is Dreamcast-shaped software that never compounds demand. Eventsliner needs **both**, sequenced: **spine first (Phases 1–3), discovery as the next first-class capability (Phase 4), not as a year-five marketplace rewrite.**

India-first: inventory and browse are **city-shaped** (Delhi, then Bengaluru, Mumbai, …), not a global firehose with no location facet.

---

## 17.5 Discovery engine (subsystem — Phase 4, not MVP, not first 20)

Treat this as a **platform capability** in the domain model and architecture **now**. Do **not** implement `/discover`, a search cluster, or recommendation ranking in Phase 0–3.

### Search (filters — enough at first)

| Facet | Notes |
|-------|--------|
| Keyword | Title, description, organizer name, tags |
| Location | City first (e.g. Delhi, Noida, Gurugram); later neighborhood / geo radius |
| Date | Day, range, this weekend, upcoming |
| Category | Event category / type (workshop, conference, meetup, …) |
| Price | Free, paid, `price_min` band |
| Event type | Same `Event.type` enum — not a parallel taxonomy |

No recommendation AI initially. Search + filter + metadata is enough. “What you may like” is a **later** ranker on the same index, not a new product and not a reason to delay Phase 4.

### Browse rails

Trending · Near you · This weekend · Popular · New · Free · Online

“Near you” and city pages are India-native (Delhi example: events this weekend in Delhi). Online is `attendance_modes` containing virtual, not a separate backend.

### Event card (consumer)

A card is a **projection of Event**, not a listing row in another database:

- Link to the **public event website** (`/e/:slug`)
- Organizer (public profile)
- Sessions (when they exist)
- Tickets (price from, sold-out, free)
- Related events (same city / category / organizer — rules, not ML)

### Consumer IA (eventually — not first 20)

| Tab | Job |
|-----|-----|
| **Home** | Personalized-enough rails later; city + upcoming first |
| **Discover** | Search + browse |
| **Calendar** | Saved / going |
| **My Tickets** | Credentials across events |
| **Following** | Organizers the user follows |

Organizer **public profiles** are part of discovery (who is hosting, their PUBLIC events), not a separate “social network” company. Follow-organizer is **later** (see [06-users-permissions.md](06-users-permissions.md)).

### What discovery is not

- Not a second Event table
- Not Eventbrite SEO as the year-one company
- Not Luma’s social graph copied wholesale
- Not an AI feed
- Not in the first 20 engineering tasks

---

## 17.6 Event website (Dreamcast microsite)

Branded page at **`/e/:slug`**. Not a generic Eventsliner skin. Organizers should feel they have **their** event site (D6: small “Powered by” at most).

**Config (experience, v1 on `event_sites`):** logo, branding, about, speakers, schedule, sponsors, exhibitors, venue, FAQ, register, tickets. Later: streaming, networking, SEO, social, custom domain.

`GET /e/:slug` (START HERE task 18) **is this website**. It is **not** the discovery homepage. A published PUBLIC event **will** appear in discovery **once Phase 4 exists**; the public page itself does not wait on the marketplace.

Full website builder staging: [10-experience-surfaces.md](10-experience-surfaces.md).

---

## 17.7 Event app (staged — do not explode scope)

Users should **not** download 15 event apps. Dreamcast-style white-label is a **late** enterprise motion.

| Stage | What | When |
|-------|------|------|
| **1. Event PWA after register** | Add to home screen. My Pass, Schedule, Speakers, Exhibitors, Networking, Notifications, Venue | Phase 5 attendee experience (after spine; schedule/speakers need Phase 6 data — show what exists, hide empty) |
| **2. Universal Eventsliner app** | Discover, My Events, Tickets, then **tap into** the event experience | After Phase 4 discovery exists; one app, many events |
| **3. White-label enterprise app** | Dreamcast-like branded store listing for large customers | Phase 9+, much later. Do not start native iOS/Android for this in v1 |

Stage 1 is still **the same Event**, not a fork. Native iOS + Android + website builder + discovery + full Dreamcast suite **at once** is the explosion failure mode ([14](14-prioritization-risks-decisions.md)).

---

## 17.8 Dependency graph (do not invert)

```
Event (canonical)
  ├── visibility + status
  ├── Event Experience (v1: event_sites → later event_experience / event_app_config)
  ├── Tickets / Registration / Attendee / Credential / Check-in   (the OS spine)
  └── discoverability
        └── published + PUBLIC → Discovery index
              ├── /discover search & browse
              ├── event card → /e/:slug
              └── organizer public profile → that org’s PUBLIC events
```

**Order of implementation (roadmap):**

1. Event + website (`/e/:slug`) — Phase 1  
2. Registration + ticketing — Phase 2  
3. Check-in + attendance — Phase 3  
4. **Discovery + search + organizer profiles** — Phase 4  
5. Communication + attendee PWA — Phase 5  
6–9. Sessions/networking, exhibitors/sponsors, virtual, enterprise  

Do not wait for Mixhub-class features before discovery. Do not build discovery before a stranger can open `/e/:slug` and (after Phase 2–3) register and check in.

---

## 17.9 Explosion risk (what not to build initially)

**Do not** in the first slice, or as a parallel “all surfaces” program:

- A Webflow-class website builder **and**
- Native iOS **and** native Android **and**
- A full discovery marketplace **and**
- Dreamcast hardware / FR / 3D / white-label store apps **all at once**

That is five companies. Eventsliner.live is one Event, shipped as: **website spine → money and gate → then discovery as a first-class capability → then richer experience and, much later, white-label.**

The first 20 tasks: org, event, `event_sites`, **event website** at `/e/:slug`. Not `/discover`. Not app stores. Not a second backend.
