-- =============================================
-- NEW TABLES FOR ASSIGNMENTS & MEETINGS
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Add missing columns to assignments table
ALTER TABLE assignments
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Completed', 'Draft')),
ADD COLUMN IF NOT EXISTS max_marks INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES staff(id) ON DELETE SET NULL;

-- 2. Assignment Submissions table
CREATE TABLE IF NOT EXISTS assignment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    submission_text TEXT,
    submission_file_url TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    marks_obtained INTEGER,
    graded_at TIMESTAMP WITH TIME ZONE,
    graded_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    feedback TEXT,
    status VARCHAR(20) DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'Graded', 'Late', 'Resubmitted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(assignment_id, student_id)
);

-- Indexes for assignment_submissions
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON assignment_submissions(status);

-- 3. Meetings table for Jitsi
CREATE TABLE IF NOT EXISTS meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    host_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    meeting_url TEXT NOT NULL,
    room_name VARCHAR(100) NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    status VARCHAR(20) DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'In Progress', 'Completed', 'Cancelled')),
    meeting_type VARCHAR(20) DEFAULT 'Class' CHECK (meeting_type IN ('Class', 'Parent-Teacher', 'Staff', 'Other')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for meetings
CREATE INDEX IF NOT EXISTS idx_meetings_school ON meetings(school_id);
CREATE INDEX IF NOT EXISTS idx_meetings_class ON meetings(class_id);
CREATE INDEX IF NOT EXISTS idx_meetings_host ON meetings(host_id);
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled ON meetings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);

-- 4. Meeting participants (optional - for tracking who joined)
CREATE TABLE IF NOT EXISTS meeting_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE,
    left_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(meeting_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_participants_meeting ON meeting_participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_participants_user ON meeting_participants(user_id);

-- Update trigger for assignment_submissions
CREATE OR REPLACE FUNCTION update_submission_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_submission_updated_at
BEFORE UPDATE ON assignment_submissions
FOR EACH ROW EXECUTE FUNCTION update_submission_timestamp();

CREATE TRIGGER update_meeting_updated_at
BEFORE UPDATE ON meetings
FOR EACH ROW EXECUTE FUNCTION update_submission_timestamp();
