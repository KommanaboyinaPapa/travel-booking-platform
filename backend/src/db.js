import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'travel_booking_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default {
  query: (sql, params) => pool.execute(sql, params),
  getConnection: () => pool.getConnection()
};
