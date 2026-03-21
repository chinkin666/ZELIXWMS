# Design System — ZELIXWMS

## Product Context
- **What this is:** Cloud-based Warehouse Management System for Japanese SMB logistics companies
- **Who it's for:** Warehouse managers and operations staff at mid-size logistics companies in Japan
- **Space/industry:** WMS / logistics / supply chain — competing with W3 mimosa, THOMAS, LogiNEXT
- **Project type:** Data-dense web application (dashboard + CRUD + workflow)

## Aesthetic Direction
- **Direction:** Industrial/Utilitarian — function-first, data-dense, with warmth
- **Decoration level:** Minimal — typography and spacing do all the work
- **Mood:** Professional, reliable, clean. A tool you trust for 8-hour shifts, not a showcase. Feels like a well-organized warehouse — everything in its place, nothing wasted.
- **Reference sites:** Softeon WMS, Deposco, Oracle WMS Cloud

## Typography
- **Display/Hero:** DM Sans 700 — clear geometric sans-serif, strong hierarchy, supports Latin + CJK fallback
- **Body:** DM Sans 400/500 — highly readable at small sizes, tabular-nums for data tables
- **UI/Labels:** DM Sans 500 (same as body, semi-bold for labels)
- **Data/Tables:** DM Mono 400 — tracking numbers, SKUs, barcodes, lot numbers. Monospace keeps columns aligned.
- **Code:** DM Mono 400
- **Loading:** Google Fonts CDN (`family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500`)
- **CJK Fallback:** system-ui, -apple-system, 'Hiragino Kaku Gothic ProN', 'Yu Gothic', sans-serif
- **Scale:**
  - 3xl: 36px / 2.25rem — page titles
  - 2xl: 28px / 1.75rem — stat values
  - xl: 20px / 1.25rem — section titles
  - lg: 16px / 1rem — subheadings
  - md: 15px / 0.9375rem — body text
  - sm: 13px / 0.8125rem — table cells, form inputs
  - xs: 11px / 0.6875rem — labels, captions
  - 2xs: 10px / 0.625rem — badges, tertiary text

## Color
- **Approach:** Restrained — one accent + warm neutrals, color is rare and meaningful
- **Primary:** #2563EB (blue) — professional, reliable, logistics industry standard. Used for: CTAs, active nav, links, focus rings
- **Primary Hover:** #1D4ED8
- **Primary Light:** #EFF6FF — selected rows, active backgrounds
- **Neutrals (warm gray):**
  - 50: #F8F9FA (background)
  - 100: #F3F4F6
  - 200: #E5E7EB (borders)
  - 300: #D1D5DB
  - 400: #9CA3AF (tertiary text)
  - 500: #6B7280 (secondary text)
  - 600: #4B5563
  - 700: #374151
  - 800: #1F2937 (primary text, sidebar bg)
  - 900: #111827
- **Semantic:**
  - Success: #059669 / light: #ECFDF5 — completed, delivered, confirmed
  - Warning: #D97706 / light: #FFFBEB — pending, low stock, attention
  - Error: #DC2626 / light: #FEF2F2 — failed, cancelled, critical alerts
  - Info: #0891B2 / light: #ECFEFF — informational, new items
- **Dark mode strategy:** Invert surface colors (bg: #111827, surface: #1F2937), reduce color saturation 10-20%, keep semantic colors

## Spacing
- **Base unit:** 8px
- **Density:** Comfortable — warehouse staff need to scan quickly without eye strain
- **Scale:**
  - 2xs: 2px
  - xs: 4px
  - sm: 8px
  - md: 16px
  - lg: 24px
  - xl: 32px
  - 2xl: 48px
  - 3xl: 64px

## Layout
- **Approach:** Grid-disciplined — strict columns, predictable alignment across 109 screens
- **Grid:** 12-column grid, 240px sidebar + fluid content area
- **Max content width:** 1440px
- **Sidebar:** Dark (Gray 800), fixed, collapsible on mobile
- **Border radius:**
  - sm: 4px — buttons, inputs, badges
  - md: 8px — cards, dropdowns, modals
  - lg: 12px — dashboard container, large panels
  - full: 9999px — status badges, avatar

## Motion
- **Approach:** Minimal-functional — only animations that aid comprehension
- **Easing:** enter: ease-out, exit: ease-in, move: ease-in-out
- **Duration:**
  - micro: 50-100ms — button hover, toggle
  - short: 150-250ms — dropdown open, tooltip
  - medium: 250-400ms — modal open, sidebar collapse
  - long: 400-700ms — page transitions (use sparingly)
- **Rule:** If removing the animation doesn't reduce understanding, remove it

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-22 | Initial design system created | Created by /design-consultation based on WMS industry research + product context |
| 2026-03-22 | DM Sans over Geist/Inter | DM Sans: Google Fonts availability, tabular-nums, clean geometry. Inter/Roboto too ubiquitous in WMS space. |
| 2026-03-22 | Warm gray (#F8F9FA) over cold gray | Differentiator — most WMS use cold grays. Warm gray adds approachability without sacrificing professionalism. |
| 2026-03-22 | Dark sidebar | 109 pages need strong nav structure. Dark sidebar provides clear visual anchor + contrast. |
