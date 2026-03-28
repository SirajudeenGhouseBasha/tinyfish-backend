# TinyFish Backend - Intelligent Job Agent

Backend service for the Intelligent Job Agent that automates job searching, filtering, scoring, and application submission.

## Project Structure

```
src/
├── config/          # Configuration files (database, environment)
├── controllers/     # Request handlers
├── models/          # Data models
├── routes/          # API route definitions
├── services/        # Business logic
├── schemas/         # Validation schemas
├── utils/           # Utility functions and classes
├── migrations/      # Database migration files
├── scripts/         # Database and utility scripts
├── seeders/         # Database seed data
└── types.ts         # TypeScript type definitions
```

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Copy `.env.example` to `.env` and configure:
   ```
   DB_USER=postgres
   DB_PASSWORD=1234
   DB_NAME=dummy
   DB_HOST=localhost
   DB_PORT=5432
   PORT=3001
   ```

3. **Set up PostgreSQL database:**
   - Install PostgreSQL
   - Create database: `createdb dummy`
   - Run migrations: `npm run migrate`
   - (Optional) Seed sample data: `npm run seed`

4. **Start development server:**
   ```bash
   npm run dev
   ```

## API Endpoints

### Profile Management
- `POST /api/profile` - Create user profile with resume upload
- `GET /api/profile/:sessionId` - Get user profile

### Job Search
- `POST /api/job-search` - Start job search process
- `GET /api/job-search/:sessionId` - Get job search status

### Health Check
- `GET /health` - Server health status

## Database Schema

### Tables
- `user_profiles` - User profile data
- `job_search_sessions` - Job search session tracking
- `job_listings` - Scraped job listings
- `application_records` - Job application results
- `log_entries` - Real-time logging data

## Development

### Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run migrate` - Run database migrations
- `npm run seed` - Seed sample data

### File Upload
Resume files are stored in `uploads/resumes/` directory. Supported formats:
- PDF (.pdf)
- Microsoft Word (.docx)

## Architecture

The backend follows a layered architecture:

1. **Routes** - Handle HTTP requests and responses
2. **Controllers** - Process requests and coordinate with services
3. **Services** - Contain business logic and orchestrate operations
4. **Models** - Data structures and database interactions
5. **Utils** - Core job agent pipeline components

## Job Agent Pipeline

The intelligent job agent follows a 4-stage pipeline:

1. **Hard Filters** - Eliminate jobs by age, type, location
2. **Intent Engine** - Analyze user context and generate reasoning
3. **Stack Sorting** - Rank jobs by technology stack relevance
4. **Weighted Scoring** - Score jobs with resume similarity (0-105 points)

Jobs scoring ≥75 points qualify for automated application.