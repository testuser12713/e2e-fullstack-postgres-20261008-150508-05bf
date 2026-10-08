# Design — Project Identity

> This document is project-long-lived. Tokens are not changed without
> the Architect's approval. Developers MUST use these tokens
> instead of improvising their own colors/spacings.

## Style Direction

Calm, modern light UI: near-white canvas, one restrained indigo accent, hairline borders instead of shadows-heavy cards, generous whitespace and a clear type hierarchy — Linear/Stripe as reference, so that rooms, times and conflicts are the only loud things on screen.

## Colors

- `--color-bg`: **#FFFFFF**
- `--color-surface`: **#F7F8FA**
- `--color-surface_raised`: **#FFFFFF**
- `--color-fg`: **#1A1D21**
- `--color-fg_muted`: **#6B7280**
- `--color-border`: **#E4E7EB**
- `--color-border_strong`: **#CFD4DB**
- `--color-accent`: **#4F46E5**
- `--color-accent_hover`: **#4338CA**
- `--color-accent_active`: **#3730A3**
- `--color-accent_soft`: **#EEF2FF**
- `--color-focus_ring`: **rgba(79,70,229,0.25)**
- `--color-danger`: **#DC2626**
- `--color-danger_soft`: **#FEF2F2**
- `--color-success`: **#16A34A**
- `--color-success_soft`: **#F0FDF4**
- `--color-warning`: **#B45309**
- `--color-warning_soft`: **#FFFBEB**
- `--color-disabled_bg`: **#F1F2F4**
- `--color-disabled_fg`: **#9AA1AB**

## Typography

- `font_family`: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif
- `font_family_mono`: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace
- `heading_weight`: 600
- `body_weight`: 400
- `label_weight`: 500
- `size_xs`: 12px/16px
- `size_sm`: 14px/20px
- `size_md`: 16px/24px
- `size_lg`: 20px/28px
- `size_xl`: 28px/36px
- `letter_spacing_headings`: -0.01em

## Spacing Scale

- `--space-0`: 4px
- `--space-1`: 8px
- `--space-2`: 12px
- `--space-3`: 16px
- `--space-4`: 24px
- `--space-5`: 32px
- `--space-6`: 48px

## Border-Radii

- `--radius-sm`: 6px
- `--radius-md`: 10px
- `--radius-lg`: 16px
- `--radius-pill`: 999px

## Components

### Button

Base: inline-flex, center, min-height 44px (touch target, also on desktop), padding 12px 20px, radius md (10px), font 14px/20px weight 500, transition 120ms ease-out, never shifts layout on hover. PRIMARY: bg=accent #4F46E5, fg #FFFFFF, border 1px transparent; hover bg=accent_hover #4338CA; active bg=accent_active #3730A3 + translateY(1px); focus-visible ring 0 0 0 3px focus_ring + border accent; disabled bg=disabled_bg, fg=disabled_fg, cursor not-allowed, no hover change. SECONDARY: bg #FFFFFF, fg fg, border 1px border_strong; hover bg=surface #F7F8FA; active bg #EFF1F3; disabled as above. GHOST: transparent, fg=fg_muted; hover bg surface, fg=fg. DANGER (destructive, e.g. booking loeschen): bg #FFFFFF, fg=danger, border 1px #F3C4C4; hover bg=danger_soft #FEF2F2; disabled as above. LOADING state: keep width, replace label with 16px spinner in fg_muted, aria-busy=true. Full-width on viewports < 480px.

### AppShell / TopNav

Sticky top bar, height 64px desktop / 56px mobile, bg #FFFFFF, border-bottom 1px border, backdrop of page scrolls under it. Left: product title 'Raumbuchung' 16px weight 600, accent dot 8px before it. Center/right: 3 nav links — 'Raeume', 'Tagesansicht', 'Freie Raeume' — 14px weight 500, padding 8px 12px, radius sm, inactive fg=fg_muted, hover bg=surface. ACTIVE link: fg=fg, bg=accent_soft #EEF2FF, 2px accent underline or left accent bar on mobile. Under 768px the nav becomes a horizontal scroll-free row of 3 equal buttons, min-height 44px, no burger menu (only 3 destinations, must not horizontally scroll at 360px). Content area below starts max-width 1120px, centered, padding 24px desktop / 16px mobile.

### Card / RoomCard

bg #FFFFFF, border 1px border, radius lg (16px), padding 20px, NO heavy shadow (at most 0 1px 2px rgba(16,24,40,0.04)). Hover (whole card is a link/button to the room's day view): border-color accent, bg stays white, cursor pointer, 2px accent left edge. Content: room name 16px/24px weight 600 fg; seat count 14px fg_muted with a small seat icon; equipment as TagChips row, gap 8px, wraps. The card is a single large tap target: min-height 88px, entire surface clickable, keyboard focusable with focus ring. Disabled variants render bg=surface, fg=disabled_fg and a 'kommt spaeter' pill instead of the hover state.

### TagChip

Two roles. (1) FILTER CHIP is a real toggle button: min-height 44px on touch rows / 36px in dense desktop toolbars, padding 8px 14px, radius pill, font 13px weight 500, border 1px border, bg #FFFFFF, fg=fg_muted. Selected: bg=accent_soft, fg=accent, border accent; shows a check glyph. Hover (unselected): bg=surface, fg=fg. Focus-visible ring as Button. (2) READ-ONLY TAG (equipment shown on a card): same geometry, bg=surface, fg=fg_muted, border transparent, not focusable, no hover — never looks clickable. Multi-select filter semantics: chips combine as AND, filter applies instantly on click.

### Input / DateField / TimeField

Height 44px, padding 10px 12px, radius sm (6px), border 1px border_strong, bg #FFFFFF, font 14px/20px, fg=fg, placeholder fg_muted. Focus: border accent + ring 0 0 0 3px focus_ring (no size shift). Date and time use NATIVE controls (input type=date / type=time) so the browser picker is a real picker; label always visible above the field, 13px weight 500 fg, not only a placeholder. ERROR: border danger + ring 0 0 0 3px rgba(220,38,38,0.18). DISABLED: bg=disabled_bg, fg=disabled_fg, cursor not-allowed. Fields are full-width in mobile forms, 320px max in desktop toolbars.

### FormField / FieldError

Wrapper = label (13px weight 500) + control + help/error line, vertical gap 6px, block gap between fields 16px. Error line: 13px, fg=danger, prefixed with a 14px alert glyph, text is a full sentence ('Das Ende muss nach dem Beginn liegen.'). VALIDATION TIMING (binding from AC-17): a field shows no error while untouched and empty; error appears only after the field was blurred with content, or after submit. Field with error gets aria-invalid=true and aria-describedby pointing at the error line. Character counter on the title input appears only from 80% of the limit, 12px fg_muted.

### Alert / ConflictBanner

Inline banner inside the form or page, radius md, padding 12px 16px, border 1px, left accent bar 3px. VARIANTS: error (bg danger_soft, border #F3C4C4, fg #7F1D1D, bar danger), success (bg success_soft, border #BBF7D0, fg #14532D, bar success), info/warning (bg warning_soft, border #FDE68A, fg #78350F). Structure: bold 14px headline + 14px body + optional code line. CONFLICT (AC-18, 409): headline 'Ueberschneidung mit bestehender Buchung', body names the colliding booking — 'Titel — 09:00-10:30, gebucht von ...'. Server error codes are shown small and monospaced (12px mono, fg_muted) as a secondary line for debugging/consistency, never as the main message. Entered form values MUST remain in the fields while the banner is visible. Banner gets role=alert and is focusable-reachable, not just a toast.

### EmptyState

Centered block, max-width 420px, padding 48px 24px vertical. Small 40px line icon in fg_muted, headline 16px weight 600 fg, body 14px fg_muted, optional reset button (secondary). Copy is explanatory, never just 'Keine Ergebnisse'. THREE fixed variants: (a) room-filter empty -> 'Kein Raum passt zu dieser Ausstattung.' + button 'Filter zuruecksetzen'; (b) empty day -> 'An diesem Tag ist nichts gebucht.' + button 'Buchung anlegen'; (c) empty search result -> 'Kein freier Raum in diesem Zeitraum.' + hint to widen the period. Same geometry everywhere so all three screens look alike.

### BookingRow (day view entry)

Vertical, full-width list item, bg #FFFFFF, border 1px border, radius md, padding 12px 16px, gap 12px between rows. Line 1: time range 14px weight 600, tabular-nums, format '09:00-10:30' (see layout_principles). Line 2: title 15px weight 500 fg. Line 3: 'gebucht von ...' 13px fg_muted. Up to two equipment/seat meta lines right-aligned on desktop, wrapped under on mobile. Left edge 3px accent bar as visual anchor, 4px gap before content. Actions (edit/delete) as 44px icon buttons; for bookings already started they are rendered visibly disabled with an 'Vergangenheit' badge and tooltip 'Vergangene Buchungen lassen sich nicht aendern' (AC-09). Past bookings additionally drop to 70% opacity — still readable, clearly inactive. Sort by start time ascending.

### DaySwitcher

One row: secondary icon button 'vorheriger Tag' (44x44) + date label + secondary icon button 'naechster Tag' (44x44) + ghost button 'Heute'. Date label uses the single date format from layout_principles, with the weekday in words ('Mo, 12.05.2025'), 15px weight 600, tabular-nums, min-width reserved so the row does not jump when the date length changes. Below 480px the row wraps: date label on its own line above the buttons, buttons min 44px and equal width.

### AvailabilitySearchForm

Card (radius lg, padding 20px) with a responsive grid: from + to (date + time, 4 native controls), min seats (number input, min 1, step 1), equipment (TagChip multi-select) and a primary Button 'Freie Raeume suchen'. Grid: 1 column < 640px, 2 columns < 1024px, 4 columns on desktop; gap 16px; buttons in the grid cell, full-width on mobile. Client-side pre-check mirrors the API: end after start, duration <= 8h — errors use FieldError, never a silent no-op. Results render as RoomCards; the whole card is a link into the day view of that room for the searched day.

### LoadingSkeleton

For room list, day view and search results: 3 placeholder rows, bg surface, radius md, height matching the real row (88px card / 64px booking row), animated 1.2s opacity shimmer between 0.6 and 1.0, gap 12px. ARIA-busy on the container; no spinners floating over already rendered content.

### ErrorState (data fetch failure)

Full-content block shown when GET /api/rooms, /rooms/{id}/bookings or the search fails: warning-soft banner style, headline 'Daten konnten nicht geladen werden.', body = the readable message from the unified error body, monospace line with error.code (e.g. 'NOT_FOUND', 'VALIDATION_ERROR', 'ROOM_NAME_CONFLICT', 'BOOKING_CONFLICT', 'BOOKING_IN_PAST'), and a secondary Button 'Erneut versuchen'. Distinct from EmptyState (no data vs. failed to load) — the two must never be confused visually.

## Layout Principles

- Container max-width 1120px, centered, page side padding 24px on desktop and 16px on mobile; the layout uses the full width on desktop instead of sitting in a narrow column.
- Breakpoints: 360px (minimum, must work without horizontal scrolling), 640px (forms switch from 1 to 2 columns), 1024px (search grid reaches 4 columns, room cards go 3-up), 1280px+ (content stays capped at 1120px).
- Room list: responsive grid — 1 column < 640px, 2 columns 640-1023px, 3 columns >= 1024px; gap 16px; cards have equal height per row (align-items start, min-height 88px).
- Section spacing: 32px between major blocks (header -> filter bar -> grid), 16px between elements inside a block, 8px inside a component. Use only the spacing scale (4/8/12/16/24/32/48) — no arbitrary values.
- Navigation pattern: a single sticky AppShell is the frame for all three views (room list / day view / availability search); each view is a route, and every view exposes a way back to the room list. Deep link room list -> room day view -> booking form is a stack; use a ghost 'Zurueck' control, never a browser-button-only flow.
- Touch targets: every interactive element is at least 44x44px (including icon buttons and filter chips on mobile) with at least 8px of spacing between adjacent targets; desktop-only dense toolbars may shrink to 36px.
- ONE format for every date, time, duration and count the product shows — no screen may deviate: DATE 'DD.MM.YYYY' (e.g. 12.05.2025), WEEKDAY short 'Mo/Di/Mi/Do/Fr/Sa/So', date-with-weekday 'Mo, 12.05.2025', TIME 24h 'HH:MM' (09:00), TIME RANGE '09:00-10:30' (en dash for ranges, no 'Uhr', no 'AM/PM'), DURATION '1 h 30 min' and '45 min' (never '1.5h', never '90 min' for 1.5h), SEATS '12 Plaetze' / '1 Platz', TIMEZONE offset '+02:00' shown next to the day heading, all numbers tabular-nums and left-aligned in tables/rows so times line up.
- States are text-plus-color, never color alone: free = success + word 'frei', occupied = danger + word 'belegt', past booking = muted + 'Vergangenheit' badge. This also keeps the UI readable for color-blind users.
- Cards and banners carry a hairline border (1px #E4E7EB) and at most a 1px very light shadow — depth comes from borders and spacing, not from heavy shadows or gradients. The only saturated surface on a screen is one primary accent button plus semantic banners.
- Every visible control of the three views either works or is clearly rendered as disabled with a 'kommt spaeter' pill and disabled styling (AC-14/16/21) — dead but apparently working buttons are not allowed; this is part of the visual contract, not just logic.
- Empty states always explain WHY and offer the next action (reset filter / create booking / widen period); loading uses skeletons in the final layout shape, so nothing jumps when data arrives.
