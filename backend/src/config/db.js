import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const isLocalHost = !process.env.DB_HOST || process.env.DB_HOST === 'localhost' || process.env.DB_HOST === '127.0.0.1';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  ...(!isLocalHost ? { ssl: {} } : {}),
});

export default pool;
