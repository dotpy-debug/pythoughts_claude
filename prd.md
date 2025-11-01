# Blog Platform PRD — “Medium‑style” App

> Goal: Ship a modern, Medium‑like publishing platform with clean reading UX, robust writer tooling, analytics (“Stats”), and a social graph (follow, lists, highlights, responses). Scope is derived from the provided screenshots (Home feed, Library, Profile, Stories, Stats, Following, Suggestions, Settings) and expanded into a production‑ready spec.

---

## 1) Executive Summary

- **Vision:** A writer‑centric network where anyone can publish, collect, and discover long‑form content. Readers get a focused, low‑noise reading experience; writers get best‑in‑class authoring, distribution, and analytics.
- **Primary outcomes**
  - Time‑to‑first‑publish < **5 min**
  - 95th percentile **LCP < 2.8s** on 4G
  - Core Web Vitals **passing** on article pages
  - SEO parity with leading blogs (sitemaps, RSS, structured data)

- **Platforms:** Responsive Web + installable PWA (iOS/Android).

---

## 2) Personas

1. **Reader** — discover stories; follow writers/pubs; save to lists; highlight passages; respond.
2. **Writer** — draft & publish; manage stories; curate lists; view analytics; engage with readers.
3. **Publication Owner (Phase 1.5+)** — run multi‑author publications; editorial workflow; curation.

---

## 3) Information Architecture

**Global left nav:** Home • Library • Profile • Stories • Stats • Following • Suggestions (Find writers/pubs)

**Home tabs:** For you | Featured

**Library tabs:** Your lists • Saved lists • Highlights • Reading history • Responses

**Settings tabs:** Account • Publishing • Notifications • Membership & payment • Security & apps

**Top bar:** Search • Write • Notifications • Avatar Menu

**Right rail modules:** Staff picks • Onboarding promos (e.g., Writing 101)

---

## 4) Core Features & Flows

### 4.1 Reader Experience

**Feeds**

- **For You:** Personalized ranking (follow graph, interests, quality, recency).
- **Featured:** Editorial/algorithmic curation.
- **Following:** Stream of posts by followed writers/publications.

**Story Page**

- Clean typography; cover image; author card; publication badge; read time; tags; optional **TOC** (left rail desktop); reactions; highlights; comments; next‑read recommendations.
- Reader actions: follow author/pub, clap/like, highlight text, save to list, share, report.

**Library**

- **Your lists:** create, rename, reorder stories; private by default with public toggle.
- **Saved lists:** lists you follow.
- **Highlights:** your highlights as quote chips linking back to anchored ranges.
- **Reading history:** resume position; last‑read timestamps.
- **Responses:** your comments/replies with thread context.

**Search**

- Autocomplete across stories, writers, publications, tags, lists. Filters: recency, tag, author, pub, reading time.

### 4.2 Writer Experience

**Editor**

- TipTap/MDX hybrid; headings; lists; images; video embeds; code blocks with copy; callouts; tables; footnotes; math; AI assist.
- Always‑visible **TOC** (desktop); collapsible on mobile. Autosave + version history + preview.

**Publishing**

- Title, subtitle, cover media, tags, canonical URL, SEO (meta/OG), audience (public/unlisted/members), schedule.
- Publication selection (if enabled), content warnings.

**Stories Management**

- Drafts | Scheduled | Published with filters; quick actions (Edit, View, Unpublish, Duplicate, Delete).

**Lists Management**

- Curated reading lists with notes; public/private; shareable URLs.

**Stats (Analytics)**

- Overview by range (Today/7D/30D/custom): **Presentations** (impressions), **Views**, **Reads** (≥ threshold scroll/dwell), **Followers gained**, **Subscribers**.
- Per‑story breakdown; sources (Home, Following, External, Search); geos/devices. Hourly updates.

### 4.3 Social & Engagement

- Follow writer/publication; reactions (“claps” or likes); comments with threading & moderation; highlights by range; recommendations; writer suggestions module.

### 4.4 Settings & Account

- **Account:** email; username/subdomain; profile info (name/photo/pronouns/bio); profile design.
- **Publishing:** defaults (tags, canonical, cover styles); default publication.
- **Notifications:** in‑app/email granular toggles.
- **Membership & payment:** Stripe connect (Phase 1.5+); subscription tiers.
- **Security & apps:** sessions; 2FA; API tokens; connected apps.

---

## 5) Non‑Functional Requirements

- **Performance:** LCP < 2.8s; CLS < 0.1; TBT < 200ms; ISR caches 60–300s.
- **SEO:** SSR + ISR; sitemap; RSS; canonical; JSON‑LD (Article/BlogPosting).
- **A11y:** WCAG 2.2 AA; keyboard‑navigable editor; reduced motion.
- **Privacy & Safety:** RLS; content moderation & reports; GDPR/DSAR handling.
- **Observability:** logs, tracing, metrics; **audit logs** for content/settings changes.
- **i18n:** RTL‑ready; localized dates & numerals.

---

## 6) Tech Stack (Recommended)

- **Frontend:** Next.js 15 (App Router, React 19), TypeScript, Tailwind, shadcn/ui (Radix).
- **Editor:** TipTap + MDX plugins (syntax highlight, math, callouts, footnotes); image/video upload with server transforms (sharp).
- **API:** Next.js Route Handlers (REST) + webhooks; optional tRPC.
- **Auth:** NextAuth/Clerk; OAuth (Google/GitHub/Twitter) + email.
- **DB:** Postgres 16/17 + Drizzle ORM.
- **Search:** Postgres full‑text + trigram; upgrade path to OpenSearch/Meilisearch.
- **Queue/Jobs:** BullMQ + Redis (analytics rollups, scheduled publish, email digests).
- **Storage:** S3‑compatible (R2/S3/MinIO) for images/files; image CDN resize.
- **Realtime:** WebSocket/SSE for comments/notifications; presence (later).
- **Payments:** Stripe (Phase 1.5+).
- **Infra:** Docker, Nixpacks, Dokploy/Railway; Cloudflare CDN; IaC scripts.

---

## 7) Data Model (Core)

**users** — id, email, username, name, photo_url, bio, pronouns, created_at

**profiles** — user_id, display_name, headline, social links, theme

**stories** — id, author_id, publication_id?, title, subtitle, slug, cover_url, reading_time_sec, status (draft/scheduled/published/unpublished), visibility (public/unlisted/members), scheduled_at, published_at, canonical_url, seo_title, seo_description, language, word_count, created_at, updated_at

**story_content** — story_id, version, content_json (TipTap), content_html, mdx?, created_at

**story_versions** — id, story_id, version, snapshot_meta, created_at

**tags** — id, name (unique), slug

**story_tags** — story_id, tag_id

**lists** — id, owner_id, title, description, is_public, cover_url, created_at, updated_at

**list_items** — list_id, story_id, position, note

**bookmarks** — user_id, story_id, created_at

**highlights** — id, user_id, story_id, start_pos, end_pos, quote_text, note, created_at

**follows** — follower_id, target_user_id or publication_id, created_at

**reactions** — user_id, story_id, type (clap/like), count, created_at

**comments** — id, story_id, parent_comment_id, user_id, content_json/html, created_at, deleted_at

**views** — id, story_id, user_id?, session_id, referrer, utm, created_at

**reads** — id, story_id, user_id?, session_id, percent, created_at

**analytics_daily** — date, story_id, presentations, views, reads, followers_gained, subscribers_gained

**notifications** — id, user_id, type, payload_json, read_at, created_at

**publications** (Phase 1.5+) — id, owner_id, name, handle, logo_url, about, created_at

**publication_members** — publication_id, user_id, role (owner/admin/editor/writer)

**feature_flags**, **audit_logs**, **reports**, **blocks**, **api_tokens** (platform)

**Indexes (examples)**

- stories(author_id, status, published_at desc)
- story_tags(tag_id), tags(slug unique)
- views(story_id, created_at), reads(story_id, created_at)
- follows(follower_id), follows(target_user_id)
- GIN full‑text on stories(title, subtitle, rendered_text) + trigram on slug

---

## 8) Key Pages & Acceptance Criteria

### 8.1 Home (For you / Featured)

- Loads personalized feed < 800ms server time with cached ranking.
- Infinite scroll. Cards show title, subtitle snippet, author/pub, date, engagement chips, thumbnail.
- Right rail: staff picks, onboarding modules.

### 8.2 Following

- Chronological (or lightly ranked) feed of followed authors/pubs. Empty state prompts following.

### 8.3 Library

- Tabs: Your lists, Saved lists, Highlights, Reading history, Responses.
- Create new list (private by default). Drag & drop reordering. Highlights page shows anchored quotes.

### 8.4 Stories (Writer Dashboard)

- Drafts | Scheduled | Published; sort/filter; quick actions.

### 8.5 Editor & Publish

- Rich blocks (headings, image with caption/focal point, code with copy, callouts, table).
- Autosave every 3s; version history; preview modes. Publish drawer with SEO, canonical, schedule.
- Scheduled posts are published by a job precisely at scheduled time.

### 8.6 Stats

- Chips for Presentations, Views, Reads, Followers, Subscribers with brushing date picker.
- Hourly updates; per‑story breakdown; CSV export; tooltips for metric definitions (e.g., Read = ≥30% scroll or ≥45s dwell).

### 8.7 Profile

- Public profile `/@username` with bio, avatar, follower count, recent stories & public lists.
- Private “Profile design” area for theme/banner.

### 8.8 Settings

- Parity with tabs seen in screenshots; email verification flow; 2FA; session manager.

---

## 9) Ranking & Recommendations (For You)

- Inputs: follow graph, story quality (engagement/reads), freshness, similarity to past reads/highlights/saves, topics.
- Heuristics (v1):
  - +Followed author boost; +Topic similarity; +High completion (>60%).
  - Recency decay (half‑life 72h). Negative weights for hides/reports.

- Delivery: nightly user embeddings + hourly re‑rank; cache per‑user in Redis (5–10 min).

---

## 10) Events & Analytics

Server & client events: `story_presented`, `story_viewed`, `story_read`, `reaction_added`, `comment_created`, `highlight_created`, `list_item_added`, `follow_created`, `search_performed`, `share_clicked`.

Attribution: UTM & referrer class (Home, Following, External, Search). Hourly rollups into analytics_daily.

---

## 11) Moderation & Safety

- Reporting flow for story/comment/user → staff queue.
- Auto‑heuristics for spam/abuse; rate limits for comments/reactions/highlights.
- Block/mute; shadow‑hide repeated offenders. Staff **audit logs** for actions.

---

## 12) Security & Auth

- JWT sessions with rotation; TOTP 2FA; device/session manager.
- Postgres RLS: users can only edit their own content; publication roles gate access.
- CSRF on mutations; signed upload URLs; verified webhooks; feature flags per route.

---

## 13) Delivery Architecture

- **Rendering:** SSG/ISR for story & profile pages; SSR for personalized feeds.
- **Caching:** CDN (static, images); Redis for feed caches & counters.
- **Jobs:** scheduled publish, analytics rollups, weekly digests, search indexing.
- **Email:** publish confirmations, responses, follows; weekly reader/writer digests.

---

## 14) SEO & Sharing

- Open Graph & Twitter cards; canonical URLs; prev/next for pagination.
- XML sitemaps (stories, tags, profiles) + RSS for author/publication.
- URL patterns:
  - Story: `/@username/<slug>-<shortId>`
  - Profile: `/@username`
  - Tag: `/tag/<slug>`
  - List: `/@username/l/<slug>`

---

## 15) Roadmap

**MVP (6–8 weeks)**

- Auth, profiles, editor, publish/unpublish, story page, basic For You/Following feeds, lists & bookmarks, comments, reactions, basic stats (views/reads), search, core settings.

**v1**

- Highlights, reading history, hourly analytics with sources, suggestions module, staff picks, email digests, advanced SEO (RSS + sitemaps), TOC left rail.

**v1.5**

- Publications (multi‑author), submissions workflow, paywall/subscriptions, PWA polish, advanced moderation.

---

## 16) Testing & Quality

- Unit tests (content model, ranking logic).
- Playwright e2e (publish flow, list management, follow/unfollow, comment).
- Lighthouse CI budgets; visual regression on typography & code blocks.
- Load: target 1k RPS read traffic sustained.

---

## 17) Success Metrics

- **Reader:** session length, completion rate, WAU/MAU, return rate D7/D30.
- **Writer:** time‑to‑publish, weekly publishing rate, % with >100 monthly views.
- **Network:** follows per MAU, saves per MAU, comments per story.
- **Perf:** Core Web Vitals pass rate, 95p TTFB on stories.

---

## 18) Open Questions

- Member‑only content in v1 vs v1.5?
- Lists default private, public toggle? (screenshot shows lock icon)
- Topic subscriptions alongside writer follows in v1?

---

## 19) Developer Checklist (Build‑ready)

- [ ] Next.js app skeleton (App Router, TS, shadcn/ui, Tailwind tokens)
- [ ] Drizzle schema + migrations & indexes
- [ ] TipTap editor with upload adapter (S3) + TOC plugin
- [ ] Story SSG/ISR route + SEO & OG images
- [ ] Feed APIs (For You/Featured/Following) + Redis cache
- [ ] Lists & highlights APIs; comment threads with moderation flags
- [ ] Stats pipeline: ingestion → hourly rollups → charts
- [ ] Search endpoint with FT index & suggestions
- [ ] Settings pages parity with screenshots
- [ ] Notifications (in‑app + email) with preferences
- [ ] Admin tools: reports queue, user/story actions, audit logs
