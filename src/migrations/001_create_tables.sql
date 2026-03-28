-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id SERIAL PRIMARY KEY,
    session_id UUID UNIQUE NOT NULL,
    role VARCHAR(100) NOT NULL,
    tech_stack JSONB NOT NULL,
    primary_technology VARCHAR(50),
    years_experience INTEGER NOT NULL CHECK (years_experience >= 0),
    location_preference VARCHAR(20) NOT NULL CHECK (location_preference IN ('remote', 'hybrid', 'onsite', 'flexible')),
    job_type VARCHAR(20) NOT NULL CHECK (job_type IN ('full-time', 'part-time', 'contract', 'internship')),
    resume_path VARCHAR(255) NOT NULL,
    posting_age_window INTEGER DEFAULT 7 CHECK (posting_age_window > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create job_search_sessions table
CREATE TABLE IF NOT EXISTS job_search_sessions (
    id SERIAL PRIMARY KEY,
    session_id UUID UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    total_scanned INTEGER DEFAULT 0,
    total_eliminated INTEGER DEFAULT 0,
    total_scored INTEGER DEFAULT 0,
    total_applied INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create job_listings table
CREATE TABLE IF NOT EXISTS job_listings (
    id SERIAL PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES job_search_sessions(session_id) ON DELETE CASCADE,
    job_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    posting_date TIMESTAMP WITH TIME ZONE NOT NULL,
    location VARCHAR(255),
    job_type VARCHAR(20) NOT NULL,
    required_experience_min INTEGER,
    required_experience_max INTEGER,
    tech_stack JSONB,
    description TEXT,
    apply_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create application_records table
CREATE TABLE IF NOT EXISTS application_records (
    id SERIAL PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES job_search_sessions(session_id) ON DELETE CASCADE,
    job_id VARCHAR(255) NOT NULL,
    job_title VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    score DECIMAL(5,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'retrying')),
    attempts INTEGER DEFAULT 0,
    error_message TEXT,
    applied_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create log_entries table
CREATE TABLE IF NOT EXISTS log_entries (
    id SERIAL PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES job_search_sessions(session_id) ON DELETE CASCADE,
    stage VARCHAR(50) NOT NULL,
    level VARCHAR(20) NOT NULL CHECK (level IN ('info', 'success', 'warning', 'error')),
    message TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_session_id ON user_profiles(session_id);
CREATE INDEX IF NOT EXISTS idx_job_search_sessions_session_id ON job_search_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_job_listings_session_id ON job_listings(session_id);
CREATE INDEX IF NOT EXISTS idx_application_records_session_id ON application_records(session_id);
CREATE INDEX IF NOT EXISTS idx_log_entries_session_id ON log_entries(session_id);
CREATE INDEX IF NOT EXISTS idx_log_entries_created_at ON log_entries(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at (DROP first to avoid "already exists" error on re-run)
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
DROP TRIGGER IF EXISTS update_job_search_sessions_updated_at ON job_search_sessions;
DROP TRIGGER IF EXISTS update_application_records_updated_at ON application_records;

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_job_search_sessions_updated_at BEFORE UPDATE ON job_search_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_application_records_updated_at BEFORE UPDATE ON application_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();