-- Travel Booking Platform database schema

CREATE DATABASE IF NOT EXISTS travel_booking_db;
USE travel_booking_db;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hotels (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  location VARCHAR(150) NOT NULL,
  description TEXT,
  price_per_night DECIMAL(10,2) NOT NULL,
  rating DECIMAL(2,1) DEFAULT 0,
  available_rooms INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hotel_id INT NOT NULL,
  room_type VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  image_url VARCHAR(255) NULL,
  availability INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS flights (
  id INT AUTO_INCREMENT PRIMARY KEY,
  airline VARCHAR(100) NOT NULL,
  origin VARCHAR(100) NOT NULL,
  destination VARCHAR(100) NOT NULL,
  departure_time DATETIME NOT NULL,
  arrival_time DATETIME NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  seats_available INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS flight_status (
  id INT AUTO_INCREMENT PRIMARY KEY,
  flight_id INT NOT NULL,
  status ENUM('On Time', 'Boarding', 'Delayed by 1h') NOT NULL DEFAULT 'On Time',
  delay_reason VARCHAR(255) NOT NULL DEFAULT 'No delay reported.',
  revised_departure_time DATETIME NOT NULL,
  estimated_arrival DATETIME NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_flight_status_flight_id (flight_id),
  FOREIGN KEY (flight_id) REFERENCES flights(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS seats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  flight_id INT NOT NULL,
  seat_number VARCHAR(5) NOT NULL,
  type ENUM('economy', 'premium', 'business') NOT NULL DEFAULT 'economy',
  price DECIMAL(10,2) NOT NULL,
  status ENUM('available', 'booked') NOT NULL DEFAULT 'available',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_flight_seat (flight_id, seat_number),
  FOREIGN KEY (flight_id) REFERENCES flights(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  hotel_id INT NULL,
  flight_id INT NULL,
  seat_id INT NULL,
  room_id INT NULL,
  check_in DATE NULL,
  check_out DATE NULL,
  total_price DECIMAL(12,2) NOT NULL,
  status ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (hotel_id) REFERENCES hotels(id),
  FOREIGN KEY (flight_id) REFERENCES flights(id),
  FOREIGN KEY (seat_id) REFERENCES seats(id),
  FOREIGN KEY (room_id) REFERENCES rooms(id)
);

CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
  transaction_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id)
);

CREATE TABLE IF NOT EXISTS cancellations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  user_id INT NOT NULL,
  reason VARCHAR(255) NOT NULL,
  cancelled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS refunds (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  refund_amount DECIMAL(12,2) NOT NULL,
  refund_percentage DECIMAL(5,2) NOT NULL,
  status ENUM('Pending', 'Processed', 'Completed') DEFAULT 'Pending',
  expected_completion_date DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  hotel_id INT NULL,
  flight_id INT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT NOT NULL,
  photo_url VARCHAR(255) NULL,
  helpful_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (hotel_id) REFERENCES hotels(id),
  FOREIGN KEY (flight_id) REFERENCES flights(id)
);

CREATE TABLE IF NOT EXISTS review_replies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  review_id INT NOT NULL,
  user_id INT NOT NULL,
  reply_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS review_flags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  review_id INT NOT NULL,
  user_id INT NOT NULL,
  reason VARCHAR(255) NOT NULL,
  status ENUM('Pending', 'Reviewed', 'Resolved') DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS price_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entity_type ENUM('hotel', 'flight') NOT NULL,
  entity_id INT NOT NULL,
  old_price DECIMAL(10,2) NOT NULL,
  new_price DECIMAL(10,2) NOT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_changed_at (changed_at)
);

CREATE TABLE IF NOT EXISTS recommendation_feedback (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  recommendation_type ENUM('hotel', 'flight', 'destination') NOT NULL,
  entity_id INT NULL,
  destination VARCHAR(100) NULL,
  feedback ENUM('helpful', 'irrelevant') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_rec_feedback_user (user_id),
  INDEX idx_rec_feedback_entity (recommendation_type, entity_id)
);

CREATE TABLE IF NOT EXISTS price_freeze (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  entity_type ENUM('hotel', 'flight') NOT NULL,
  entity_id INT NOT NULL,
  frozen_price DECIMAL(10,2) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_freeze_entity (entity_type, entity_id),
  INDEX idx_freeze_expires (expires_at)
);
