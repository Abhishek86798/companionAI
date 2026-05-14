# UI/UX Design Brief — Visual & Interaction Design Guide
## Hinglish AI Companion — Web App MVP
**Version:** 1.0  
**Status:** Draft  
**Paired Documents:** PRD, TRD, AppFlow, BackendSchema

---

## 1. Aesthetic Direction

**The vibe: Late-night texting with a close friend.**

Warm. Intimate. Low-light. This is not a productivity tool or a SaaS dashboard. It's a personal space — the digital equivalent of a late-night WhatsApp conversation with someone who actually knows you. Every design decision should reinforce that feeling.

**Aesthetic keywords:** Warm dark, soft glow, conversational, approachable, Indian-but-modern.

**What this is NOT:**
- Not clinical (no stark white, no hospital blues)
- Not corporate SaaS (no gray dashboards, no card grids)
- Not generic AI chatbot (no cold gradients, no robotic bubble styles)
- Not loud or maximalist (no neon, no rainbow gradients)

**Reference products for feel (not to copy):**
- **WhatsApp** — for the familiar chat bubble cadence
- **BeReal** — for the warmth and intimacy of the dark UI
- **Zomato** — for how Indian-first apps use warmth and color confidently
- **Notion** — for clean typography and breathing room
- **Arc Browser** — for the sense that this tool was built with care

---

## 2. Color Palette

### 2.1 Core Colors

| Role | Name | Hex | Usage |
|---|---|---|---|
| Primary brand | Saffron | `#FF6B35` | CTAs, active states, Arjun's avatar ring, send button |
| Background (main) | Deep Night | `#0F0F14` | Page background |
| Background (surface) | Soft Ink | `#1A1A2E` | Chat input bar, settings drawer, cards |
| Background (elevated) | Lifted Dark | `#22223A` | Modals, message bubbles (Arjun), hover states |
| Text (primary) | Warm White | `#F0EDE8` | All body text, message content |
| Text (secondary) | Muted Sand | `#9B96A0` | Timestamps, placeholders, subtitles |
| Text (disabled) | Dim Ash | `#4A4A5E` | Disabled input placeholder |
| Accent | Soft Amber | `#FFAB5E` | Inline highlights, memory category labels, link text |
| Success | Sage Green | `#4CAF82` | Toast: memory saved, notification saved |
| Danger | Dusty Rose | `#E05C6B` | Delete confirmation, error toasts |
| Crisis | Calm Lavender | `#8B7CF6` | Crisis message bubble — distinct but not alarming |

### 2.2 Chat Bubble Colors

| Bubble type | Background | Text |
|---|---|---|
| User message | `#FF6B35` (saffron, full opacity) | `#FFFFFF` |
| Arjun message | `#22223A` (lifted dark) | `#F0EDE8` |
| Crisis message | `#1E1A3E` with `#8B7CF6` left border | `#F0EDE8` |
| System message (limit reached) | `#1A1A2E` with dashed border | `#9B96A0` |

### 2.3 CSS Variables (define once, use everywhere)

```css
:root {
  --color-bg:           #0F0F14;
  --color-surface:      #1A1A2E;
  --color-elevated:     #22223A;
  --color-primary:      #FF6B35;
  --color-accent:       #FFAB5E;
  --color-text:         #F0EDE8;
  --color-text-muted:   #9B96A0;
  --color-text-dim:     #4A4A5E;
  --color-success:      #4CAF82;
  --color-danger:       #E05C6B;
  --color-crisis:       #8B7CF6;
  --color-border:       rgba(255, 255, 255, 0.07);
}
```

---

## 3. Typography

### 3.1 Font Stack

| Role | Font | Why |
|---|---|---|
| UI / Body | **Plus Jakarta Sans** | Warm, modern, slightly rounded. Feels personal not corporate. Works beautifully in both English and alongside Devanagari. |
| Hindi text rendering | **Noto Sans Devanagari** | Best-in-class Devanagari rendering. Load only when Hindi characters are detected. |
| Monospace (if needed) | **JetBrains Mono** | For any technical display (API keys, version strings in Settings > About) |

> Load via Google Fonts. Plus Jakarta Sans weights needed: 400, 500, 600. Noto Sans Devanagari weights: 400, 500.

### 3.2 Type Scale

| Token | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| `--text-xs` | 11px | 400 | 1.4 | Timestamps, labels |
| `--text-sm` | 13px | 400 | 1.5 | Secondary text, settings descriptions |
| `--text-base` | 15px | 400 | 1.65 | Chat message body — slightly larger for readability |
| `--text-md` | 17px | 500 | 1.5 | Arjun's name in top bar, section headings in Settings |
| `--text-lg` | 20px | 600 | 1.3 | Onboarding step headings |
| `--text-xl` | 26px | 600 | 1.2 | Onboarding hero text ("Meet Arjun") |

### 3.3 Typography Rules
- **Never use font-weight 700 (bold) in chat bubbles** — too harsh in a conversational context
- Message content: `--text-base`, weight 400
- Hindi text: always rendered in Noto Sans Devanagari, same size as surrounding text
- Timestamps: `--text-xs`, `--color-text-muted`, right-aligned below bubble
- No all-caps anywhere — too formal for this product

---

## 4. Spacing & Layout

### 4.1 Spacing Scale (8px base grid)

```
4px   — micro gap (icon to label)
8px   — tight (within a component)
12px  — component internal padding
16px  — standard gap between elements
20px  — chat bubble vertical gap
24px  — section spacing
32px  — large section break
48px  — page-level padding
```

### 4.2 Layout Principles
- **Max content width:** 480px, centered on desktop — chat apps feel wrong when too wide
- **Mobile-first:** design at 360px width, then scale up
- **Full viewport height** using `100dvh` (not `100vh`) — critical for Android Chrome keyboard behavior
- Chat message list: `padding: 16px 12px` — tight enough to feel conversational, not clinical
- Bubble max-width: 80% of container — leaves visual breathing room

---

## 5. Component Style

### 5.1 Border Radius

| Element | Radius |
|---|---|
| User chat bubble | `18px 18px 4px 18px` (sharp on bottom-right — "sent") |
| Arjun chat bubble | `18px 18px 18px 4px` (sharp on bottom-left — "received") |
| Buttons (primary) | `12px` |
| Input fields | `12px` |
| Modals / drawers | `20px 20px 0 0` (bottom sheet style on mobile) |
| Settings drawer | `20px 0 0 20px` (slides in from right) |
| Toast notifications | `10px` |
| Memory fact pills | `8px` |

### 5.2 Shadows & Elevation

No heavy drop shadows. Elevation is conveyed through **background color layering** (surface → elevated), not shadows.

```css
/* Only two shadow uses in the entire app */

/* Input bar lift — subtle separation from message list */
--shadow-input: 0 -1px 0 rgba(255,255,255,0.06);

/* Modal / drawer */
--shadow-modal: 0 -8px 32px rgba(0,0,0,0.4);
```

### 5.3 Borders
- Use `rgba(255, 255, 255, 0.07)` for all dividers and borders — extremely subtle
- No visible border on text inputs in focus: use a `box-shadow` glow instead
  ```css
  /* Input focus state */
  box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.4); /* saffron glow */
  ```

### 5.4 Interactive States

| State | Treatment |
|---|---|
| Button hover | Brightness +8%, no scale change |
| Button active (press) | Scale `0.97`, brightness -5% |
| Button disabled | Opacity `0.35`, cursor `not-allowed` |
| Input focus | Saffron glow ring (see above) |
| Memory delete icon hover | Color changes to `--color-danger` |
| Send button (loading) | Replace icon with spinner (saffron color, 16px) |

---

## 6. Dark Mode

**Dark mode only.** No light mode in MVP.

The entire product is designed for dark. The warmth comes from the color palette — `#0F0F14` is not harsh OLED black, it's a very dark blue-black that reads as cozy rather than cold.

> Note: if a user's OS is in light mode, they still see the dark UI. System preference is not respected in MVP.

---

## 7. Key Screen Designs

### 7.1 Chat Screen (`/chat`)

```
┌─────────────────────────────────────────┐  bg: #0F0F14
│                                         │
│  [● Arjun]              [⚙]            │  bg: #1A1A2E, border-bottom: var(--color-border)
│   online indicator: pulsing green dot   │  Arjun name: --text-md, --color-text
│                                         │
├─────────────────────────────────────────┤
│                                         │  Scrollable message list
│                                         │  padding: 16px 12px
│  ┌──────────────────────────┐           │
│  │ Arre bhai, sun raha hoon │           │  Arjun bubble: bg #22223A
│  │ main. Kya hua?           │           │  border-radius: 18px 18px 18px 4px
│  └──────────────────────────┘           │  max-width: 80%
│  9:14 PM                                │  timestamp: --text-xs, --color-text-muted
│                                         │
│           ┌────────────────────────┐    │
│           │ Yaar kuch nahi bas     │    │  User bubble: bg #FF6B35
│           │ thaka hua hoon         │    │  border-radius: 18px 18px 4px 18px
│           └────────────────────────┘    │  color: white
│                                9:15 PM  │
│                                         │
├─────────────────────────────────────────┤
│ [🎤]  [Type a message...      ]  [➤]   │  bg: #1A1A2E
│                                         │  shadow: --shadow-input
└─────────────────────────────────────────┘
```

**Input bar details:**
- Height: `56px`
- Mic icon: `20px`, `--color-text-muted` — hidden on non-Chrome
- Text input: `--text-base`, placeholder `--color-text-dim`
- Send button: `40px` circle, `bg: --color-primary`, white arrow icon
- Send button disabled: opacity `0.35`

**Typing indicator (Arjun is typing):**
- Three dots animation, `--color-text-muted`
- Appears in an Arjun bubble: `bg: #22223A`, `border-radius: 18px`
- Dots scale in sequence: `0.8 → 1.0 → 0.8` with staggered delay

---

### 7.2 Onboarding (`/onboarding`)

**Tone:** Warm, like the app is greeting you personally. Not a form. Not a wizard.

- Background: full `#0F0F14` with a subtle radial gradient at the top: `radial-gradient(ellipse at 50% -20%, rgba(255,107,53,0.12) 0%, transparent 70%)`  — saffron warmth bleeding in from above
- Progress: 4 dots at the top, filled in saffron as steps complete. No text like "Step 2 of 4".
- Step headings: `--text-xl`, `--color-text`, centered
- Subtext / hint: `--text-sm`, `--color-text-muted`, centered
- CTA button: full-width, `height: 52px`, `border-radius: 14px`, `bg: --color-primary`
- Input fields: `bg: #22223A`, `border: 1px solid var(--color-border)`, focus glow

**Step 2 (Meet Arjun):**
- Arjun's avatar: `80px` circle, saffron background, letter "A" or illustration
- Pulsing ring animation: `0 0 0 0 rgba(255,107,53,0.5)` expanding outward — like a heartbeat

---

### 7.3 Settings Drawer

- Slides in from the right on mobile (`transform: translateX(100%)` → `translateX(0)`)
- Width: `100%` on mobile, `360px` max on desktop
- Background: `#1A1A2E`
- Backdrop: `rgba(0,0,0,0.5)` behind drawer
- Section titles: `--text-xs`, `--color-text-muted`, `letter-spacing: 0.08em`, uppercase — subtle section labelling
- List items: `height: 52px`, left icon in `--color-text-muted`, right chevron or toggle
- Dividers: `1px solid var(--color-border)`

**Memory facts:**
- Each fact is a pill/row: category icon + fact text + delete icon (right side)
- Category icons (emoji): 📍 city, 💼 job, 😊 name, ❤️ relationship, 🌀 situation, 💬 other
- Delete icon: trash icon, `--color-text-dim` default → `--color-danger` on hover

---

### 7.4 Auth Page (`/auth`)

- Centered card on desktop (`max-width: 400px`)
- Full screen on mobile
- Same saffron radial gradient at top as onboarding
- Phone/email toggle: two tabs, pill-style switcher — not separate pages
- OTP input: 6 individual boxes, `48px × 52px` each, spaced `8px` apart
  - Auto-advance on digit entry
  - Saffron glow on focused box
  - Shake animation on wrong OTP

---

## 8. Motion & Animation

**Principle: Purposeful, not decorative.** Every animation should reduce cognitive load or signal state change — not show off.

| Interaction | Animation | Duration | Easing |
|---|---|---|---|
| Message send | Bubble slides up from input bar | 200ms | `ease-out` |
| Arjun response stream | Characters appear progressively (existing SSE) | — | — |
| Typing indicator appear | Fade in + translate up 4px | 150ms | `ease-out` |
| Settings drawer open | Slide in from right | 250ms | `cubic-bezier(0.32, 0.72, 0, 1)` |
| Modal appear | Slide up from bottom | 250ms | `cubic-bezier(0.32, 0.72, 0, 1)` |
| Toast appear | Slide down from top + fade in | 200ms | `ease-out` |
| Toast disappear | Fade out | 150ms | `ease-in` |
| Memory delete (optimistic) | Fade out + height collapse | 200ms | `ease-in` |
| Send button press | Scale `0.97` | 100ms | `ease-in-out` |
| OTP wrong entry shake | Horizontal shake ±6px × 3 | 300ms | `ease-in-out` |
| Onboarding step transition | Slide left out / right in | 200ms | `ease-in-out` |

**No** parallax, **no** scroll-triggered animations in MVP — chat list performance is more important.

---

## 9. Mobile Responsiveness

| Breakpoint | Width | Layout notes |
|---|---|---|
| Mobile (primary) | 360px – 480px | Full-width everything. Bottom-sheet modals. Drawer full-width. |
| Mobile (large) | 480px – 640px | Same as above. Input bar slightly taller. |
| Tablet | 640px – 1024px | Chat column max 480px, centered. White space on sides. |
| Desktop | 1024px+ | Chat column 480px centered. Settings appears as side panel, not overlay. |

**Critical mobile rules:**
- Use `100dvh` everywhere — never `100vh`
- Input bar must remain above the Android soft keyboard at all times
- Tap targets: minimum `44px × 44px` (Apple HIG standard) — especially delete icons and OTP boxes
- No hover-only interactions — everything accessible by tap
- Font size minimum `14px` — never smaller, even for timestamps (use `--text-xs` = 11px only for truly tertiary info like version numbers)
- Avoid `position: fixed` on elements inside scroll containers — causes repaint bugs on Android Chrome

---

## 10. Accessibility

| Rule | Implementation |
|---|---|
| Color contrast | All body text on dark backgrounds meets WCAG AA (4.5:1 minimum). `--color-text` (`#F0EDE8`) on `#0F0F14` = 14.5:1. `--color-text-muted` (`#9B96A0`) on `#1A1A2E` = 4.7:1. |
| Focus indicators | All interactive elements have visible focus ring: `2px solid rgba(255,107,53,0.8)`. Never remove `outline` without replacing it. |
| Tap target size | Minimum `44px × 44px` for all buttons, icons, and interactive elements |
| Screen readers | Chat bubbles use `role="log"` on the message list, `aria-live="polite"` for new messages, `aria-label` on icon-only buttons |
| Reduced motion | Wrap all non-essential animations in `@media (prefers-reduced-motion: reduce)` — disable or reduce them |
| Font scaling | UI must remain usable at browser font size 20px (user preference). Use `rem` not `px` for font sizes. |
| Crisis message | Crisis response bubble uses `role="alert"` — ensures screen readers announce it immediately |

---

## 11. Iconography

- **Icon library:** Lucide React (already in TRD) — consistent stroke weight, minimal style
- **Icon size:** `20px` in UI chrome (top bar, settings), `18px` in list items, `16px` inline
- **Icon color:** `--color-text-muted` default, `--color-text` on active/selected states
- **No filled icons** — stroke-only throughout (matches the "not loud" aesthetic direction)
- **Custom icons needed:** None in MVP — Lucide covers all required icons

**Icon map:**
| Element | Icon |
|---|---|
| Settings / top bar | `Settings` |
| Send button | `ArrowUp` |
| Mic / voice | `Mic` |
| Delete memory | `Trash2` |
| Notifications | `Bell` |
| Log out | `LogOut` |
| Back button | `ChevronLeft` |
| Online indicator | Custom: 8px filled circle, `#4CAF82`, CSS pulse animation |

---

## 12. Tone of UI Copy

Design and copy are inseparable. The visual design is warm — the copy must match.

| Situation | Don't write | Write instead |
|---|---|---|
| Daily limit reached | "You have reached your daily message limit." | "Yaar, aaj ke 5 ho gaye! Kal phir milenge. 🌙" |
| Empty memory state | "No memories found." | "Abhi kuch yaad nahi — thoda aur baat karo!" |
| Network error | "Error: request failed." | "Message nahi gaya. Internet check kar. 📶" |
| OTP sent | "OTP has been sent to your phone." | "OTP bhej diya! Check karo. 📱" |
| Memory deleted | "Memory deleted successfully." | "Memory hata di ✅" |
| Notification saved | "Settings saved." | "Done! Arjun yaad rakhega. 🔔" |

**Rules:**
- Hinglish for all in-chat and feedback messages
- English only for legal text (Privacy Policy, Terms)
- Emojis: one per message, max — not multiple
- Exclamation marks: sparingly — only where genuinely warm, not as filler
- No full stops at the end of toast messages — they read as curt

---

*Document Owner: Founder / Solo Developer*  
*Next Review: Before Week 5 (frontend build starts)*  
*Paired Documents: PRD, TRD, AppFlow, BackendSchema*
