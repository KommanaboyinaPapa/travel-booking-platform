import app from './app.js';
import dotenv from 'dotenv';

dotenv.config();

// Only start the server when running directly (not on Vercel)
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}

export default app;
