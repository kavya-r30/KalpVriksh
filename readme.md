# School Management System

A comprehensive school management system designed for government schools to streamline operations, enhance communication, and improve student outcomes.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [User Roles](#user-roles)
- [Pages and Functionality](#pages-and-functionality)
- [Getting Started](#getting-started)
- [Technology Stack](#technology-stack)

## Overview

The School Management System is a full-stack web application built with Next.js and Supabase that provides a unified platform for managing all aspects of school operations. The system supports five distinct user roles, each with customized dashboards and functionality tailored to their specific needs.

## Features

- **Student Management**: Comprehensive student records, enrollment, and tracking
- **Attendance Tracking**: Real-time attendance monitoring with automated notifications
- **Performance Analytics**: Detailed insights into student performance and exam results
- **Communication Hub**: Seamless messaging between teachers, parents, and students
- **Fee Management**: Automated fee collection and payment tracking
- **Exam Management**: Create and manage exams, record marks, and generate reports
- **Certificate Generation**: Issue and manage student certificates
- **Skills Assessment**: Track and evaluate student skills and competencies
- **Role-based Access Control**: Secure access with permissions based on user roles

## User Roles

### 1. Administrator

**Purpose**: System-wide management and oversight

**Key Responsibilities**:
- Manage all schools in the system
- Create and manage user accounts for all roles
- Configure system settings
- Generate comprehensive reports
- Monitor system-wide analytics

**Available Pages**:
- `/admin` - Dashboard with system-wide statistics
- `/admin/schools` - View and manage all schools
- `/admin/schools/new` - Add new schools
- `/admin/schools/[id]` - View school details
- `/admin/schools/[id]/edit` - Edit school information
- `/admin/teachers` - View and manage all teachers
- `/admin/teachers/new` - Add new teachers
- `/admin/teachers/[id]` - View teacher details
- `/admin/teachers/[id]/edit` - Edit teacher information
- `/admin/students` - View and manage all students
- `/admin/students/new` - Add new students
- `/admin/students/[id]` - View student details
- `/admin/students/[id]/edit` - Edit student information
- `/admin/parents` - View and manage all parents
- `/admin/parents/new` - Add new parents
- `/admin/parents/[id]` - View parent details
- `/admin/parents/[id]/edit` - Edit parent information
- `/admin/reports` - Generate and view system reports
- `/admin/notifications` - Send system-wide notifications
- `/admin/settings` - Configure system settings

### 2. Principal

**Purpose**: School-level management and oversight

**Key Responsibilities**:
- Oversee school operations and staff
- Manage teachers and students within their school
- Monitor attendance and academic performance
- Generate school-level reports
- Manage exams and certificates

**Available Pages**:
- `/principal` - Dashboard with school statistics
- `/principal/teachers` - View and manage school teachers
- `/principal/teachers/new` - Add new teachers to school
- `/principal/teachers/[id]` - View teacher details
- `/principal/teachers/[id]/edit` - Edit teacher information
- `/principal/students` - View and manage school students
- `/principal/students/new` - Add new students to school
- `/principal/students/[id]` - View student details
- `/principal/students/[id]/edit` - Edit student information
- `/principal/attendance` - Monitor school-wide attendance
- `/principal/exams` - Manage school exams
- `/principal/exams/new` - Create new exams
- `/principal/exams/[id]` - View exam details
- `/principal/fees` - Monitor fee collection
- `/principal/certificates` - Generate and manage certificates
- `/principal/reports` - Generate school reports

### 3. Teacher

**Purpose**: Class management and student instruction

**Key Responsibilities**:
- Manage assigned classes
- Record attendance
- Enter and manage student marks
- Create and grade assignments
- Communicate with students and parents
- Assess student skills

**Available Pages**:
- `/teacher` - Dashboard with class overview
- `/teacher/classes` - View and manage assigned classes
- `/teacher/attendance` - Record and view attendance
- `/teacher/marks` - Enter and manage student marks
- `/teacher/assignments` - Create and manage assignments
- `/teacher/announcements` - Post class announcements
- `/teacher/messages` - Communicate with students and parents
- `/teacher/skills` - Assess student skills

### 4. Student

**Purpose**: View academic information and progress

**Key Responsibilities**:
- View grades and marks
- Check attendance records
- Access assignments
- View certificates
- Communicate with teachers
- Track skill development

**Available Pages**:
- `/student` - Dashboard with academic overview
- `/student/marks` - View marks and grades
- `/student/attendance` - View attendance records
- `/student/fees` - Check fee status
- `/student/certificates` - View and download certificates
- `/student/messages` - Communicate with teachers
- `/student/skills` - View skill assessments

### 5. Parent

**Purpose**: Monitor child's academic progress

**Key Responsibilities**:
- View child's academic performance
- Monitor attendance
- Check fee status
- Communicate with teachers
- Track achievements and progress

**Available Pages**:
- `/parent` - Dashboard with child's overview
- `/parent/children` - View and switch between children
- `/parent/attendance` - Monitor child's attendance
- `/parent/progress` - View academic progress
- `/parent/fees` - Check and manage fee payments
- `/parent/messages` - Communicate with teachers
- `/parent/achievements` - View child's achievements

## Pages and Functionality

### Authentication and Navigation

#### Homepage (`/`)

The homepage features a modern, natural language selection interface where users can:
1. Select their role from a dropdown (Administrator, Principal, Teacher, Student, or Parent)
2. Select their user account from available users
3. View system features, role descriptions, and FAQs
4. Navigate to their role-specific dashboard

The page includes:
- Hero section with role/user selection
- Features showcase
- Role overview cards
- FAQ accordion
- Responsive design optimized for all devices

### View vs Edit Pages

The system implements a clear separation between viewing and editing:

**View Pages** (`/[role]/[resource]/[id]`):
- Display comprehensive information in an organized, read-only format
- Show all relevant details across multiple cards
- Include an "Edit" button to navigate to the edit page
- Optimized for quick information lookup

**Edit Pages** (`/[role]/[resource]/[id]/edit`):
- Provide forms for modifying resource information
- Include validation and error handling
- Save changes back to the database
- Redirect to view page after successful update

### Common Features Across Roles

- **Dashboard**: Role-specific overview with key metrics and quick actions
- **Data Tables**: Sortable, searchable tables for viewing lists of records
- **Forms**: Comprehensive forms with validation for data entry
- **Navigation**: Sidebar navigation with role-appropriate menu items
- **Responsive Design**: Mobile-friendly interface for all pages

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Supabase account and project
- Environment variables configured

### Installation

1. Clone the repository:
\`\`\`bash
git clone <repository-url>
cd sms
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Configure environment variables:
Create a `.env.local` file with your Supabase credentials:
\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
\`\`\`

4. Run the database migrations:
Execute the SQL scripts in the `scripts` folder to set up your database schema.

5. Start the development server:
\`\`\`bash
npm run dev
\`\`\`

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Initial Setup

1. Create your first administrator account in Supabase
2. Log in as administrator
3. Add schools to the system
4. Create principal, teacher, student, and parent accounts
5. Configure classes, subjects, and other system settings

## Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Language**: TypeScript
- **Deployment**: Vercel

## Project Structure

\`\`\`
sms/
├── app/                      # Next.js app directory
│   ├── admin/               # Administrator pages
│   ├── principal/           # Principal pages
│   ├── teacher/             # Teacher pages
│   ├── student/             # Student pages
│   ├── parent/              # Parent pages
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Homepage
│   └── globals.css          # Global styles
├── components/              # React components
│   ├── admin/              # Admin-specific components
│   ├── ui/                 # shadcn/ui components
│   └── nl-select.tsx       # Natural language select
├── contexts/               # React contexts
│   └── role-context.tsx    # Role management context
├── lib/                    # Utility functions
│   ├── api/               # API functions
│   ├── types/             # TypeScript types
│   ├── supabase.ts        # Supabase client
│   └── utils.ts           # Helper functions
└── scripts/               # Database scripts
    └── *.sql              # SQL migrations
\`\`\`

## Database Schema


- `schools` - School information
- `users` - User accounts and authentication
- `staff` - Teacher and principal profiles
- `students` - Student records
- `parents` - Parent information
- `classes` - Class definitions
- `subjects` - Subject information
- `attendance` - Attendance records
- `exams` - Exam definitions
- `marks` - Student marks
- `assignments` - Assignment information
- `messages` - Communication system
- `certificates` - Student certificates
- `skills` - Skill assessments
