import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Hotels from './pages/Hotels.jsx';
import Flights from './pages/Flights.jsx';
import LiveFlightStatus from './pages/LiveFlightStatus.jsx';
import Booking from './pages/Booking.jsx';
import MyBookings from './pages/MyBookings.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Moderator from './pages/Moderator.jsx';
import AdminRefunds from './pages/AdminRefunds.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { AuthProvider } from './hooks/AuthProvider.jsx';
import './index.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-shell">
          <Navbar />
          <main className="page-content">
            <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/hotels" element={<Hotels />} />
            <Route path="/flights" element={<Flights />} />
            <Route path="/live-flight-status" element={<LiveFlightStatus />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/my-bookings" element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/moderator" element={<ProtectedRoute><Moderator /></ProtectedRoute>} />
            <Route path="/admin-reviews" element={<ProtectedRoute><Moderator /></ProtectedRoute>} />
            <Route path="/admin-refunds" element={<ProtectedRoute><AdminRefunds /></ProtectedRoute>} />
            <Route path="*" element={<div className="page-card"><h2>Page not found</h2><p>The page you requested does not exist.</p></div>} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
