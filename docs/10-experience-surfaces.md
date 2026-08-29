# 13–16. Event website, app, networking, exhibitors, virtual/hybrid

---

## 13. Event website builder

Dreamcast microsites are branded and functional, not Webflow. Luma pages are tasteful and fast. Eventsliner should land on **Luma quality with Dreamcast data bindings**.

### 13.1 Recommendation: staged builder

| Stage | What | When |
|-------|------|------|
| **1. Fixed templates** | 2–3 templates, tokens for color/logo/cover, on/off sections | **MVP** |
| **2. Block-based** | Ordered sections, each with a schema editor (not freeform pixels) | Phase 5 |
| **3. Drag-and-drop** | Pixel canvas, arbitrary layout | **Only if** agencies pay. High cost, high bugs. |

**Do not start at 3.** Almost every "event website builder" that starts as a page designer ships late and looks generic anyway.

Simplest approach that can evolve: **template + section list**. The `EventSite.sections` JSON *is* the block model. A future drag-and-drop editor writes the same JSON.

### 13.2 Templates (v1)

1. **Conference** — dark or light, big hero, tickets, speakers (hidden if empty), venue
2. **Meetup** — compact, host-forward, RSVP
3. **Exhibition** (later) — halls, exhibitor grid

One excellent conference template is better than five mediocre ones.

### 13.3 Sections

| Section | MVP | Notes |
|---------|-----|-------|
| Hero (title, date, venue, CTA) | Yes | |
| About | Yes | Markdown |
| Tickets / registration CTA | Yes | Live inventory |
| Venue | Yes | Address + optional map embed |
| FAQ | Yes | |
| Speakers | Later | Empty = hidden |
| Schedule | Later | |
| Sponsors | Optional if logos uploaded | |
| Exhibitors | Phase 6 | |
| Custom markdown block | Yes (one) | Escape hatch |
| Custom HTML | Later, sanitised | XSS risk |

### 13.4 Branding

MVP: logo, primary color, cover image, favicon = logo.

Later: fonts, dark/light, custom CSS (enterprise, sanitised).

### 13.5 Domain

| Option | When |
|--------|------|
| `eventsliner.live/e/:org/:slug` or `/e/:slug` | **MVP** |
| `:slug.eventsliner.live` | Phase 5 (wildcard cert) |
| Custom domain CNAME | Enterprise (SSL provisioning, apex issues) |

Organizers care more about **unbranded chrome** (no giant Eventsliner banner) than about a custom domain on day one. Follow Dreamcast: disappear behind their brand.

### 13.6 SEO & social

- Unique `<title>`, description, canonical
- OG/Twitter image from cover
- JSON-LD `Event` schema
- `robots` for unlisted/private
- Server-rendered HTML (not a blank SPA)

### 13.7 Mobile

Design public pages at 390px width first. Sticky register CTA. Tickets must be tappable with a thumb.

---

## 14. Event app

### 14.1 Decision

| Option | Speed | Cost | Capability | Verdict |
|--------|-------|------|------------|---------|
| Responsive website | Fast | Low | High enough for ticket + schedule | **MVP (ticket page)** |
| **PWA** | Fast | Low–med | Offline ticket, install, later push | **Phase 7 default app** |
| Native iOS | Slow | High | Push reliability, store presence | After PWA proof |
| Native Android | Slow | High | Same | After PWA proof |

**Recommendation:** do not build native apps first. Dreamcast's "white-label app" is often a services project. Whova wins because of store presence and push — we can get 80% with a PWA and WhatsApp, which India actually reads.

### 14.2 App information architecture (Phase 7)

| Tab | Contents |
|-----|----------|
| Home | Now/next session, announcements |
| Schedule | Tracks, my agenda |
| Speakers | Profiles |
| Exhibitors | Directory + booth |
| Ticket | QR, badge, order |
| People | Networking (if on) |
| More | Venue, Wi-Fi, FAQ, surveys |

MVP ships only **Ticket** (and the public site). Adding empty tabs is worse than not having an app.

### 14.3 Features vs phase

| Feature | Phase |
|---------|-------|
| My ticket / QR | 1 (MVP) |
| Venue info | 1 on public site |
| Schedule / speakers | 5 |
| Notifications (email/WA) | 1 / 4 |
| Personalized agenda | 5–7 |
| Polls / Q&A | 7 (or Slido link) |
| Surveys | 4–5 |
| Networking | 6–7 |
| Push (PWA) | 7 |
| Native | 10 if ever |

---

## 15. Networking and matchmaking

### 15.1 Principle

Start **rule-based**. Store the data AI will need. Do not train anything until connections and profiles exist.

### 15.2 v1 networking (Phase 6)

- Opt-in: attendee creates `NetworkingProfile`
- Directory: filter by industry, role, company, interests, goals
- Connect: request / accept
- QR exchange: scan attendee networking code (can be the same credential or a separate `network_public_id` if they want to exchange without giving gate access — **use a separate code**)

### 15.3 Matching (rule-based)

Score:

```
overlap(interests) * 3
+ same industry * 2
+ complementary goals (buyer↔seller) * 4
+ same geo * 1
+ shared saved sessions * 2
```

Return top 20. No ML.

### 15.4 Data model for future AI

Already specified:

- Profile tags (interests, goals, looking_for, offering)
- Behavior: `AnalyticsEvent` (`profile_view`, `connect_request`, `meeting_done`, `booth_visit`, `session_attend`)
- Graph: `Connection`, `Meeting`

Later AI is a **ranker** on these features, not a new product. Do not buy an "AI matchmaking" vendor in v1.

### 15.5 Meetings

Status: `requested` → `accepted` → `done` / `declined` / `cancelled`. Optional timeslot + table number.

Speed networking (Dreamcast) is an ops format. Software only needs a timer + rotating pairs later. P3.

---

## 16. Exhibitor system (Phase 6)

Dreamcast's expo value is **pass allocation + lead retrieval + on-site**. Copy that sequence, not the 3D booth.

### 16.1 Onboarding

```
Organizer adds Exhibitor (name, booth, quota N)
  → Invite exhibitor admin
  → Profile (logo, about, website, categories, products)
  → Assign staff emails/phones up to quota
  → System creates Attendees (category=exhibitor) + credentials
```

### 16.2 Lead capture

Exhibitor staff app (same PWA, role=exhibitor):

- Scan attendee **gate QR** or a dedicated lead QR
- Create `Lead` with notes / tags / rating
- GDPR/DPDP: attendee already consented to exhibitor scan in terms, or we show a toast on first scan ("your details will be shared with Booth 12")

Export CSV. That's the product. Fancy scoring later.

### 16.3 Meetings & analytics

Reuse networking meetings. Analytics: scans per hour, unique visitors, top tags.

### 16.4 What not to build

- 3D booths
- Live commerce
- "Offline-online expo sync" as a special database — it's just the same Postgres

---

## 16b. Virtual + hybrid (Phase 8)

### Build vs integrate

| Piece | Build | Integrate |
|-------|-------|-----------|
| Access control to content | Yes (`attendance_mode`, ticket) | |
| Watch page chrome | Yes | |
| Live streaming | | **Mux, Cloudflare Stream, YouTube unlisted, IVS** |
| Video rooms / WebRTC | | **Daily, 100ms, LiveKit Cloud** |
| Chat | Maybe later | Daily's chat, or Slack/WhatsApp |
| Q&A / polls | Own later or Slido | Slido is fine |
| Virtual booths / 3D | **No** | |
| Recording | | Provider |
| Attendance analytics | Yes (player beacons) | |
| Networking | Same as in-person | |

**Do not build an SFU, media servers, or Mixhub.** Dreamcast's virtual suite is a services + custom environment business. Hopin already showed that owning the campus is a trap.

Hybrid = one event, two presence modes, shared agenda, shared comms. The hard part is product (what does a hybrid ticket include?), not 3D tiles.

Recommended first virtual slice: **paid/free webinar with Razorpay + Mux live + attendee-auth player + reminder emails.** If that is not selling, a virtual venue will not sell either.
