# INSTALLATION INSTRUCTIONS

## Quick Start for Evaluators

### Step 1: Install Dependencies

The project has been cleaned for submission. You need to install dependencies first.

```bash
# Backend
cd backend
npm install

# Frontend  
cd ../frontend
npm install
```

**Note**: There's a single locked file in `backend/node_modules/bcrypt/` that couldn't be removed during cleanup. Running `npm install` will properly reinstall all dependencies including bcrypt.

---

## Step 2: Database Setup

### Create Database
```sql
-- In MySQL client or MySQL Workbench
CREATE DATABASE travel_booking_db;
USE travel_booking_db;
SOURCE database/schema.sql;
```

### Or using command line:
```bash
mysql -u root -p < database/schema.sql
```

---

## Step 3: Configure Environment

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` with your database credentials:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=travel_booking_db
DB_USER=root
DB_PASSWORD=your_password_here
JWT_SECRET=your_secure_jwt_secret_here
```

**Important**: Replace `your_password_here` and `your_secure_jwt_secret_here` with actual values.

---

## Step 4: Start Development Servers

### Terminal 1 - Backend Server
```bash
cd backend
npm run dev
```

Expected output:
```
Backend server running on http://localhost:5000
```

### Terminal 2 - Frontend Development Server
```bash
cd frontend
npm run dev
```

Expected output:
```
  VITE v5.4.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

## Step 5: Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

### Default Test Credentials (if using fallback mode):
- **Email**: admin@travel.test
- **Password**: admin123

---

## Production Build (Optional)

To create a production build of the frontend:

```bash
cd frontend
npm run build
```

Output will be in `frontend/dist/` directory.

---

## Running Tests

All test suites can be run without a database (fallback mode):

```bash
cd backend

# Task 1/2 - Basic tests
node src/scripts/runTests.js

# Task 2 - Reviews
node src/scripts/runReviewTests.js

# Task 2 - Seats
node src/scripts/runSeatTests.js

# Task 2 - Rooms
node src/scripts/runRoomTests.js

# Task 2 - Live Flight Status
node src/scripts/runLiveFlightStatusTests.js

# Task 3 - Price History
node src/scripts/runPriceHistoryTests.js

# Task 4 - Dynamic Pricing
node src/scripts/runDynamicPricingTests.js

# Task 5 - Recommendations
node src/scripts/runRecommendationTests.js
```

**Expected Result**: 445/445 tests passing

---

## Troubleshooting

### Issue: Cannot connect to database
**Solution**: 
- Verify MySQL is running
- Check credentials in `backend/.env`
- Ensure database was created with `schema.sql`
- Application will work in fallback mode with in-memory data

### Issue: Port already in use
**Solution**:
- Backend: Change `PORT` in `backend/.env`
- Frontend: Change port in `frontend/vite.config.js`

### Issue: npm install fails
**Solution**:
```bash
npm cache clean --force
npm install
```

### Issue: bcrypt installation error
**Solution**:
```bash
npm rebuild bcrypt
# Or
npm uninstall bcrypt
npm install bcrypt
```

---

## Project Features to Test

### 1. Authentication
- Register new user
- Login with credentials
- Logout

### 2. Hotels & Flights
- Browse hotels
- Browse flights
- View pricing breakdown
- Freeze prices

### 3. Booking
- Select hotel and room type
- Select flight and seat
- Complete booking
- View bookings

### 4. Cancellation & Refund
- Cancel booking
- View refund status
- Track refund progress

### 5. Reviews
- Leave review with rating
- Reply to reviews
- Mark helpful
- Flag inappropriate content

### 6. Live Flight Status
- Track flights
- View real-time status
- See delay alerts

### 7. Dynamic Pricing
- View price breakdown
- See price history graph
- Freeze price for 30 minutes
- Holiday/weekend/peak surcharges

### 8. Recommendations
- View personalized recommendations
- Click "Why? 💡" for explanation
- Mark helpful/irrelevant
- See recommendations update

---

## API Testing

The backend API runs on `http://localhost:5000/api`

### Test Authentication:
```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Test Hotels:
```bash
curl http://localhost:5000/api/hotels
```

### Test Flights:
```bash
curl http://localhost:5000/api/flights
```

---

## System Requirements

- **Node.js**: 20.x or later
- **npm**: 9.x or later
- **MySQL**: 8.0 or later
- **Browser**: Chrome, Firefox, Safari, or Edge (latest versions)
- **Operating System**: Windows, macOS, or Linux

---

## File Structure

```
travel-booking-platform/
├── backend/              # Node.js + Express API
├── frontend/             # React + Vite SPA
├── database/             # MySQL schema
├── screenshots/          # Screenshots folder
├── README.md             # Main documentation
├── INTERNSHIP_REPORT.md  # Detailed report
├── SUBMISSION_CHECKLIST.md
├── CLEANUP_REPORT.md
└── INSTALLATION_INSTRUCTIONS.md (this file)
```

---

## Support

For issues or questions:
1. Check `README.md` for detailed documentation
2. Review `INTERNSHIP_REPORT.md` for feature explanations
3. Verify `SUBMISSION_CHECKLIST.md` items
4. Check `CLEANUP_REPORT.md` for cleanup details

---

**Installation complete! You're ready to explore the Travel Booking Platform.**
