# Travel Booking Platform

A full-stack travel booking platform built with **React + Vite** (frontend), **Node.js + Express** (backend), and **MySQL** (database). Developed as part of a software engineering internship, the platform covers the complete travel booking lifecycle — from authentication and search through booking, payments, reviews, live flight tracking, dynamic pricing, and AI-style personalised recommendations.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Implemented Features](#implemented-features)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Database Tables](#database-tables)
6. [Setup and Installation](#setup-and-installation)
7. [Environment Variables](#environment-variables)
8. [API Reference](#api-reference)
9. [Running Tests](#running-tests)
10. [Screenshots Checklist](#screenshots-checklist)
11. [Final Project Walkthrough](#final-project-walkthrough)
12. [Modified Files List](#modified-files-list)

---

## Project Overview

The Travel Booking Platform lets registered users search hotels and flights, select specific seats and rooms, complete bookings, manage cancellations and refunds, leave reviews, track live flight status, view dynamically priced fares with price freeze, and receive personalised travel recommendations — all through a responsive single-page React application backed by a RESTful Express API.

---

## Implemented Features

Six major feature groups were implemented across the internship:

### Task 1 — Authentication, Hotel & Flight Booking, Cancellation & Refund
- JWT-based user registration and login
- Browse hotels and flights with fallback in-memory data
- Create and view bookings (hotel + flight)
- Cancel bookings with time-based refund rules (50% within 24 h, 25% after)
- Refund status tracker with three-step progress UI (Pending → Processed → Completed)

### Task 2 — Reviews & Ratings, Live Flight Status, Seat & Room Selection
- Star-rating reviews with optional photo upload
- Review replies, helpful votes, and flagging system
- Admin/moderator panel to review flags and delete content
- Live flight status API with On Time / Boarding / Delayed by 1h states
- Dashboard widget showing tracked flights and real-time alerts
- Interactive seat map (Economy / Premium / Business tiers)
- Room selection with type images and availability tracking

### Task 3 — Price History API
- Record every base-price change for hotels and flights
- Retrieve paginated price history per entity
- Admin endpoint to manually update entity prices
- Fallback in-memory store when database is unavailable

### Task 4 — Dynamic Pricing Engine
- Holiday surcharge (+20%) covering US fixed and floating holidays
- Peak season surcharge (+15%) for summer (Jun–Aug) and winter holidays (Dec 20 – Jan 3)
- Weekend surcharge (+10%) for Saturday and Sunday
- Demand-based pricing up to +15% based on occupancy rate
- Price breakdown API returning `basePrice`, `adjustmentPercent`, `adjustmentReason`, `finalPrice`, and a per-factor `breakdown` array
- **Price Freeze**: lock a calculated price for 30 minutes; frozen price applied automatically at booking
- `price_freeze` database table with expiry
- Frontend price breakdown card and SVG price history sparkline graph

### Task 5 — Personalised Recommendations Engine
- Recommendation logic driven by user booking history
- Destination affinity map (beach bookings → Bali, mountain bookings → Swiss Alps, etc.)
- Scores hotels, flights, and destinations using tag overlap + rating
- Feedback weighting: helpful (+2) boosts future ranking, irrelevant (−3) suppresses it
- Graceful fallback to top-rated hotels and cheapest flights for new users
- `recommendation_feedback` database table

### Task 6 — Recommendations Frontend Integration
- `RecommendationSection` component rendered on both Home page and Dashboard
- `RecommendationCard` component with type icons, subtitle, action button
- **"Why? 💡" tooltip** — hover/focus popover explaining the recommendation reason
- **👍 Helpful / 👎 Irrelevant** feedback buttons — call backend API, show confirmation, auto-dismiss irrelevant cards
- CSS classes for card, tooltip, feedback buttons with hover animations
- Full Vite production build verified (61 modules, 0 errors)

---

## Tech Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Frontend   | React 18, Vite 5, React Router v6       |
| Backend    | Node.js 20+, Express 4                  |
| Database   | MySQL 8 (mysql2/promise)                |
| Auth       | JSON Web Tokens (jsonwebtoken, bcryptjs) |
| Styling    | Plain CSS custom design system          |
| Testing    | Custom Node.js ESM test scripts         |

---

## Project Structure

```
travel-booking-platform/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── RefundStatusTracker.jsx
│   │   │   ├── ReviewForm.jsx
│   │   │   ├── ReviewList.jsx
│   │   │   ├── ReviewSection.jsx
│   │   │   ├── RoomSelection.jsx
│   │   │   ├── SeatMap.jsx
│   │   │   ├── StarRating.jsx
│   │   │   ├── PriceBreakdown.jsx        ← Task 4
│   │   │   ├── PriceHistoryGraph.jsx     ← Task 4
│   │   │   ├── RecommendationCard.jsx    ← Task 5/6
│   │   │   └── RecommendationSection.jsx ← Task 5/6
│   │   ├── hooks/
│   │   │   ├── AuthProvider.jsx
│   │   │   └── useAuth.js
│   │   ├── pages/
│   │   │   ├── Booking.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Flights.jsx
│   │   │   ├── Home.jsx
│   │   │   ├── Hotels.jsx
│   │   │   ├── LiveFlightStatus.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Moderator.jsx
│   │   │   ├── MyBookings.jsx
│   │   │   └── Register.jsx
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   └── liveFlightTracking.js
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── src/
│   │   ├── config/db.js
│   │   ├── controllers/
│   │   │   ├── adminController.js
│   │   │   ├── authController.js
│   │   │   ├── bookingController.js
│   │   │   ├── dynamicPricingController.js  ← Task 4
│   │   │   ├── flightController.js
│   │   │   ├── hotelController.js
│   │   │   ├── paymentController.js
│   │   │   ├── priceHistoryController.js    ← Task 3
│   │   │   ├── recommendationController.js  ← Task 5
│   │   │   ├── refundController.js
│   │   │   ├── reviewController.js
│   │   │   ├── roomController.js
│   │   │   ├── seatController.js
│   │   │   └── seedController.js
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js
│   │   │   └── errorHandler.js
│   │   ├── routes/
│   │   │   ├── adminRoutes.js
│   │   │   ├── authRoutes.js
│   │   │   ├── bookingRoutes.js
│   │   │   ├── dynamicPricingRoutes.js      ← Task 4
│   │   │   ├── flightRoutes.js
│   │   │   ├── hotelRoutes.js
│   │   │   ├── paymentRoutes.js
│   │   │   ├── priceHistoryRoutes.js        ← Task 3
│   │   │   ├── recommendationRoutes.js      ← Task 5
│   │   │   ├── refundRoutes.js
│   │   │   ├── reviewRoutes.js
│   │   │   ├── roomRoutes.js
│   │   │   └── seatRoutes.js
│   │   ├── services/
│   │   │   ├── authService.js
│   │   │   ├── bookingService.js
│   │   │   ├── dynamicPricingService.js     ← Task 4
│   │   │   ├── flightService.js
│   │   │   ├── hotelService.js
│   │   │   ├── paymentService.js
│   │   │   ├── priceHistoryService.js       ← Task 3
│   │   │   ├── recommendationService.js     ← Task 5
│   │   │   ├── roomService.js
│   │   │   └── seatService.js
│   │   ├── scripts/
│   │   │   ├── runTests.js                  ← Task 1/2
│   │   │   ├── runReviewTests.js            ← Task 2
│   │   │   ├── runSeatTests.js              ← Task 2
│   │   │   ├── runRoomTests.js              ← Task 2
│   │   │   ├── runLiveFlightStatusTests.js  ← Task 2
│   │   │   ├── runPriceHistoryTests.js      ← Task 3
│   │   │   ├── runDynamicPricingTests.js    ← Task 4
│   │   │   └── runRecommendationTests.js    ← Task 5
│   │   ├── app.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
│
└── database/
    └── schema.sql
```

---

## Database Tables

| Table                      | Purpose                                              |
|----------------------------|------------------------------------------------------|
| `users`                    | Registered user accounts with hashed passwords      |
| `hotels`                   | Hotel listings with price, rating, availability      |
| `rooms`                    | Room types per hotel (Standard / Deluxe / Suite)     |
| `flights`                  | Flight listings with price and seat availability     |
| `flight_status`            | Live status records per flight                       |
| `seats`                    | Individual seat records per flight                   |
| `bookings`                 | User bookings linking hotels/flights/seats/rooms     |
| `payments`                 | Payment records linked to bookings                   |
| `cancellations`            | Cancellation records with reason and timestamp       |
| `refunds`                  | Refund records with amount, percentage, and status   |
| `reviews`                  | User reviews with rating, text, and optional photo   |
| `review_replies`           | Replies to reviews                                   |
| `review_flags`             | Flags raised against reviews by users                |
| `price_history`            | Log of every price change for hotels and flights     |
| `price_freeze`             | Active price locks per user per entity (30 min TTL)  |
| `recommendation_feedback`  | User feedback (helpful/irrelevant) per recommendation|

---

## Setup and Installation

### Prerequisites
- Node.js 20 or later
- MySQL 8 or later
- npm 9 or later

### 1. Clone the repository

```bash
git clone <repository-url>
cd travel-booking-platform
```

### 2. Set up the database

```sql
-- In MySQL client:
CREATE DATABASE travel_booking_db;
USE travel_booking_db;
SOURCE database/schema.sql;
```

### 3. Configure backend environment

```bash
cd backend
cp .env.example .env
# Edit .env with your MySQL credentials and JWT secret
```

### 4. Install dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 5. Start the development servers

```bash
# Terminal 1 — Backend (port 5000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
```

Open `http://localhost:5173` in your browser.

### 6. Build for production

```bash
cd frontend
npm run build
# Output in frontend/dist/
```

---

## Environment Variables

Create `backend/.env` from `backend/.env.example`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=<your_mysql_user>
DB_PASSWORD=<your_mysql_password>
DB_NAME=travel_booking_db
JWT_SECRET=<your_jwt_secret>
PORT=5000
```

---

## API Reference

All routes are prefixed with `/api`. Protected routes require `Authorization: Bearer <token>`.

### Authentication — `/api/auth`

| Method | Endpoint           | Auth | Description              |
|--------|--------------------|------|--------------------------|
| POST   | `/register`        | No   | Register a new user      |
| POST   | `/login`           | No   | Login, returns JWT token |

### Hotels — `/api/hotels`

| Method | Endpoint  | Auth | Description        |
|--------|-----------|------|--------------------|
| GET    | `/`       | No   | List all hotels    |
| GET    | `/:id`    | No   | Get hotel by ID    |

### Flights — `/api/flights`

| Method | Endpoint         | Auth | Description                         |
|--------|------------------|------|-------------------------------------|
| GET    | `/`              | No   | List all flights with live status   |
| GET    | `/:id`           | No   | Get single flight with live status  |
| GET    | `/:id/status`    | No   | Get live status for a flight        |

### Bookings — `/api/bookings`

| Method | Endpoint          | Auth | Description              |
|--------|-------------------|------|--------------------------|
| POST   | `/`               | Yes  | Create a booking         |
| GET    | `/`               | Yes  | List user's bookings     |
| GET    | `/:id`            | Yes  | Get a single booking     |
| POST   | `/:id/cancel`     | Yes  | Cancel booking + refund  |

### Payments — `/api/payments`

| Method | Endpoint | Auth | Description        |
|--------|----------|------|--------------------|
| POST   | `/`      | No   | Create a payment   |
| GET    | `/`      | No   | List payments      |

### Refunds — `/api/refunds`

| Method | Endpoint         | Auth | Description                  |
|--------|------------------|------|------------------------------|
| GET    | `/:bookingId`    | Yes  | Get refund details by booking|

### Reviews — `/api/reviews`

| Method | Endpoint            | Auth | Description              |
|--------|---------------------|------|--------------------------|
| POST   | `/`                 | Yes  | Create a review          |
| GET    | `/`                 | No   | List reviews (with sort) |
| POST   | `/:id/reply`        | Yes  | Reply to a review        |
| POST   | `/:id/helpful`      | No   | Mark review as helpful   |
| POST   | `/:id/flag`         | Yes  | Flag a review            |

### Admin — `/api/admin`

| Method | Endpoint           | Auth        | Description              |
|--------|--------------------|-------------|--------------------------|
| GET    | `/flagged`         | Yes + Admin | List flagged reviews     |
| PATCH  | `/flags/:id`       | Yes + Admin | Update flag status       |
| DELETE | `/reviews/:id`     | Yes + Admin | Delete a review          |

### Seats — `/api/seats`

| Method | Endpoint               | Auth | Description               |
|--------|------------------------|------|---------------------------|
| GET    | `/flight/:flightId`    | No   | Get all seats for flight  |
| GET    | `/:seatId`             | No   | Get seat details          |
| POST   | `/:seatId/book`        | Yes  | Book a seat               |
| POST   | `/:seatId/release`     | Yes  | Release a seat            |

### Rooms — `/api/rooms`

| Method | Endpoint               | Auth | Description               |
|--------|------------------------|------|---------------------------|
| GET    | `/hotel/:hotelId`      | No   | Get all rooms for hotel   |
| GET    | `/:roomId`             | No   | Get room details          |
| POST   | `/:roomId/book`        | Yes  | Book a room               |
| POST   | `/:roomId/release`     | Yes  | Release a room            |

### Price History — `/api/price-history`

| Method | Endpoint              | Auth | Description                      |
|--------|-----------------------|------|----------------------------------|
| GET    | `/hotels/:hotelId`    | No   | Get price history for hotel      |
| GET    | `/flights/:flightId`  | No   | Get price history for flight     |
| PUT    | `/update`             | No   | Update entity price + log change |

### Dynamic Pricing — `/api/pricing`

| Method | Endpoint                          | Auth | Description                                |
|--------|-----------------------------------|------|--------------------------------------------|
| POST   | `/calculate`                      | No   | Calculate dynamic price with breakdown     |
| POST   | `/freeze`                         | Yes  | Freeze current price for 30 minutes        |
| GET    | `/freeze/:entityType/:entityId`   | Yes  | Get active frozen price                    |
| DELETE | `/freeze/:entityType/:entityId`   | Yes  | Remove a price freeze                      |

### Recommendations — `/api/recommendations`

| Method | Endpoint    | Auth | Description                                    |
|--------|-------------|------|------------------------------------------------|
| GET    | `/`         | Yes  | Get personalised recommendations for user      |
| POST   | `/feedback` | Yes  | Submit helpful/irrelevant feedback             |

---

## Running Tests

All test suites run without a live database (fallback in-memory mode is used automatically):

```bash
cd backend

# Task 1/2 — Auth, Booking, Cancellation, Refund, Live Flight
node src/scripts/runTests.js

# Task 2 — Reviews and Ratings
node src/scripts/runReviewTests.js

# Task 2 — Seat Selection
node src/scripts/runSeatTests.js

# Task 2 — Room Selection
node src/scripts/runRoomTests.js

# Task 2 — Live Flight Status (comprehensive)
node src/scripts/runLiveFlightStatusTests.js

# Task 3 — Price History
node src/scripts/runPriceHistoryTests.js

# Task 4 — Dynamic Pricing Engine
node src/scripts/runDynamicPricingTests.js

# Task 5 — Recommendations Engine
node src/scripts/runRecommendationTests.js
```

### Test Results Summary

| Test Suite                  | Tests  | Passed | Failed |
|-----------------------------|--------|--------|--------|
| Auth / Booking / Cancellation / Refund / Live Flight (basic) | 33 | 33 | 0 |
| Reviews and Ratings         | 25     | 25     | 0      |
| Seat Selection              | 20     | 20     | 0      |
| Room Selection              | 19     | 19     | 0      |
| Live Flight Status (full)   | 288    | 288    | 0      |
| Price History               | 25     | 25     | 0      |
| Dynamic Pricing Engine      | 20     | 20     | 0      |
| Recommendations Engine      | 15     | 15     | 0      |
| **Total**                   | **445**| **445**| **0**  |

### Frontend Build

```bash
cd frontend
npm run build
# ✓ 61 modules transformed
# ✓ 0 errors, 0 warnings
# dist/assets/index.css   ~13.58 kB (gzip: 3.46 kB)
# dist/assets/index.js   ~232 kB   (gzip: 69 kB)
```

---

## Screenshots Checklist

Capture the following screens to document the completed platform:

### Authentication
- [ ] Register page — form with name, email, password
- [ ] Login page — form with email, password
- [ ] Navbar showing logged-in user name and Logout button

### Hotels & Flights
- [ ] Hotels listing page — hotel cards with price, rating, available rooms
- [ ] Flights listing page — flight cards with route, departure time, price
- [ ] Hotel card with "View Pricing" expanded showing Price Breakdown
- [ ] Flight card with "View Pricing" expanded showing Price Breakdown
- [ ] Price History sparkline graph on hotel or flight card
- [ ] "🔒 Freeze Price (30 min)" button before freezing
- [ ] Frozen price indicator with expiry time after freezing

### Booking Flow
- [ ] Booking page — hotel booking with check-in/out dates and nights
- [ ] Room selection grid showing Standard / Deluxe / Suite options
- [ ] Seat map showing Economy / Premium / Business seats
- [ ] Booking confirmation page with price breakdown shown
- [ ] Frozen price displayed with strikethrough original on booking page
- [ ] My Bookings page listing confirmed bookings

### Cancellation & Refund
- [ ] Cancel booking modal with reason field
- [ ] Refund status tracker showing Pending → Processed → Completed steps

### Reviews & Ratings
- [ ] Review form with star rating selector and text input
- [ ] Review list showing ratings, text, replies, helpful count
- [ ] Flagging a review — flag reason modal
- [ ] Moderator panel — flagged review list with Resolve/Delete buttons

### Live Flight Status
- [ ] Live Flight Status page with tracked and untracked flight sections
- [ ] Flight card showing On Time / Boarding / Delayed status badge
- [ ] Alert notification panel showing delayed/boarding alerts
- [ ] Dashboard widget with tracked flights and recent alerts

### Dynamic Pricing
- [ ] Price breakdown card — base price, each adjustment line, final price
- [ ] Price History sparkline showing price trend over time
- [ ] Price freeze in action — frozen badge on booking page

### Recommendations
- [ ] Home page — "✨ Recommended For You" or "Popular Picks" section
- [ ] Dashboard — Recommendations widget above Live Flight Status
- [ ] Recommendation card for a hotel with Book Hotel button
- [ ] Recommendation card for a flight with Book Flight button
- [ ] Recommendation card for a destination with Explore Hotels button
- [ ] "Why? 💡" tooltip open showing recommendation reason
- [ ] "👍 Helpful" button clicked — confirmation text shown
- [ ] "👎 Irrelevant" button clicked — card dismissed from list

---

## Final Project Walkthrough

### Step 1 — Register and Login
Navigate to `/register`, create an account, then log in at `/login`. The JWT token is stored in `localStorage` and attached to every subsequent API request.

### Step 2 — Browse Hotels
Go to `/hotels`. Each hotel card shows name, location, price per night, rating, and room count. Click **View Pricing** to see the dynamic price breakdown and the price history sparkline. If any surcharges apply (weekend, holiday, peak season, high demand), they appear as line items. Click **🔒 Freeze Price (30 min)** to lock the current price before booking.

### Step 3 — Browse Flights
Go to `/flights`. Same pricing panel is available per flight card with the **View Pricing** toggle and freeze capability.

### Step 4 — Book a Hotel
Click **Book Now** on a hotel card. On the Booking page, select check-in and check-out dates, number of nights, and a room type from the room selection grid. The price breakdown (including frozen price if active) is shown. Click **Confirm Booking**.

### Step 5 — Book a Flight
Click **Book Now** on a flight. On the Booking page, pick a seat from the interactive seat map (colour-coded by economy/premium/business). Confirm the booking.

### Step 6 — View and Cancel Bookings
Go to `/my-bookings` to see all confirmed bookings. Click **Cancel** on any booking to open the cancellation modal. A refund is calculated (50% if within 24 h, 25% otherwise) and the refund status tracker appears.

### Step 7 — Leave a Review
After booking, open the hotel or flight card and click **View Reviews**. Use the star rating and text form to submit a review. Other users can mark it helpful, reply to it, or flag it for moderation.

### Step 8 — Live Flight Status
Go to `/live-flight-status` to track flights. Click **Track** on any flight to add it to your tracking list. Status badges (On Time / Boarding / Delayed by 1h) update on each refresh. The Dashboard shows tracked flights and the last three alerts.

### Step 9 — Dynamic Pricing Details
On any hotel or flight, expand **View Pricing**. The price breakdown shows every surcharge applied. The sparkline below shows historical price movement. Freeze the price to guarantee it for the next 30 minutes — the frozen price is automatically used when you complete the booking.

### Step 10 — Personalised Recommendations
Log in and visit `/` (Home) or `/dashboard`. The Recommendations section shows up to 3 suggestions on Home and the full list on Dashboard. Hover **Why? 💡** on any card to read the reason for the suggestion. Click **👍 Helpful** to improve future rankings or **👎 Irrelevant** to suppress and dismiss the card. The feedback is saved to the backend and factored into the scoring the next time recommendations are generated.

---

## Modified Files List

See `INTERNSHIP_REPORT.md` for the complete annotated list organised by task.
