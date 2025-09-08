-- JobHunt Database Schema
-- Based on TypeScript interfaces from src/types/db-schema.ts

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS raw_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    job_id TEXT NOT NULL UNIQUE,
    details TEXT NOT NULL,
    source TEXT NOT NULL,
    fail_count INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
) STRICT;

CREATE TABLE IF NOT EXISTS clean_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    job_id TEXT NOT NULL UNIQUE,
    details TEXT NOT NULL,
    source TEXT NOT NULL,
    work_arrangement TEXT,
    compensation TEXT,
    company TEXT,
    location TEXT,
    role TEXT,
    published_date TEXT,
    years_of_experience_required TEXT,
    hard_skills_required TEXT,
    job_description TEXT,
    fail_count INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
) STRICT;

CREATE TABLE IF NOT EXISTS enhanced_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    job_id TEXT NOT NULL UNIQUE,
    details TEXT NOT NULL,
    source TEXT NOT NULL,
    work_arrangement TEXT,
    compensation TEXT,
    company TEXT,
    location TEXT,
    role TEXT,
    published_date TEXT,
    years_of_experience_required TEXT,
    hard_skills_required TEXT,
    job_description TEXT NULL,
    uploaded_to_sheet INTEGER NOT NULL DEFAULT FALSE,
    relevance_score INTEGER,
    relevance_reason TEXT,
    recommendation TEXT,
    fail_count INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
) STRICT;

CREATE TABLE IF NOT EXISTS prefills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    enhanced_job_id TEXT NOT NULL,
    cover_letter TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (enhanced_job_id) REFERENCES enhanced_jobs(job_id) ON DELETE CASCADE
) STRICT;

-- Create triggers to automatically update the updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_raw_jobs_updated_at
    AFTER UPDATE ON raw_jobs
    BEGIN
        UPDATE raw_jobs SET updated_at = datetime('now') WHERE OLD.id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_clean_jobs_updated_at
    AFTER UPDATE ON clean_jobs
    BEGIN
        UPDATE clean_jobs SET updated_at = datetime('now') WHERE OLD.id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_enhanced_jobs_updated_at
    AFTER UPDATE ON enhanced_jobs
    BEGIN
        UPDATE enhanced_jobs SET updated_at = datetime('now') WHERE OLD.id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_prefills_updated_at
    AFTER UPDATE ON prefills
    BEGIN
        UPDATE prefills SET updated_at = datetime('now') WHERE OLD.id = NEW.id;
    END;