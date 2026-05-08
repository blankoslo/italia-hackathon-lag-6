# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Friluftskompis** — a Norwegian outdoor trip planning app for Hackathon 2026. Aggregates Yr, Kartverket, DNT, Entur, and more into a single planning surface. This is a competition: focus efforts on features that win badges.

- Badges: https://hackathon.blank.no/badges
- Storymap: https://blank.avion.io/share/LXuAxH6skQb65ndHv
- Product vision + scenarios: `docs/frliuftskompis.md`
- User stories (MVP + full backlog): `docs/brukerhistorier.md`
- Available APIs: `docs/apis.md`

## Commands

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build (runs in CI on every push to main)
npm run lint     # ESLint
```

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind CSS v4)
- **React 19**
- Source lives in `src/app/`

## Deployment

Vercel (free tier) — connected to the GitHub repo. Every push to `main` triggers a production deploy. CI runs lint + build via `.github/workflows/ci.yml`.

## MVP user stories (9 stories = E1 badge, 100p)

| ID | Story | Phase |
|----|-------|-------|
| D1 | Free-text AI search | Discover |
| D2 | DNT cabins on map | Discover |
| B1 | Weather forecast for trip period | Decide |
| B3 | Route planning between cabins | Decide |
| B6 | Day-by-day multi-day timeline | Decide |
| G1 | Invite participants via shareable link | Gather |
| P1 | AI-generated packing list | Prepare |
| T1 | Offline maps and route info | Go |
| R1 | Expense tracking and cost split | Return |

## Key API notes

All APIs documented in `docs/apis.md`. Critical constraints:

- **Yr** (`api.met.no`): Requires `User-Agent` header; max 4 decimal coords; HTTPS only
- **Kartverket WMTS**: `cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png` — attribution `© Kartverket` required
- **UT.no GraphQL**: `Origin: https://ut.no` header required; cursor-based pagination
- **NVDB**: Coordinates are UTM33/EPSG:25833 — must convert to WGS84 before rendering
- **Claude API**: Use Haiku 4.5 for fast/cheap calls, Sonnet 4.6 for complex planning; always label AI-generated content (system requirement S3)

## Badge strategy

Always label AI-generated content vs factual data (required by user story S3 — affects multiple badges).
Recommended build order: map + cabins (D2) → weather (B1) → search (D1) → route (B3) → timeline (B6) → invite link (G1) → packing list (P1) → offline (T1) → expense split (R1).
