import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001'),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret',
  },
  tinyfish: {
    apiUrl: process.env.TINYFISH_API_URL,
    apiKey: process.env.TINYFISH_API_KEY,
  },
};