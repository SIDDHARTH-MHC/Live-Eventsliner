# 16. Eventsliner design system

**Status:** Always on. Binding for every future UI. Not optional taste.

**Cursor rule (agents):** [.cursor/rules/design-system.mdc](../.cursor/rules/design-system.mdc) (`alwaysApply: true`).

**Platform companions:** APIs + Well-Architected → [21-platform-standards.md](21-platform-standards.md). UI hubs → [Google Design](https://design.google/), [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/).

This document is the durable source of tokens, surface rules, and Material vs Apple conflict resolutions. The Cursor rule is the operational MUST / MUST NOT bar. If they drift, **fix the rule to match this doc**.

Eventsliner.live is an India-first event platform (see [00](00-executive-thesis.md), [10](10-experience-surfaces.md), [15](15-start-here.md)). Stack when built: Next.js, TypeScript, Tailwind, shadcn/ui. Surfaces: public event pages, organizer dashboard, attendee ticket/QR, check-in staff UI (phone-first), later PWA. **Do not start native iOS/Android.** Still apply Human Interface Guidelines that apply to touch web.

**Building product UI without this system is forbidden.**

---

## 1. What we actually studied

Hubs requested: [Google Design](https://design.google/) and [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/). Those hubs point at the operational systems below. This section cites **principles from the pages**, not “follow Google/Apple” as a slogan.

### 1.1 Google Design (design.google)

Google Design is a **stories and craft** hub (people, typography, UX, Material), not a component spec.

From the hub and linked Material work:

- **Material Design is the product system.** Tags and archives point at Material Design and **M3 Expressive** (e.g. “Inside M3 Expressive”, “Better, Easier, Emotional UX”). The spec lives at [m3.material.io](https://m3.material.io/).
- **UX fundamentals over novelty.** *Code is a Design Material* (Katie Jacquez): speed of generation is not strategy; high-fidelity too early hides architecture; **thoughtwork, hierarchy, and user pain** still decide the product. Eventsliner implication: do not vibe-code a pretty page that fails check-in or checkout.
- **Typography as a system.** Google Fonts / Google Sans Flex material: variable fonts and axes are tools; **readability and a defined scale** come first. Public pages may use an expressive display cut; product UI stays on a small, tokenized scale.
- **Global accessibility / do not assume the user.** Hub UX: *Designing for Global Accessibility* — check assumptions about users. For Eventsliner that means mid-range Android, sunlight, IST, Indian names and phones, not an iPhone-only Figma frame.

Google Design does **not** replace Material 3. When an agent needs a measurement, use M3 + HIG, not a blog hero.

### 1.2 Material Design 3 (m3.material.io)

Material 3 is “Google’s open-source design system for building beautiful, usable products.” Get started: organized as **foundations, styles, and components**, with design tokens so the same values exist in design and code.

**Foundations (from Material):**

- Accessibility: people with diverse abilities must **navigate, understand, and enjoy** the UI. Designing guidance maps visual UI to a **linear, text-based** experience (semantic structure) and cites **WCAG**.
- Content design: writing and information design make UIs usable (alt text, global writing, notifications, style).
- Tokens: colors, type, shape, motion stored once and reused.
- Interaction **states**: enabled, disabled, hover, focused, pressed, dragged, selected — **two visual indicators** so state is not color-only.
- Layout: arrangement that signals hierarchy; **breakpoints** (compact / medium / expanded / large / extra-large); **scaffold**; **grids & spacing**; **RTL**; canonical layouts. “Material layout guidance is implemented on Android and **applies to web**.”
- Spacing: groups related content, directs attention, sets personality. Denser = more serious/focused; more space = calmer. Desktop can be more generous than mobile.

**Styles:**

- **Color:** 26+ **roles** in groups (primary, secondary, tertiary, error, surface, outline). Accessible **pairings** (e.g. container vs on-container). Built-in light and dark. Dynamic color from wallpaper is an Android personalization feature — **Eventsliner uses a static baseline scheme** plus organizer **primary** from event/org theme, not wallpaper extraction.
- Contrast levels: standard / medium / high (user-controlled). We implement **standard** always and **high** for check-in / `prefers-contrast`.
- Surfaces: **tone-based** surface roles replaced M2’s +1…+5 elevation tints. Elevation is z-distance in dp; platforms choose shadow vs tone. **Avoid inventing extra elevation levels.**
- **Typography:** five roles — **display, headline, title, body, label** — each small/medium/large. M3 Expressive adds **emphasized** styles for selection and editorial moments. Scale is a **Major Second (1.125)** anchored at **14** for body-like typesetting. Web: **sp → rem** (`sp/16`).
- **Motion:** M3 Expressive **spring / physics** (stiffness, damping, velocity); schemes **expressive** (overshoot/bounce) vs **standard** (utilitarian, little bounce). Tokens: spatial vs effects × fast / default / slow. **Web still documents easing + duration** (emphasized 500ms on-screen, 400ms enter, 200ms exit; standard 300 / 250 / 200). Material notes Standard is the **fallback for Web and iOS**.
- Shape: M3 Expressive adds a large shape library. Eventsliner uses **a few radii**, not 35 decorative blobs on product UI.

**Components** we will map (not copy pixel-for-pixel): buttons, text fields, lists, navigation bar / rail / drawer, search, sheets, dialogs, progress / loading, snackbars.

**M3 Expressive (from Material home / get started):** emotion-driven UX — more color, motion, adaptive components, flexible type, contrasting shapes. **Use on public marketing moments only.** Do not use bounce, morphing shapes, or extra-chromatic UI on money, errors, or the gate.

### 1.3 Apple Human Interface Guidelines

HIG hub: guidance to design a great experience on Apple platforms. Eventsliner is web, but **iPhone Safari, iPad, and PWA** must obey the same human factors.

**Design principles** (HIG *Design principles*, updated 2026 — these replace treating “clarity, deference, depth” as the only triad):

| Principle | HIG meaning | Web / Eventsliner |
|-----------|-------------|-------------------|
| **Purpose** | Make something meaningful; keep focused on what the product is for | Event page = understand and register; check-in = admit this person; dashboard = run the event. No extra chrome. |
| **Agency** | Let people do things their way; stay out of the way; recover from mistakes | Skip-able onboarding; undo/cancel; don’t lock into wizards without an exit |
| **Responsibility** | Act in people’s best interest; transparent; collect only what you need | Camera/location only when scanning or mapping; PII minimized (already a product rule) |
| **Familiarity** | Build on what people know; consistent visuals/interactions; **clear feedback** | Platform patterns: back, sheets, lists, search field; press states |
| **Flexibility** | Diverse contexts; accessibility from the start; many inputs; each platform with care | Phone + tablet; keyboard; screen reader; Dynamic Type analog |
| **Simplicity** | Clear and direct; only what’s necessary; hierarchy | Content over decoration |
| **Craft** | Care in every detail | Luma-quality public pages (D13) without becoming a Dribbble shot |
| **Delight** | Human; **don’t mistake delight for decoration** | Check-in success can feel good; it must not delay the next scan |

Classic iOS ideas still appear in *Designing for iOS* and layout/materials:

- **Clarity** → Simplicity + Craft: readable type, obvious controls, unambiguous icons.
- **Deference** → Agency + Purpose: **content first**; UI helps and recedes (HIG: “Stay out of the way”; iOS: limit on-screen controls).
- **Depth** → hierarchy via layers and motion that **tracks gestures**, not gratuitous 3D. On web: one elevation step for overlays; motion that follows the user’s action (sheet follows drag).

**Foundations we bound to:**

- **Accessibility:** intuitive, perceivable, adaptable. Contrast WCAG AA (4.5:1 up to 17pt; 3:1 for ≥18pt or bold). **Dynamic Type**: iOS body default **17pt**, minimum **11pt**; support enlargement (~200%). **Touch:** default control **44×44 pt** (iOS); padding between controls. Reduce Motion: fade instead of zoom/scale; no time-boxed auto-dismiss as the only path. Don’t use color alone. VoiceOver analog on web = **accessible names + structure**. Keyboard / Full Keyboard Access analog = **visible focus + tab order**.
- **Layout:** adapt; **safe areas** (notch, home indicator, Dynamic Island); system margins; **avoid full-width edge-hugging buttons**; keep status bar unless immersive. Thumb reach: important controls mid/bottom.
- **Typography:** SF is Apple’s family; we will not ship SF as a web webfont without license. Use the **text style roles** (title, body, caption…) as hierarchy. Custom fonts must still meet size minima and scale.
- **Color:** semantic colors that flip in Dark Mode; **Increase Contrast**; 4.5:1 minimum, **7:1** preferred for small text.
- **Materials / motion:** system components already move; custom motion must be purposeful, optional, **interruptible**. Liquid Glass is an Apple material — **not required on web**; if we blur, we keep contrast.
- **Dark Mode:** respect system appearance; don’t ship a broken dark theme; test with Increase Contrast.
- **Writing:** voice + situational tone; **be clear**; fewer words; action-oriented verbs; empty states with a next step; errors nearby and instructional; placeholders are not labels.
- **Inclusion:** plain language; you/your; no unexplained jargon; don’t design only to “not offend” — **welcome**.
- **Privacy:** request data only when needed; explain why in one straightforward sentence.

**Patterns:** modality (one task; easy to dismiss), feedback (people always know what happened), searching (one obvious place; scoped placeholder; privacy of history), loading (show something immediately; determinate vs indeterminate), onboarding (skip; don’t block the task).

**Components:** buttons (44pt hit region, press state, one prominent action, **never primary+destructive**), text fields (label + hint, keyboard type, validate in context), lists (succinct, selection feedback), navigation/tab bars (few destinations, labels), sheets (Cancel + Done, one sheet at a time), alerts (sparingly, actionable, specific button titles not “OK”), progress.

---

## 2. Reconciled Eventsliner principles

One system. **Material 3 structure + Apple HIG interaction and accessibility bar.** Luma-quality public pages sit inside that, not beside it.

1. **Purpose over chrome.** Every screen has one job. Navigation and brand recede (HIG deference / Purpose).
2. **People over pixels.** India-first: mid-range Android, IST, ₹, `+91`, venue sunlight, 4G. Google: don’t assume the user. Apple: Flexibility.
3. **Tokenized, not vibed.** Material tokens (color roles, type roles, 4px space, motion). shadcn is the kit; tokens are the law.
4. **Stricter human factors win.** 48px targets, 4.5:1 contrast, labels, focus, reduced motion — even if a mock is prettier without them.
5. **Familiar patterns.** Lists, sheets, search fields, back, tabs — as people already know them (HIG Familiarity). No original gesture language.
6. **Feedback always.** Press, focus, loading, error, success — two cues, not color alone (M3 states + HIG feedback).
7. **Forgiving.** Cancel, edit, undo where the domain allows. Never trap people in a modal stack (HIG Agency).
8. **Quiet motion.** Standard easing, short, interruptible. Expressive bounce is opt-in for public delight only.
9. **Words are UI.** Instructional errors, sentence-case product voice, no “we” in failures (HIG Writing).
10. **Craft without decoration.** D13 Luma bar is **clarity and hierarchy**, not glassmorphism, not Material expressive blobs, not a third “Eventsliner look” unrelated to both specs.

---

## 3. Tokens

Implement as CSS variables (and Tailwind theme) in application code. Names below are the contract.

### 3.1 Type scale

Material roles, sizes chosen so **body ≥ 16px** (web) and check-in can bump one step. Apple iOS body is 17pt — we use **16px body / 17px optional on iOS via `16px` root** and do not go below 16px for readable product copy.

| Token | Size / line-height | Weight | Use |
|-------|--------------------|--------|-----|
| `display-lg` | 3.5rem / 1.12 (56px) | 500 | Public hero only, short strings |
| `display-sm` | 2.25rem / 1.2 (36px) | 500 | Public section titles |
| `headline` | 1.5rem / 1.25 (24px) | 600 | Page titles (dashboard, sheets) |
| `title-lg` | 1.25rem / 1.3 (20px) | 600 | Card/event names |
| `title-md` | 1rem / 1.4 (16px) | 600 | List primary |
| `title-sm` | 0.875rem / 1.4 (14px) | 600 | Toolbar, section labels |
| `body-lg` | 1.0625rem / 1.5 (17px) | 400 | Preferred reading (forms, about) |
| `body` | 1rem / 1.5 (16px) | 400 | Default |
| `body-sm` | 0.875rem / 1.45 (14px) | 400 | Secondary; **not** check-in primary |
| `label` | 0.875rem / 1.25 (14px) | 500 | Buttons, tabs, chips |
| `label-sm` | 0.75rem / 1.3 (12px) | 500 | Meta, timestamps; never sole CTA text |
| `caption` | 0.75rem / 1.3 (12px) | 400 | Helper, legal |

**Check-in:** `title-lg` + `body-lg` minimum; result name at `headline` or `display-sm`.

**Font:** one Grotesk/sans for product (e.g. Inter or similar with a real italic and weights 400–700). Optional second family for public **display** only. Hindi/Devanagari later: choose a family that covers it; do not use a Latin-only display face for UI. Material: line-height may need to grow for non-Latin scripts.

**MUST** use `rem`. **MUST** honor browser text zoom. **MUST NOT** set `font-size` on `html` below 100%.

### 3.2 Spacing

4px base (Material). Tailwind-friendly:

| Token | px | Use |
|-------|-----|-----|
| `space-1` | 4 | Icon gaps, tight |
| `space-2` | 8 | Related inline |
| `space-3` | 12 | Compact list padding |
| `space-4` | 16 | **Default compact page gutter** |
| `space-5` | 20 | Control padding |
| `space-6` | 24 | **md+ gutter**; section gap |
| `space-8` | 32 | Section breaks |
| `space-10` | 40 | Public hero blocks |
| `space-12` | 48 | Major public sections |

**Density:** dashboard tables may use `space-3` row padding **if** the row hit area remains ≥ 48px. Check-in **MUST NOT** use compact density.

### 3.3 Color roles

Map 1:1 to Material roles. Organizer `primary_color` generates **primary / on-primary / primary-container / on-primary-container** only (algorithm or manual check for 4.5:1). **Error, surface, and on-surface never come from the organizer color.**

| Role | Meaning |
|------|---------|
| `primary` | Brand actions (Register, Publish) |
| `on-primary` | Text/icon on primary |
| `primary-container` | Selected chips, tinted fills |
| `on-primary-container` | Text on those fills (4.5:1) |
| `secondary` | Secondary actions, filters |
| `on-secondary` | |
| `error` | Errors, destructive (fixed semantic red family) |
| `on-error` | |
| `error-container` / `on-error-container` | Inline error fields |
| `success` | Check-in OK, paid (not a Material core role — **add-on**; pair with icon) |
| `warning` | Already checked in, waitlist |
| `surface` | Page background |
| `surface-container` / `surface-container-high` | Cards, bars |
| `on-surface` | Primary text |
| `on-surface-variant` | Secondary text (**must still pass 4.5:1** or bump) |
| `outline` / `outline-variant` | Borders, dividers |
| `inverse-surface` / `on-inverse-surface` | Snackbars, inverse chips |

**Dark:** dedicated tokens, not inverted hex. Apple: test Increase Contrast / `prefers-contrast: more` by darkening `on-surface` gaps.

**Check-in outdoor mode:** optional forced **light high-contrast** (near-black on near-white, success/fail not relying on hue). Prefer this over a dim dark theme in sun.

### 3.4 Radii

Few values (not M3 Expressive shape zoo):

| Token | px | Use |
|-------|-----|-----|
| `radius-sm` | 8 | Inputs, small chips |
| `radius-md` | 12 | Buttons, cards |
| `radius-lg` | 16 | Sheets, public cards |
| `radius-full` | 9999 | Pills, avatars |

Apple: inset buttons; match adjacent curvature. **MUST NOT** 0-radius primary buttons on iOS Safari.

### 3.5 Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| 0 | Flat, surface | Public page, dashboard canvas |
| 1 | `surface-container` + 0–1px border / 4% shadow | Cards |
| 2 | Short shadow + higher container tone | Sticky bars, menus |
| 3 | Stronger shadow | Dialogs, sheets |

**MUST NOT** stack more than three visual layers. Public pages stay at 0–1.

### 3.6 Motion

Default **standard** (Material utilitarian; HIG: don’t decorate frequent interactions).

| Token | Duration | Easing | Use |
|-------|----------|--------|-----|
| `motion-exit` | 150–200ms | accelerate | Dismiss, unmount |
| `motion-fast` | 150–200ms | standard | Hover, press, switches |
| `motion-enter` | 250–400ms | decelerate | Sheet/dialog in |
| `motion-on-screen` | 300ms | standard | Layout shift |
| `motion-slow` | 400–500ms | emphasized | Rare public transitions only |

**Check-in:** `motion-fast` or **0ms**.

**Reduced motion:** all spatial motion → `0` or fade `150ms`.

### 3.7 Breakpoints

Align with Material compact→expanded, Tailwind defaults:

| Name | Min width | Eventsliner |
|------|-----------|-------------|
| compact | 0 | Public, ticket, check-in **designed here** |
| medium | 768 | Dashboard two-pane starts |
| expanded | 1024 | Dashboard lists + detail |

Public max content width ~720px for prose; hero can be wider. Dashboard: use the width.

---

## 4. Component rules

shadcn/Radix primitives. Restyle to tokens. Map to surfaces.

### Buttons

- Hit target ≥ 48×48px (padding if the visual is smaller).
- One **primary** per view. Others outline/ghost.
- Pressed state required. Disabled: not color-only; `aria-disabled` + no pointer.
- Destructive: error color, never the single filled primary in a confirm dialog (HIG).
- Labels: verbs. Ellipsis if it opens another step (“Export…”).
- In-flight: spinner **inside** the button; keep width; Apple “Checking out…” pattern.

### Forms / text fields

- Visible label. Placeholder = example (`name@example.com`) or format, not the only label.
- `autocomplete`, `inputmode`, `type`. OTP: `one-time-code`. Phone: `tel`.
- Error: text below field, `aria-invalid`, `aria-describedby`.
- Stack fields on compact. Even gaps (HIG).
- Password: reveal toggle with a name, not color-only.

### Lists

- Primary text `title-md`; secondary `body-sm`.
- Row min height 48px (dashboard 48–56; check-in search results 56–64).
- Selection: highlight **and** affordance (chevron or check), not color-only.
- Disclosure vs info: chevron = navigate; don’t mix with trailing index (HIG).

### Navigation

- Public: no tab bar; maybe a simple header + sticky CTA.
- Dashboard: sidebar from `md`; **top bar + overflow** on compact. ≤5 top-level destinations (HIG tab bars).
- Check-in: **no** dashboard nav. Event name + station + sign out. Camera is the content.
- Labels on nav icons (HIG). Don’t icon-only unless the name is adjacent for AT.

### Sheets / modals / dialogs

- One at a time. Close first sheet before another (HIG).
- Cancel (or Close) + Done/Save. Don’t rely on overlay-click alone; provide a control.
- Focus trap; restore focus; `Esc`.
- Full-screen modal only for camera / multi-step checkout — not for a two-field form.

### Alerts

- Rare. Actionable. Title describes the situation. Buttons named with the outcome (“Delete event”), not OK.
- Don’t alert on every delete if undo exists; **do** confirm irreversible refunds/payouts.

### Progress / loading

- Skeleton of the **layout**, not a centered spinner as the first paint (HIG: show something).
- Determinate if you know percent (file upload). Indeterminate otherwise.
- Never block the whole dashboard for a side panel fetch.

### Search

- Staff check-in search: primary position, large field, scoped placeholder.
- ≤5 results then refine (product already says this in [09](09-checkin-badges.md)). Confirm identity before check-in.
- Shared device: don’t persist attendee search history in a visible dropdown without a clear clear control (HIG privacy).

### Snackbars / toasts

- Not for errors the user must fix in a form (those stay in-form).
- Not the only record of a failed check-in (full-screen fail is).
- Persist until dismissed if `prefers-reduced-motion` or if the message is an error.

---

## 5. Accessibility checklist (ship gate)

Copy this into PR review when UI exists. **All must be yes.**

- [ ] Contrast 4.5:1 (7:1 check-in / small text where feasible); `prefers-contrast` considered
- [ ] Meaning not by color alone
- [ ] `:focus-visible` on all interactive elements
- [ ] Named controls; inputs have visible labels
- [ ] Hit targets ≥ 48px (check-in ≥ 56px)
- [ ] Keyboard complete; order matches visual; dialogs trap and restore
- [ ] `prefers-reduced-motion` respected
- [ ] Text zoom / dynamic type analog does not clip primary actions
- [ ] Images: alt; decorative `alt=""`
- [ ] Live region for check-in result and submit errors
- [ ] Camera/location permission only at point of use, with a one-sentence why
- [ ] Works without hover
- [ ] Safe-area insets on sticky chrome
- [ ] Reduced motion and high contrast don’t break layout
- [ ] Screen reader: heading order, one `h1`, skip link on dashboard/public

---

## 6. Per surface

### Public event page (`PublicShell`)

- Job: understand the event and register.
- 390px first; sticky primary CTA; tickets as large rows/cards.
- Type: display/headline for title; body for about; labels for meta (date, venue).
- Chrome: small Eventsliner footer only (D6). Organizer brand via logo + primary, not a second design system.
- Motion: almost none except CTA press and sheet for ticket pick.
- Performance is a design requirement (4G): no hero video autoplay.

### Organizer dashboard (`AppShell`)

- Job: run events, people, money.
- Dense tables **from md up**; compact phone = stacked cards or list rows ≥ 48px, not 32px table cells.
- Keyboard: power users will live here.
- Empty: “Create your first event” with one button (START HERE).
- Never put live check-in camera here.

### Check-in (`CheckInShell`)

- Job: admit or reject in under a second of staff attention.
- Phone-first, sunlight: high contrast, large type, large tap, torch.
- States: ready → scanning → **OK / already / deny** full screen with name and ticket type ([09](09-checkin-badges.md)).
- Manual search: large field, fat result rows, confirm copy (“Check in Priya from Zoho?”).
- Motion: instant. Sound optional and never the only signal (noisy venues).
- Assistive Access analog (HIG): one action, huge controls, confirm destructive twice if you ever add “undo last” as destructive.

### Ticket / QR

- Job: get through the door.
- QR as large as the short viewport allows; quiet zone; dark-on-light even if the rest of the page is dark (test both).
- Name, event, time in `title`/`body-lg`. Brightness-friendly.
- Offline later: still must be a static, printable-contrast QR.

---

## 7. Material vs HIG — conflicts and resolutions

| Topic | Material 3 | Apple HIG | Eventsliner resolution |
|-------|------------|-----------|-------------------------|
| Touch size | 48dp typical | 44×44 pt default (28 min) | **48×48 CSS px** everywhere; check-in 56+ |
| Body type | 14–16sp scale; 14 is scale key | 17pt body default on iOS | **16px body**, **17px body-lg**; never 14px as only body on public/check-in |
| Motion | Expressive springs + bounce | Purposeful, interruptible, Reduce Motion, little extra on frequent UI | **Standard** durations on product; no bounce on check-in/checkout; reduced-motion fades |
| Color | Dynamic/wallpaper palettes; 26 roles | Semantic system colors; respect Dark Mode; don’t fork appearance | **Static roles + organizer primary**; follow `prefers-color-scheme`; no wallpaper dynamic color |
| Elevation | Tone-based surfaces, few levels | Depth / materials / Liquid Glass | **Tone + light shadow**; no Liquid Glass requirement; no M2 heavy shadows |
| Buttons | Many types, FAB, button groups, shape-shift (Expressive) | One prominent; 44pt; press state; roles | shadcn button variants mapped to primary/secondary/destructive; **no FAB** on public; optional FAB only if dashboard mobile compose needs it |
| Density | Adaptive; dense = serious | Comfortable tap and padding | Dashboard dense; **check-in and public CTAs never dense** |
| Dark mode | Built-in scheme | Follow system; avoid app-specific toggle | System preference; check-in may **force light high-contrast** for scanning |
| Navigation | Nav bar / rail / drawer by breakpoint | Tab bar few items; convertible sidebar | Material **scaffold by breakpoint**; HIG **count and labeling** of destinations |
| Writing case | Varies | Title case often on buttons/alerts | **Sentence case** product-wide for consistency and localization |
| Delight / Expressive | Emotional, colorful, morphing | Delight ≠ decoration | Expressive **only** on public hero if it still passes a11y; never on gate or money |
| Native widgets | Android/Web components | Use system components | **Web:** semantic HTML + shadcn; don’t mimic iOS UIKit chrome on Android or vice versa |
| Sheets | Bottom sheets | Cancel/Done placement, one sheet | HIG **structure and dismiss**; Material **bottom sheet on compact** is OK |
| Icons | Material icons | SF Symbols | One icon set (e.g. Lucide via shadcn); optical size ~24px; 48px hit |

**Do not** resolve conflicts by mixing both on one screen (Material colorful bounce **and** iOS gloss). Pick the row above.

---

## 8. India / mobile-first constraints

- Design and QA against a **~6.1" Android** class and **iPhone SE / 390px**, not only a 1440px laptop.
- Venue: glare, 30% brightness, dirty screen — check-in contrast is a product feature.
- Copy: IST default; show timezone if the event isn’t IST. Currency `INR` / ₹. Dates: unambiguous (`29 Aug 2026`, not `8/9/26`).
- Names: prefer full name; don’t require middle name; don’t assume two-part Western names.
- Performance: public pages must remain usable on 4G; images sized; no layout shift on the sticky CTA.

---

## 9. When application code starts

START HERE task 2: install shadcn **after** these tokens exist as CSS variables. Shells (`PageShell`, `AppShell`, `PublicShell`, `CheckInShell`) consume tokens only.

Until then, this document + the Cursor rule are the design system. **No feature UI that ignores them.**

### Sources (primary)

- [Google Design](https://design.google/)
- [Material Design 3](https://m3.material.io/) — foundations, color roles, type scale, motion, layout, states, elevation, buttons
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/) — design principles, accessibility, layout, typography, color, motion, dark mode, writing, inclusion, privacy, buttons, text fields, lists, sheets, alerts, searching, loading, designing for iOS
