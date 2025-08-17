-- Basic initialization script for PostgreSQL
-- Create extensions and initial setup

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create basic health check table
CREATE TABLE IF NOT EXISTS health_check (
    id SERIAL PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'ok',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial health check record
INSERT INTO health_check (status) VALUES ('healthy') ON CONFLICT DO NOTHING;
