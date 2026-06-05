# Changelog

All notable changes to GilaniAI are documented here.
This project follows [Semantic Versioning](https://semver.org/) — `MAJOR.MINOR.PATCH`.

---

## [1.0.0] — 2026-06-05

### 🚀 Initial Public Release

#### Features
- **AI Tutor** — Socratic curriculum-grounded AI chat with per-thread history and streaming responses
- **Practice Quizzes** — Auto-generated multi-choice quizzes per KCSE/CBC topic with scoring and weak topic tracking
- **Study Notes** — AI-powered summarisation with Markdown rendering, export to PDF/DOCX, and KaTeX math support
- **Study Planner** — Personalised 7-day plan generation with daily task view and completion tracking
- **Analytics** — Streak tracking, topic performance heatmap, and study time breakdown
- **Teacher Escalation** — Students can escalate to a real teacher; teachers see a dedicated review dashboard
- **Admin Panel** — Role management (student / teacher / admin) with Supabase auth integration
- **PWA** — Installable on Android and iOS with offline static-asset caching via service worker

#### Performance
- Route-level lazy loading (`React.lazy`) for `MarkdownRenderer`
- Vite code splitting per route
- Immutable CDN caching for all `/assets/*` files via `vercel.json`

#### SEO / SEM
- `robots.txt` with correct allow/disallow rules
- `sitemap.xml` for all public pages
- Full Open Graph and Twitter Card meta per page
- JSON-LD `SoftwareApplication` structured data schema
- `noindex` on all authenticated/private routes
- Canonical URLs on all public pages

#### PWA
- Web App Manifest with 192 × 192 and 512 × 512 PNG icons (regular + maskable)
- Service worker with network-first for SSR pages, cache-first for static assets
- Apple Touch Icon and `theme-color` meta

---

## How to Release a New Version

```bash
# Patch — bug fix (1.0.0 → 1.0.1)
npm version patch

# Minor — new feature, backwards-compatible (1.0.0 → 1.1.0)
npm version minor

# Major — breaking change (1.0.0 → 2.0.0)
npm version major
```

After bumping the version, also update `CACHE_NAME` in `public/sw.js` to match:
```js
const CACHE_NAME = 'gilaniai-v1.0.1'; // ← bump to new version
```

Then commit, tag, and push:
```bash
git add .
git commit -m "chore: release v$(node -p "require('./package.json').version")"
git tag -a "v$(node -p "require('./package.json').version")" -m "Release v$(node -p "require('./package.json').version")"
git push origin main --tags
```

---

## Versioning Policy

| Change type | Example | Version bump |
|---|---|---|
| Bug fix | Fix SW crash on `/dashboard` | `patch` — `1.0.x` |
| New feature | Add flashcards module | `minor` — `1.x.0` |
| Breaking change | Rebuild auth flow / DB schema | `major` — `x.0.0` |
