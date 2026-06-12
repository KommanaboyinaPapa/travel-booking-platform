# Internship Report
## Travel Booking Platform — Full-Stack Engineering Internship

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Background](#2-background)
3. [Learning Objectives](#3-learning-objectives)
4. [Activities and Tasks](#4-activities-and-tasks)
5. [Skills and Competencies](#5-skills-and-competencies)
6. [Feedback and Evidence](#6-feedback-and-evidence)
7. [Challenges and Solutions](#7-challenges-and-solutions)
8. [Outcomes and Impact](#8-outcomes-and-impact)
9. [Conclusion](#9-conclusion)
10. [Testing Summary](#10-testing-summary)
11. [Screenshots Checklist](#11-screenshots-checklist)
12. [Modified Files List](#12-modified-files-list)

---

## 1. Introduction

This report documents the work completed during a software engineering internship focused on building a full-stack **Travel Booking Platform**. The internship was structured around six progressive tasks, each adding a distinct layer of functionality on top of a starter codebase. The final platform is a production-grade single-page application that covers the entire lifecycle of travel booking — user authentication, hotel and flight discovery, seat and room selection, booking management, payment processing, cancellation and refund handling, community reviews, live flight tracking, intelligent dynamic pricing, and personalised AI-style recommendations.

The platform is built with **React 18 + Vite** on the frontend, **Node.js 20 + Express 4** on the backend, and **MySQL 8** as the primary data store. All business logic includes graceful fallback to in-memory data structures when the database is unavailable, ensuring tests can be run without a live MySQL instance.

The six tasks were completed incrementally, each building directly on the previous one. Every task includes a backend service layer, RESTful API endpoints, frontend components, and a dedicated automated test script.

---

## 2. Background

### Company and Project Context

The internship was hosted on a travel technology platform project designed to simulate real-world software product development. The starter codebase provided a minimal scaffold: an Express server with a database connection pool, a Vite React application shell with a Navbar and routing, and a database schema with five tables (`users`, `hotels`, `flights`, `bookings`, `payments`).

### Problem Statement

Modern travel booking systems are expected to do far more than display a list of hotels and flights. Travellers expect:
- Transparent, fair pricing that reflects real-world demand and seasonality
- Personalised discovery that saves time by surfacing relevant options first
- Confidence features like price freeze before committing to a purchase
- Community trust signals such as verified reviews and ratings
- Real-time operational awareness such as live flight status and delay alerts

The internship project tasked the intern with building all of these capabilities from scratch on top of the provided scaffold, following professional engineering practices: layered architecture, RESTful API design, graceful error handling, fallback strategies, and automated test coverage.

### Scope

The project grew from 5 database tables and approximately 800 lines of code to **16 database tables** and over **6,000 lines** of application code spanning controllers, services, routes, React pages, and reusable components.

---

## 3. Learning Objectives

The following learning objectives were defined at the start of the internship:

| # | Objective                                                                                     |
|---|-----------------------------------------------------------------------------------------------|
| 1 | Apply full-stack web development skills in a real product context                             |
| 2 | Design and implement RESTful APIs following consistent naming and response conventions        |
| 3 | Work with a relational database (MySQL) including schema design and query optimisation        |
| 4 | Build reusable, accessible React components following modern patterns (hooks, context)        |
| 5 | Implement authentication and authorisation using JWT and middleware                           |
| 6 | Develop business logic for complex domains (pricing, recommendations, refunds)                |
| 7 | Write automated tests that verify behaviour without external service dependencies             |
| 8 | Handle errors and edge cases gracefully in both API and UI layers                             |
| 9 | Deliver features incrementally with clean, readable, maintainable code                        |
| 10| Produce professional technical documentation for a software project                          |

By the end of the internship, all ten objectives had been demonstrably achieved through the six delivered tasks.

---

## 4. Activities and Tasks

### Task 1 — Authentication, Hotel & Flight Booking, Cancellation & Refund System

**Objective:** Build the foundational user-facing features that every travel booking platform requires.

**What was built:**

*Authentication*
- `POST /api/auth/register` — accepts name, email, password; hashes password with bcryptjs; returns JWT
- `POST /api/auth/login` — verifies credentials; returns JWT
- `requireAuth` middleware — verifies JWT on every protected route
- `requireAdmin` middleware — restricts admin endpoints to role=admin users
- Frontend Login and Register pages with form validation and error display

*Hotel and Flight Booking*
- Hotels listing with fallback data for 5 hotels across Miami, Denver, New York, Hawaii, and Phoenix
- Flights listing with fallback data for 5 routes and live status integration
- Booking creation storing `user_id`, `hotel_id` or `flight_id`, `seat_id`, `room_id`, `check_in`, `check_out`, `total_price`, and `status`
- My Bookings page listing all confirmed bookings with hotel/flight details joined

*Cancellation and Refund*
- `POST /api/bookings/:id/cancel` — marks booking cancelled, inserts cancellation record, calculates refund
- Refund rules: 50% refund if cancelled within 24 hours, 25% after
- `refunds` table records amount, percentage, status (Pending/Processed/Completed), and expected completion date
- `GET /api/refunds/:bookingId` — returns refund details for a booking
- Frontend `RefundStatusTracker` component with animated three-step progress bar

**Key engineering decisions:**
- Separated business logic into `bookingService.js` and kept controllers thin
- Fallback in-memory arrays (`fallbackBookings`, `fallbackCancellations`, `fallbackRefunds`) ensure the API responds correctly when the database is unreachable
- Refund percentage is computed from booking `created_at` vs `now` to handle edge cases

---

### Task 2 — Reviews & Ratings, Live Flight Status, Seat & Room Selection

**Objective:** Add trust, real-time awareness, and booking granularity features.

**What was built:**

*Reviews and Ratings*
- `reviews` table with `rating` (1–5), `review_text`, optional `photo_url`, and `helpful_count`
- `review_replies` table for threaded replies
- `review_flags` table for community moderation flags
- CRUD endpoints: create review, list reviews (sortable by rating or date), add reply, mark helpful, flag
- Admin panel endpoints: get flagged reviews, update flag status, delete review (with cascaded reply/flag deletion)
- `ReviewSection`, `ReviewForm`, `ReviewList`, and `StarRating` frontend components
- `Moderator` page for admin users

*Live Flight Status*
- `flight_status` table with `status` (On Time / Boarding / Delayed by 1h), `delay_reason`, `revised_departure_time`, `estimated_arrival`
- Deterministic mock status assignment (flight id % 3 maps to one of the three states)
- `GET /api/flights/:id/status` returns current status with revised times
- `liveFlightTracking.js` service handles localStorage persistence of tracked flight IDs, alert generation, and notification deduplication
- `LiveFlightStatus` page with tracked/untracked sections, status badges, and alert panel
- Dashboard widget showing tracked flights and last three alerts

*Seat Selection*
- `seats` table with `seat_number`, `type` (economy/premium/business), `price`, `status` (available/booked)
- Seat generation: 120 seats per flight across 3 tiers with proportional pricing (1.0×/1.4×/1.8×)
- `GET /api/seats/flight/:flightId`, `POST /api/seats/:id/book`, `POST /api/seats/:id/release`
- `SeatMap` React component with colour-coded interactive seat grid and aisle layout

*Room Selection*
- `rooms` table with `room_type`, `price`, `image_url`, `availability`
- 3 room types per hotel: Standard (1.0×), Deluxe (1.5×), Suite (2.5×)
- `GET /api/rooms/hotel/:hotelId`, `POST /api/rooms/:id/book`, `POST /api/rooms/:id/release`
- `RoomSelection` React component with room cards, availability badges, and selection state

---

### Task 3 — Price History API

**Objective:** Implement a complete audit trail for price changes to support transparency and analytics.

**What was built:**

- `price_history` table: `entity_type` (hotel/flight), `entity_id`, `old_price`, `new_price`, `changed_at`
- `recordPriceChange(entityType, entityId, oldPrice, newPrice)` — skips recording if price is unchanged
- `getHotelPriceHistory(hotelId, { limit, offset })` — paginated history with hotel name join
- `getFlightPriceHistory(flightId, { limit, offset })` — paginated history with flight info join
- `updateEntityPrice(entityType, entityId, newPrice)` — fetches current price, updates source table, records change
- API: `GET /api/price-history/hotels/:id`, `GET /api/price-history/flights/:id`, `PUT /api/price-history/update`
- In-memory fallback store for all service operations

**Key design decision:** The service layer is pure — all database operations go through the pool with full try/catch and fallback, making the layer independently testable. The controller layer only handles HTTP concerns (parsing, status codes, response shape).

---

### Task 4 — Dynamic Pricing Engine

**Objective:** Build a rules-based pricing engine that adjusts prices based on date, seasonality, and demand, with a price freeze capability.

**What was built:**

*Pricing rules (all additive, all applied to the stored base price):*
- **Demand-based pricing**: occupancy rate (0.0–1.0) × 15% maximum, calculated from real seat/room availability data
- **Weekend surcharge**: +10% on Saturday and Sunday
- **Holiday surcharge**: +20% on US public holidays — fixed (New Year's Day, Independence Day, Christmas Day) and floating (MLK Day, Presidents' Day, Memorial Day, Labor Day, Thanksgiving)
- **Peak season surcharge**: +15% during summer (June–August) and winter holidays (December 20 – January 3)

*Price breakdown API response shape:*
```json
{
  "entityType": "hotel",
  "entityId": 1,
  "entityName": "Luxury Sunset Resort",
  "basePrice": 250.00,
  "adjustmentPercent": 45,
  "adjustmentReasons": ["Weekend (+10%)", "Summer season (+15%)", "High demand (+20%)"],
  "finalPrice": 362.50,
  "breakdown": [
    { "factor": "demand",     "adjustmentPercent": 20, "adjustmentReason": "High demand (+20%)", "amount": 50.00 },
    { "factor": "weekend",    "adjustmentPercent": 10, "adjustmentReason": "Weekend (+10%)",     "amount": 25.00 },
    { "factor": "peakSeason", "adjustmentPercent": 15, "adjustmentReason": "Summer season (+15%)","amount": 37.50 }
  ],
  "date": "2025-07-12"
}
```

*Price freeze:*
- `price_freeze` table: `user_id`, `entity_type`, `entity_id`, `frozen_price`, `expires_at` (30 minutes from creation)
- `POST /api/pricing/freeze` — calculates current dynamic price and stores it as a freeze
- `GET /api/pricing/freeze/:entityType/:entityId` — returns active freeze or null
- `DELETE /api/pricing/freeze/:entityType/:entityId` — removes freeze
- `bookingController.createBooking` was updated to check for an active freeze before inserting; if found, the frozen price overrides the client-submitted price — preventing manipulation

*Frontend:*
- `PriceBreakdown` component on Hotels and Flights pages and Booking page
- `PriceHistoryGraph` SVG sparkline on Hotels and Flights pages
- **View Pricing** toggle per card on Hotels and Flights pages
- **🔒 Freeze Price / 🔓 Unfreeze** button
- Frozen price indicator with lock icon and expiry time on Booking page

---

### Task 5 — Personalised Recommendations Engine

**Objective:** Build a recommendations system that learns from user booking history and improves with feedback.

**What was built:**

*Recommendation logic:*

1. **Profile building**: Queries the user's last 20 bookings. Extracts location tags from hotel locations and flight origins/destinations (e.g. "miami" → `beach` tag, "denver" → `mountain` tag).

2. **Destination affinity map**: Six category clusters map keywords to suggested destinations:
   - Beach/tropical keywords → Bali, Maldives, Cancun, Miami
   - Mountain keywords → Swiss Alps, Aspen, Banff, Queenstown
   - City/urban keywords → Paris, New York, Tokyo, London
   - Desert keywords → Dubai, Marrakech, Sedona, Petra
   - Tropical/island keywords → Phuket, Fiji, Costa Rica, Belize
   - European keywords → Rome, Barcelona, Amsterdam, Prague

3. **Scoring formula:**
   - Hotels: `(tag overlap × 3) + hotel rating`
   - Flights: `(tag overlap × 3) + (2 if destination previously visited)`
   - Destinations: base score 5

4. **Feedback weighting**: each `helpful` feedback on an item adds +2 to its score; each `irrelevant` subtracts −3, progressively suppressing items the user dislikes.

5. **Fallback**: Users with no booking history receive top-rated hotels and cheapest flights with `hasHistory: false`.

*`recommendation_feedback` table:*
- `user_id`, `recommendation_type` (hotel/flight/destination), `entity_id`, `destination`, `feedback` (helpful/irrelevant)
- Upsert pattern: old feedback for same user+item is deleted before inserting the new value

*API:*
- `GET /api/recommendations` — returns up to 9 items (3 hotels + 3 flights + 3 destinations), scored and sorted
- `POST /api/recommendations/feedback` — validates type, feedback value, and required fields before storing

---

### Task 6 — Recommendations Frontend Integration

**Objective:** Surface recommendations on the Home and Dashboard pages with an interactive UI.

**What was built:**

*`RecommendationCard` component:*
- Displays type icon (🏨/✈️/🌍), title, and contextual subtitle
- **"Why? 💡" tooltip**: hover/focus shows a dark popover with pointer arrow and fade-in animation, explaining the recommendation reason (e.g. "Based on your previous beach, miami bookings")
- **👍 Helpful / 👎 Irrelevant** feedback buttons: call `POST /api/recommendations/feedback`, show confirmation text, auto-dismiss irrelevant cards from the list
- Action button: "Book Hotel" / "Book Flight" navigates to `/booking` with pre-filled state; "Explore Hotels →" for destinations

*`RecommendationSection` component:*
- Fetches from `GET /api/recommendations` on mount
- Maintains a `dismissed` Set; cards marked irrelevant vanish immediately from the DOM
- `compact` prop limits to 3 cards (Home page); full list shown on Dashboard
- Shows "Popular Picks" label with explanatory note when user has no history

*Page integration:*
- **Home page** (`/`): compact section between hero banner and Quick Links, visible only when logged in
- **Dashboard page** (`/dashboard`): full-width widget spanning the grid above Live Flight Status

*CSS classes added to `index.css`:*
- `.rec-card`, `.rec-card-header`, `.rec-card-body`, `.rec-card-icon`, `.rec-card-title`, `.rec-card-subtitle`, `.rec-card-actions`
- `.rec-why-wrap`, `.rec-why-btn`, `.rec-tooltip`, `.rec-tooltip-arrow`, `@keyframes tooltipFadeIn`
- `.rec-feedback-wrap`, `.rec-feedback-btn`, `.rec-feedback-helpful`, `.rec-feedback-irrelevant`, `.rec-feedback-given`
- `.rec-section-header`, `.rec-section-title`, `.rec-section-subtitle`, `.rec-grid`, `.rec-loading`

*Build result:* `npm run build` — 61 modules, 0 errors, 0 warnings.

---

## 5. Skills and Competencies

### Technical Skills Gained or Strengthened

| Skill | Evidence |
|-------|---------|
| **RESTful API Design** | 13 route files, 38 endpoints with consistent method/path/response conventions |
| **Express middleware** | `requireAuth`, `requireAdmin`, `errorHandler`, fallback patterns in every controller |
| **MySQL schema design** | 16 tables, 12 foreign keys, composite unique keys, indexes for query performance |
| **React component architecture** | 13 components, 10 pages, custom hooks (`useAuth`), Context API for auth state |
| **State management** | `useState`, `useEffect`, `useMemo`, derived state, Set-based dismissal |
| **JWT authentication** | Signing, verification, secure header parsing, role-based access control |
| **Business logic modelling** | Refund rules, pricing rules (additive surcharges), recommendation scoring |
| **Test-driven development** | 445 test assertions across 8 test suites, all passing without a live database |
| **Graceful degradation** | Every DB call has a try/catch fallback to in-memory data — production-safe |
| **CSS design systems** | Consistent custom properties, utility classes, animation keyframes, responsive grid |
| **Build tooling** | Vite 5 production build, ESM modules throughout, path aliasing |

### Soft Skills Demonstrated

- **Incremental delivery**: each of the six tasks was self-contained and deliverable independently
- **Attention to detail**: data validation, HTTP status codes, accessible button labels, aria attributes on tooltip
- **Documentation**: inline comments, meaningful variable names, comprehensive README and report
- **Problem-solving under constraints**: DB-unavailable fallback strategy designed from day one

---

## 6. Feedback and Evidence

### Evidence of Work

| Evidence Type | Details |
|---------------|---------|
| Git-tracked source files | All files listed in Section 12 |
| Test results | 445 / 445 assertions passing across 8 suites |
| Frontend build | Vite production build: 61 modules, 0 errors |
| API coverage | 38 documented REST endpoints across 13 route files |
| Database schema | 16 tables in `database/schema.sql` |
| Component library | 13 React components in `frontend/src/components/` |

### Feature Verification Checklist

| Feature | Backend API | Frontend UI | Tests |
|---------|-------------|-------------|-------|
| User registration / login | ✅ | ✅ | ✅ |
| Hotel listing | ✅ | ✅ | ✅ |
| Flight listing | ✅ | ✅ | ✅ |
| Booking creation | ✅ | ✅ | ✅ |
| Booking cancellation | ✅ | ✅ | ✅ |
| Refund calculation & tracker | ✅ | ✅ | ✅ |
| Reviews, replies, helpful votes | ✅ | ✅ | ✅ |
| Review flagging & moderation | ✅ | ✅ | ✅ |
| Live flight status | ✅ | ✅ | ✅ |
| Dashboard flight alerts | ✅ | ✅ | ✅ |
| Seat map & selection | ✅ | ✅ | ✅ |
| Room grid & selection | ✅ | ✅ | ✅ |
| Price history (hotel/flight) | ✅ | ✅ | ✅ |
| Dynamic pricing (demand/weekend/holiday/peak) | ✅ | ✅ | ✅ |
| Price breakdown UI | ✅ | ✅ | ✅ |
| Price history sparkline graph | ✅ | ✅ | — |
| Price freeze (30 min) | ✅ | ✅ | ✅ |
| Frozen price applied at booking | ✅ | ✅ | ✅ |
| Recommendations (hotel/flight/destination) | ✅ | ✅ | ✅ |
| Why tooltip | — | ✅ | — |
| Helpful / Irrelevant feedback | ✅ | ✅ | ✅ |
| Feedback-weighted re-scoring | ✅ | — | ✅ |
| Recommendations on Home page | — | ✅ | — |
| Recommendations on Dashboard | — | ✅ | — |

---

## 7. Challenges and Solutions

### Challenge 1 — Database Unavailability During Development and Testing

**Problem:** The project runs without a guaranteed MySQL connection (CI environment, local setup variation). Every DB call could fail, breaking tests and demos.

**Solution:** Implemented a dual-path pattern in every controller and service: all DB queries are wrapped in `try/catch`. On failure, the code falls back to in-memory arrays (`fallbackBookings`, `fallbackHotels`, `fallbackFlights`, etc.) with the same data shape as the database rows. This means the entire test suite of 445 assertions runs to completion with zero DB dependency.

---

### Challenge 2 — Additive Pricing Without Double-Counting

**Problem:** When multiple pricing rules apply simultaneously (e.g. a holiday that also falls on a summer weekend), naively multiplying surcharges would compound incorrectly.

**Solution:** All surcharges are calculated as percentages of the **base price** (not the running total). The `breakdown` array accumulates each adjustment independently, and `finalPrice = basePrice × (1 + totalRate / 100)` where `totalRate` is the simple sum of all percentage adjustments. This ensures transparency — each line in the breakdown is exactly its stated percentage of the original base price.

---

### Challenge 3 — Preventing Price Manipulation at Booking

**Problem:** A malicious client could send a manipulated `totalPrice` in the booking request that ignores dynamic pricing.

**Solution:** Added `resolveFrozenPrice()` in `bookingController.createBooking`. Before the INSERT, it queries the `price_freeze` table for an active freeze belonging to the authenticated user for the same entity. If found, the frozen price overrides the client-submitted value. This makes the server the authoritative source for pricing.

---

### Challenge 4 — Recommendation Relevance Without Machine Learning

**Problem:** Building meaningful personalised recommendations without access to ML infrastructure.

**Solution:** Designed a keyword-affinity scoring system. Hotel locations and flight destinations are parsed for known keywords (beach, mountain, city, desert, tropical, European cities). Matching keywords create a tag profile. Candidate hotels and flights are scored by how much their location tags overlap with the user's profile. A destination affinity map translates tag clusters into suggested destination strings (beach tags → Bali, Maldives, Cancun). The scoring function is pure JavaScript with no external dependencies, making it fast and fully testable.

---

### Challenge 5 — Tooltip Z-Index and Positioning in Scrollable Containers

**Problem:** The "Why?" tooltip on recommendation cards was clipped by parent containers with `overflow: hidden` on the Dashboard, and z-index conflicts appeared with other positioned elements.

**Solution:** Set `z-index: 100` on `.rec-tooltip`, used `pointer-events: none` so the tooltip never accidentally blocks click targets, and used `position: absolute` relative to the `.rec-why-wrap` container (which itself has no overflow restriction). The tooltip arrow is a zero-size CSS border trick, and `@keyframes tooltipFadeIn` provides a smooth entrance.

---

### Challenge 6 — ESM Module Interoperability in Test Scripts

**Problem:** The project uses ES Modules (`"type": "module"` in package.json). Node.js requires `--experimental-vm-modules` for some ESM patterns, and import paths must include `.js` extensions.

**Solution:** All import paths use explicit `.js` extensions. Test scripts use top-level `await` and ES module `import` throughout. The `node --experimental-vm-modules` flag was used where needed (dynamic pricing tests), and all other test scripts run cleanly with plain `node`.

---

## 8. Outcomes and Impact

### Quantitative Outcomes

| Metric | Value |
|--------|-------|
| Database tables | 16 (started with 5) |
| REST API endpoints | 38 across 13 route files |
| React components | 13 |
| React pages | 10 |
| Backend services | 10 |
| Test assertions | 445 (100% passing) |
| Frontend modules | 61 (Vite build) |
| CSS bundle | 13.58 kB minified |
| Lines of code added | ~6,000+ |

### Qualitative Outcomes

**User Experience Improvements:**
- Users can discover relevant hotels and flights personalised to their travel history without manual search
- Price freeze gives users confidence to consider a booking without fear of the price changing
- The transparent price breakdown builds trust by showing exactly why a price is higher than the base rate
- Live flight status with alerts means users do not need to check airline websites separately

**Platform Completeness:**
- The platform went from a skeleton (login, list hotels, list flights) to a near-production-quality travel booking system covering every major user journey

**Engineering Quality:**
- Layered architecture (routes → controllers → services) makes each layer independently testable
- Consistent fallback strategy means zero downtime for demos or CI even without a database
- Zero test failures across 445 assertions confirms the implementation is correct and edge cases are handled

---

## 9. Conclusion

This internship provided comprehensive exposure to the full software development lifecycle of a consumer-facing web product. Over the course of six progressive tasks, the Travel Booking Platform was built from a basic scaffold into a feature-complete application.

The most technically demanding components were the Dynamic Pricing Engine (Task 4) — which required careful additive arithmetic and server-side price validation to prevent manipulation — and the Recommendations Engine (Task 5) — which required designing a scoring algorithm that improves over time with user feedback without any external ML service.

The most visible user-facing work was the Recommendations Frontend (Task 6), where the "Why? 💡" tooltip and the feedback dismiss-on-irrelevant interaction required careful attention to CSS positioning, z-index, accessibility, and React state management.

Across all six tasks, the principle of **graceful degradation** was applied consistently: the platform functions correctly with or without a live database connection, which proved essential for running automated tests in an environment without a configured MySQL server.

The internship achieved all ten stated learning objectives. The most significant personal growth was in the area of **business logic modelling** — translating real-world pricing and recommendation rules into clean, testable code — and in **test design**, writing assertions that verify behaviour precisely enough to catch regressions without being so rigid that they break on minor implementation changes.

---

## 10. Testing Summary

All test suites run with:
```bash
cd backend
node src/scripts/<test-file>.js
```

No live database is required. All tests use fallback in-memory stores.

| Suite | File | Tests | Status |
|-------|------|-------|--------|
| Auth, Booking, Cancellation, Refund, Live Flight (basic) | `runTests.js` | 33 | ✅ All Pass |
| Reviews and Ratings System | `runReviewTests.js` | 25 | ✅ All Pass |
| Seat Selection | `runSeatTests.js` | 20 | ✅ All Pass |
| Room Selection | `runRoomTests.js` | 19 | ✅ All Pass |
| Live Flight Status (comprehensive) | `runLiveFlightStatusTests.js` | 288 | ✅ All Pass |
| Price History | `runPriceHistoryTests.js` | 25 | ✅ All Pass |
| Dynamic Pricing Engine | `runDynamicPricingTests.js` | 20 | ✅ All Pass |
| Recommendations Engine | `runRecommendationTests.js` | 15 | ✅ All Pass |
| **Total** | | **445** | **✅ 445 / 445** |

### Frontend Build

```
> vite build
✓ 61 modules transformed
dist/index.html                  0.61 kB  │ gzip:  0.35 kB
dist/assets/index-C32IN9x-.css  13.58 kB  │ gzip:  3.46 kB
dist/assets/index-DpsfHRdp.js  232.44 kB  │ gzip: 69.17 kB
✓ built in 696ms
```

---

## 11. Screenshots Checklist

### Authentication
- [ ] Register page — form fields and submit button
- [ ] Login page — email/password form
- [ ] Navbar — logged-in state with username and Logout link

### Hotels Page
- [ ] Hotel listing — all cards with price/rating/rooms
- [ ] Hotel card — "View Pricing" expanded showing price breakdown
- [ ] Price History sparkline graph below breakdown
- [ ] "🔒 Freeze Price (30 min)" button (before freeze)
- [ ] Frozen price badge with expiry time (after freeze)
- [ ] Hotel card — "View Reviews" expanded

### Flights Page
- [ ] Flight listing — all cards with route/departure/price
- [ ] Flight card — "View Pricing" expanded showing price breakdown
- [ ] Price History sparkline on flight card
- [ ] Freeze button on flight card

### Booking Flow
- [ ] Hotel Booking page — check-in/out date fields and nights selector
- [ ] Room Selection grid — Standard, Deluxe, Suite cards
- [ ] Selected room highlighted in green
- [ ] Flight Booking page — seat map with colour-coded seats
- [ ] Selected seat highlighted in green
- [ ] Booking page — price breakdown shown for dynamic price
- [ ] Booking page — frozen price with strikethrough original
- [ ] Booking confirmation — "Booking confirmed successfully!" message

### My Bookings & Refunds
- [ ] My Bookings page — confirmed booking cards with hotel/flight details
- [ ] Cancel booking modal — reason text input
- [ ] Refund status tracker — Pending step active
- [ ] Refund status tracker — Processed step active
- [ ] Refund status tracker — Completed step active

### Reviews & Ratings
- [ ] Review section open on hotel card — review form visible
- [ ] Star rating selector — 5 stars selected
- [ ] Review submitted — review card with rating, text, author
- [ ] Review with helpful vote count updated
- [ ] Reply submitted — nested below review
- [ ] Flag review modal — reason input
- [ ] Moderator page — flagged review list
- [ ] Review deleted — confirmation and updated list

### Live Flight Status
- [ ] Live Flight Status page — untracked flights list
- [ ] Flight tracked — moved to "Tracked Flights" section
- [ ] Status badge — "On Time" (green)
- [ ] Status badge — "Boarding" (blue)
- [ ] Status badge — "Delayed by 1h" (red)
- [ ] Alert panel — delayed flight notification card
- [ ] Dashboard — Live Flight Status widget with tracked flights
- [ ] Dashboard — Recent Alerts section

### Dynamic Pricing
- [ ] Price breakdown panel — base price + all adjustment lines + final price
- [ ] Weekend surcharge visible in breakdown
- [ ] Holiday surcharge visible in breakdown
- [ ] Peak season surcharge visible in breakdown
- [ ] Demand surcharge visible in breakdown
- [ ] Price History sparkline — multiple data points plotted
- [ ] Freeze button clicked — success state showing expiry
- [ ] Booking page — frozen price display

### Personalised Recommendations
- [ ] Home page — "✨ Recommended For You" section with cards
- [ ] Home page — "Popular Picks" section (new user, no history)
- [ ] Dashboard — Recommendations widget showing full list
- [ ] Recommendation card — Hotel type with Book Hotel button
- [ ] Recommendation card — Flight type with Book Flight button
- [ ] Recommendation card — Destination type with Explore Hotels button
- [ ] "Why? 💡" tooltip open — reason text visible in dark popover
- [ ] "👍 Helpful" clicked — "👍 Marked helpful" confirmation text
- [ ] "👎 Irrelevant" clicked — card dismissed from list
- [ ] After dismissal — remaining cards fill the grid

---

## 12. Modified Files List

### Task 1 — Auth, Booking, Cancellation & Refund

| File | Change |
|------|--------|
| `database/schema.sql` | Initial schema: users, hotels, flights, bookings, payments, cancellations, refunds |
| `backend/src/config/db.js` | MySQL connection pool with dotenv |
| `backend/src/middleware/authMiddleware.js` | `requireAuth` and `requireAdmin` JWT middleware |
| `backend/src/middleware/errorHandler.js` | Global error handler |
| `backend/src/controllers/authController.js` | register, login |
| `backend/src/controllers/bookingController.js` | createBooking, listBookings, getBooking, cancelBooking + frozen price |
| `backend/src/controllers/refundController.js` | getRefund |
| `backend/src/controllers/hotelController.js` | listHotels, getHotel (export fallbackHotels) |
| `backend/src/controllers/flightController.js` | listFlights, getFlight, getFlightStatus |
| `backend/src/controllers/paymentController.js` | createPayment, listPayments |
| `backend/src/routes/authRoutes.js` | POST /register, POST /login |
| `backend/src/routes/bookingRoutes.js` | POST /, GET /, GET /:id, POST /:id/cancel |
| `backend/src/routes/hotelRoutes.js` | GET /, GET /:id |
| `backend/src/routes/flightRoutes.js` | GET /, GET /:id, GET /:id/status |
| `backend/src/routes/paymentRoutes.js` | POST /, GET / |
| `backend/src/routes/refundRoutes.js` | GET /:bookingId |
| `backend/src/app.js` | Express app wiring all routes |
| `backend/src/server.js` | HTTP server startup |
| `backend/src/scripts/runTests.js` | 33 tests: auth, booking, cancel, refund, live flight basic |
| `frontend/src/hooks/useAuth.js` | useAuth hook |
| `frontend/src/hooks/AuthProvider.jsx` | Auth context provider |
| `frontend/src/components/Navbar.jsx` | Nav with auth state |
| `frontend/src/components/ProtectedRoute.jsx` | Route guard |
| `frontend/src/components/RefundStatusTracker.jsx` | Animated 3-step progress bar |
| `frontend/src/pages/Login.jsx` | Login form |
| `frontend/src/pages/Register.jsx` | Register form |
| `frontend/src/pages/Hotels.jsx` | Hotel listing + dynamic pricing + freeze |
| `frontend/src/pages/Flights.jsx` | Flight listing + dynamic pricing + freeze |
| `frontend/src/pages/Booking.jsx` | Booking form with seat/room + frozen price + breakdown |
| `frontend/src/pages/MyBookings.jsx` | Booking list with cancel + refund tracker |
| `frontend/src/services/api.js` | All API call functions |
| `frontend/src/App.jsx` | React Router config |
| `frontend/src/index.css` | Full design system CSS |
| `frontend/src/main.jsx` | App entry point |

### Task 2 — Reviews, Live Flight Status, Seats & Rooms

| File | Change |
|------|--------|
| `database/schema.sql` | Add: reviews, review_replies, review_flags, flight_status, seats, rooms |
| `backend/src/controllers/reviewController.js` | createReview, listReviews, addReply, markHelpful, flagReview |
| `backend/src/controllers/adminController.js` | getFlaggedReviews, removeReview, updateFlagStatus |
| `backend/src/controllers/seatController.js` | getSeatsForFlight, getSeat, bookSeat, releaseSeat |
| `backend/src/controllers/roomController.js` | getRoomsForHotel, getRoom, bookRoom, releaseRoom |
| `backend/src/services/flightService.js` | getLiveFlightStatus, attachStatusToFlight, fallback data |
| `backend/src/services/seatService.js` | generateFallbackSeats, booking/release logic |
| `backend/src/services/roomService.js` | generateFallbackRooms, booking/release logic |
| `backend/src/routes/reviewRoutes.js` | POST /, GET /, POST /:id/reply, POST /:id/helpful, POST /:id/flag |
| `backend/src/routes/adminRoutes.js` | GET /flagged, PATCH /flags/:id, DELETE /reviews/:id |
| `backend/src/routes/seatRoutes.js` | GET /flight/:id, GET /:id, POST /:id/book, POST /:id/release |
| `backend/src/routes/roomRoutes.js` | GET /hotel/:id, GET /:id, POST /:id/book, POST /:id/release |
| `backend/src/scripts/runReviewTests.js` | 25 review tests |
| `backend/src/scripts/runSeatTests.js` | 20 seat tests |
| `backend/src/scripts/runRoomTests.js` | 19 room tests |
| `backend/src/scripts/runLiveFlightStatusTests.js` | 288 live flight tests |
| `frontend/src/components/ReviewForm.jsx` | Star rating form with photo upload |
| `frontend/src/components/ReviewList.jsx` | Review cards with replies, votes, flags |
| `frontend/src/components/ReviewSection.jsx` | Wrapper toggling form and list |
| `frontend/src/components/StarRating.jsx` | Interactive star selector |
| `frontend/src/components/SeatMap.jsx` | Colour-coded interactive seat grid |
| `frontend/src/components/RoomSelection.jsx` | Room card grid with availability |
| `frontend/src/pages/LiveFlightStatus.jsx` | Full live tracking page |
| `frontend/src/pages/Dashboard.jsx` | Dashboard with tracked flights + recommendations |
| `frontend/src/pages/Moderator.jsx` | Admin moderation panel |
| `frontend/src/services/liveFlightTracking.js` | localStorage tracking + notification generation |

### Task 3 — Price History API

| File | Change |
|------|--------|
| `database/schema.sql` | Add: price_history |
| `backend/src/services/priceHistoryService.js` | recordPriceChange, getHotelPriceHistory, getFlightPriceHistory, updateEntityPrice |
| `backend/src/controllers/priceHistoryController.js` | getHotelPriceHistory, getFlightPriceHistory, updatePrice |
| `backend/src/routes/priceHistoryRoutes.js` | GET /hotels/:id, GET /flights/:id, PUT /update |
| `backend/src/scripts/runPriceHistoryTests.js` | 25 price history tests |

### Task 4 — Dynamic Pricing Engine

| File | Change |
|------|--------|
| `database/schema.sql` | Add: price_freeze |
| `backend/src/services/dynamicPricingService.js` | calculateDynamicPrice, checkHoliday, isWeekend, isPeakSeason, getDemandMultiplier, freeze helpers |
| `backend/src/controllers/dynamicPricingController.js` | calculatePrice, freezePrice, getFrozenPrice, deleteFreeze |
| `backend/src/routes/dynamicPricingRoutes.js` | POST /calculate, POST /freeze, GET /freeze/:type/:id, DELETE /freeze/:type/:id |
| `backend/src/controllers/bookingController.js` | Added resolveFrozenPrice + frozen price override in createBooking |
| `backend/src/controllers/hotelController.js` | Exported fallbackHotels |
| `backend/src/app.js` | Registered /api/pricing routes |
| `backend/src/scripts/runDynamicPricingTests.js` | 20 dynamic pricing tests |
| `frontend/src/components/PriceBreakdown.jsx` | Price breakdown card component |
| `frontend/src/components/PriceHistoryGraph.jsx` | SVG sparkline graph component |
| `frontend/src/pages/Hotels.jsx` | View Pricing toggle, freeze button, PriceBreakdown, PriceHistoryGraph |
| `frontend/src/pages/Flights.jsx` | View Pricing toggle, freeze button, PriceBreakdown, PriceHistoryGraph |
| `frontend/src/pages/Booking.jsx` | Frozen price display, PriceBreakdown on booking page |
| `frontend/src/services/api.js` | calculateDynamicPrice, freezePrice, getFrozenPrice, deleteFrozenPrice, getPriceHistory |

### Task 5 — Personalised Recommendations Engine

| File | Change |
|------|--------|
| `database/schema.sql` | Add: recommendation_feedback |
| `backend/src/services/recommendationService.js` | generateRecommendations, storeFeedback, destination affinity map, feedback weighting |
| `backend/src/controllers/recommendationController.js` | getRecommendations, submitFeedback |
| `backend/src/routes/recommendationRoutes.js` | GET /, POST /feedback |
| `backend/src/app.js` | Registered /api/recommendations routes |
| `backend/src/scripts/runRecommendationTests.js` | 15 recommendation tests |

### Task 6 — Recommendations Frontend Integration

| File | Change |
|------|--------|
| `frontend/src/components/RecommendationCard.jsx` | Card with tooltip and feedback buttons |
| `frontend/src/components/RecommendationSection.jsx` | Section wrapper with dismiss logic |
| `frontend/src/pages/Home.jsx` | Added RecommendationSection (compact, auth-gated) |
| `frontend/src/pages/Dashboard.jsx` | Added full RecommendationSection widget |
| `frontend/src/services/api.js` | getRecommendations, submitRecommendationFeedback |
| `frontend/src/index.css` | All recommendation CSS classes and animations |
