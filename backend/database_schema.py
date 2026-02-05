"""
Comprehensive Database Schema Documentation for AI Agent.
This file provides detailed schema information for the LLM to generate accurate SQL queries.
"""

DATABASE_SCHEMA_DOC = """
=== SCHOOL MANAGEMENT DATABASE SCHEMA ===

## RELATIONSHIPS
users (1)→(1) students/staff/parents [via user_id]
schools (1)→(N) classes, staff, students
classes (1)→(N) sections, students, timetable
students (1)→(N) attendance, marks, fees, assignments

---

### 1. USERS
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| phone | VARCHAR(20) | UNIQUE |
| password_hash | VARCHAR(255) | NOT NULL |
| role | VARCHAR(20) | CHECK: 'admin','principal','teacher','student','parent' |
| is_active | BOOLEAN | DEFAULT true |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

→ students.user_id, staff.user_id, parents.user_id all FK here

---

### 2. SCHOOLS
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| name | VARCHAR(255) | NOT NULL |
| school_code | VARCHAR(50) | UNIQUE, NOT NULL |
| address | TEXT | |
| city | VARCHAR(100) | |
| state | VARCHAR(100) | |
| pincode | VARCHAR(10) | |
| phone | VARCHAR(20) | |
| email | VARCHAR(255) | |
| principal_id | UUID | FK → users.id |
| board | VARCHAR(50) | CHECK: 'CBSE','State','ICSE','Other' |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

---

### 3. STAFF
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK → users.id |
| school_id | UUID | FK → schools.id |
| staff_code | VARCHAR(50) | UNIQUE, NOT NULL |
| first_name | VARCHAR(100) | NOT NULL |
| last_name | VARCHAR(100) | NOT NULL |
| date_of_birth | DATE | |
| gender | VARCHAR(20) | CHECK: 'Male','Female','Other' |
| designation | VARCHAR(100) | |
| subject_specialization | VARCHAR(100) | |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

→ class_subjects.teacher_id, timetable.teacher_id FK here

---

### 4. CLASSES
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| school_id | UUID | FK → schools.id |
| name | VARCHAR(50) | NOT NULL |
| grade_level | INTEGER | 1-12 |
| academic_year | VARCHAR(20) | NOT NULL |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

→ students.current_class_id, sections.class_id FK here

---

### 5. SECTIONS
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| class_id | UUID | FK → classes.id |
| name | VARCHAR(10) | NOT NULL (e.g. 'A','B','C') |
| class_teacher_id | UUID | FK → staff.id |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

---

### 6. SUBJECTS
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| school_id | UUID | FK → schools.id |
| name | VARCHAR(100) | NOT NULL |
| code | VARCHAR(20) | |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

---

### 7. CLASS_SUBJECTS (Teacher-Subject-Class mapping)
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| class_id | UUID | FK → classes.id |
| subject_id | UUID | FK → subjects.id |
| teacher_id | UUID | FK → staff.id |
| created_at | TIMESTAMP | DEFAULT NOW() |

Use to: find which teacher teaches which subject in which class.

---

### 8. STUDENTS
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK → users.id |
| school_id | UUID | FK → schools.id |
| admission_number | VARCHAR(50) | UNIQUE, NOT NULL |
| first_name | VARCHAR(100) | NOT NULL |
| last_name | VARCHAR(100) | NOT NULL |
| date_of_birth | DATE | |
| gender | VARCHAR(20) | CHECK: 'Male','Female','Other' |
| blood_group | VARCHAR(10) | |
| address | TEXT | |
| city | VARCHAR(100) | |
| state | VARCHAR(100) | |
| pincode | VARCHAR(10) | |
| current_class_id | UUID | FK → classes.id |
| section_id | UUID | FK → sections.id |
| roll_number | VARCHAR(20) | |
| aadhar_number | VARCHAR(12) | |
| profile_image_url | TEXT | |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

→ attendance.student_id, marks.student_id, student_fees.student_id, student_parents.student_id FK here

---

### 9. PARENTS
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK → users.id |
| first_name | VARCHAR(100) | NOT NULL |
| last_name | VARCHAR(100) | NOT NULL |
| relationship | VARCHAR(50) | CHECK: 'Father','Mother','Guardian' |
| phone | VARCHAR(20) | |
| email | VARCHAR(255) | |
| occupation | VARCHAR(100) | |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

---

### 10. STUDENT_PARENTS (junction)
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| student_id | UUID | FK → students.id |
| parent_id | UUID | FK → parents.id |
| is_primary_contact | BOOLEAN | DEFAULT false |
| created_at | TIMESTAMP | DEFAULT NOW() |

UNIQUE(student_id, parent_id). Use to link students ↔ parents.

---

### 11. ATTENDANCE
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| student_id | UUID | FK → students.id |
| attendance_date | DATE | NOT NULL |
| status | VARCHAR(20) | CHECK: 'Present','Absent','Late','Holiday' |
| marked_by | UUID | FK → staff.id |
| remarks | TEXT | |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

UNIQUE(student_id, attendance_date). Percentage = COUNT(Present)/COUNT(*)*100

---

### 12. LEAVE_REQUESTS
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| student_id | UUID | FK → students.id |
| from_date | DATE | NOT NULL |
| to_date | DATE | NOT NULL |
| reason | TEXT | |
| status | VARCHAR(20) | CHECK: 'Pending','Approved','Rejected' |
| requested_by | UUID | FK → parents.id |
| approved_by | UUID | FK → staff.id |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

---

### 13. EXAMS
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| school_id | UUID | FK → schools.id |
| name | VARCHAR(100) | NOT NULL |
| exam_type | VARCHAR(50) | e.g. 'Unit Test','Term Exam','Final' |
| academic_year | VARCHAR(20) | NOT NULL |
| start_date | DATE | |
| end_date | DATE | |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

---

### 14. EXAM_SCHEDULE (bridge between exams and marks)
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| exam_id | UUID | FK → exams.id |
| class_id | UUID | FK → classes.id |
| subject_id | UUID | FK → subjects.id |
| exam_date | DATE | |
| start_time | TIME | |
| end_time | TIME | |
| max_marks | DECIMAL(5,2) | |
| min_passing_marks | DECIMAL(5,2) | |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

→ marks.exam_schedule_id FK here

---

### 15. MARKS
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| exam_schedule_id | UUID | FK → exam_schedule.id |
| student_id | UUID | FK → students.id |
| marks_obtained | DECIMAL(5,2) | |
| is_absent | BOOLEAN | DEFAULT false |
| entered_by | UUID | FK → staff.id |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

UNIQUE(exam_schedule_id, student_id). Percentage = marks_obtained/max_marks*100

---

### 16. REPORT_CARDS
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| student_id | UUID | FK → students.id |
| exam_id | UUID | FK → exams.id |
| total_marks | DECIMAL(7,2) | |
| marks_obtained | DECIMAL(7,2) | |
| percentage | DECIMAL(5,2) | |
| grade | VARCHAR(5) | |
| rank | INTEGER | |
| teacher_remarks | TEXT | |
| pdf_url | TEXT | |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

---

### 17. FEE_STRUCTURES (templates per class)
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| school_id | UUID | FK → schools.id |
| class_id | UUID | FK → classes.id |
| academic_year | VARCHAR(20) | NOT NULL |
| fee_type | VARCHAR(50) | CHECK: 'Tuition','Exam','Library','Transport','Other' |
| amount | DECIMAL(10,2) | NOT NULL |
| due_date | DATE | |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

---

### 18. STUDENT_FEES
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| student_id | UUID | FK → students.id |
| fee_structure_id | UUID | FK → fee_structures.id |
| academic_year | VARCHAR(20) | NOT NULL |
| total_amount | DECIMAL(10,2) | NOT NULL |
| paid_amount | DECIMAL(10,2) | DEFAULT 0 |
| balance_amount | DECIMAL(10,2) | NOT NULL (= total - paid, auto-calc) |
| due_date | DATE | |
| status | VARCHAR(20) | CHECK: 'Pending','Paid','Overdue','Partial' |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

→ fee_payments.student_fee_id FK here

---

### 19. FEE_PAYMENTS
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| student_fee_id | UUID | FK → student_fees.id |
| payment_method | VARCHAR(50) | CHECK: 'UPI','Card','Cash','NetBanking','Cheque' |
| transaction_id | VARCHAR(255) | |
| payment_date | TIMESTAMP | DEFAULT NOW() |
| amount | DECIMAL(10,2) | NOT NULL |
| payment_status | VARCHAR(20) | CHECK: 'Success','Failed','Pending' |
| receipt_number | VARCHAR(50) | UNIQUE, NOT NULL |
| receipt_pdf_url | TEXT | |
| paid_by | UUID | FK → parents.id |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

---

### 20. TIMETABLE
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| school_id | UUID | FK → schools.id |
| class_id | UUID | FK → classes.id |
| section_id | UUID | FK → sections.id |
| subject_id | UUID | FK → subjects.id |
| teacher_id | UUID | FK → staff.id |
| day_of_week | INTEGER | 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat |
| start_time | TIME | NOT NULL |
| end_time | TIME | NOT NULL |
| room_number | VARCHAR(20) | |
| academic_year | VARCHAR(20) | NOT NULL |
| is_active | BOOLEAN | DEFAULT true |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

---

### 21. PERIOD_DEFINITIONS
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| school_id | UUID | FK → schools.id |
| period_number | INTEGER | NOT NULL |
| period_name | VARCHAR(50) | NOT NULL |
| start_time | TIME | NOT NULL |
| end_time | TIME | NOT NULL |
| is_break | BOOLEAN | DEFAULT false |
| academic_year | VARCHAR(20) | NOT NULL |
| is_active | BOOLEAN | DEFAULT true |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

UNIQUE(school_id, period_number, academic_year)

---

### 22. HOLIDAYS
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| school_id | UUID | FK → schools.id |
| name | VARCHAR(255) | NOT NULL |
| description | TEXT | |
| holiday_date | DATE | NOT NULL |
| holiday_type | VARCHAR(50) | CHECK: 'Holiday','Event','Exam','Half-Day','Vacation' |
| is_recurring | BOOLEAN | DEFAULT false |
| recurring_month | INTEGER | 1-12 |
| recurring_day | INTEGER | 1-31 |
| academic_year | VARCHAR(20) | |
| created_by | UUID | FK → users.id |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

---

### 23. NOTIFICATIONS
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| school_id | UUID | FK → schools.id |
| title | VARCHAR(255) | NOT NULL |
| message | TEXT | NOT NULL |
| notification_type | VARCHAR(50) | CHECK: 'Announcement','Fee','Exam','Attendance','Other' |
| target_audience | VARCHAR(50) | CHECK: 'All','Students','Parents','Teachers','Staff' |
| class_id | UUID | FK → classes.id (optional) |
| sent_by | UUID | FK → staff.id |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

---

### 24. NOTIFICATION_RECIPIENTS
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| notification_id | UUID | FK → notifications.id |
| user_id | UUID | FK → users.id |
| is_read | BOOLEAN | DEFAULT false |
| read_at | TIMESTAMP | |
| created_at | TIMESTAMP | DEFAULT NOW() |

---

### 25. ASSIGNMENTS
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| class_id | UUID | FK → classes.id |
| subject_id | UUID | FK → subjects.id |
| teacher_id | UUID | FK → staff.id |
| title | VARCHAR(255) | NOT NULL |
| description | TEXT | |
| due_date | DATE | |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

---

### 26. CERTIFICATES
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| student_id | UUID | FK → students.id |
| certificate_type | VARCHAR(50) | CHECK: 'TC','Character','Bonafide','Other' |
| certificate_number | VARCHAR(50) | UNIQUE, NOT NULL |
| issue_date | DATE | NOT NULL |
| issued_by | UUID | FK → staff.id |
| pdf_url | TEXT | |
| verification_code | VARCHAR(50) | UNIQUE |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

---

### 27. CERTIFICATE_REQUESTS
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| student_id | UUID | FK → students.id |
| certificate_type | VARCHAR(50) | NOT NULL |
| purpose | TEXT | |
| requested_by | UUID | FK → users.id |
| status | VARCHAR(20) | CHECK: 'Pending','Approved','Rejected','Generated' |
| remarks | TEXT | |
| processed_by | UUID | FK → staff.id |
| processed_at | TIMESTAMP | |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

---

### 28. TRANSFER_REQUESTS
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| student_id | UUID | FK → students.id |
| from_school_id | UUID | FK → schools.id |
| to_school_name | VARCHAR(255) | |
| to_school_address | TEXT | |
| transfer_date | DATE | |
| reason | TEXT | |
| status | VARCHAR(20) | CHECK: 'Pending','Approved','Completed','Rejected' |
| requested_by | UUID | FK → parents.id |
| approved_by | UUID | FK → staff.id |
| tc_number | VARCHAR(50) | UNIQUE |
| tc_pdf_url | TEXT | |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

## IMPORTANT NOTES FOR QUERY GENERATION
1. ALWAYS use proper JOINs - never guess relationships
2. ALWAYS filter by school_id for school-specific data
3. ALWAYS filter by class_id for class-specific data
4. Use GROUP BY with aggregate functions (SUM, COUNT, AVG) when necessary
5. Format currency values properly (no need to convert, stored as DECIMAL)
6. Dates are stored as DATE or TIMESTAMP types
7. UUIDs are used for all primary keys
8. CHECK constraints define allowed values - always use these exact values
9. KEEP QUERIES SIMPLE — only JOIN what the user actually asked for
10. USE ALL TOOLS necessary for fufilling the request 

## BEFORE YOU WRITE THE QUERY, ASK YOURSELF:

1. Does every table I'm using actually have the column I'm selecting?   → Check schema
2. Am I returning any UUID directly?                                     → Join to get the name
3. Are all my aliases using underscores only?                            → Fix if not
4. Does every JOIN I wrote directly serve a column in my SELECT?         → Remove it if not
5. Can the user understand every column in the result without context?   → Add context columns
6. If a query fails, SIMPLIFY your next attempt. Do not add more joins or complexity.

**ALWAYS Perform SIMPLE query many times if necessary rathher than performing complex queries with mutiple joins**
"""


# Anti-hallucination rules for the agent
ANTI_HALLUCINATION_RULES = """
=== CRITICAL: DATA INTEGRITY RULES ===

NEVER FABRICATE DATA:
1. If a query returns empty/no results, respond: "No data found for this query."
2. If database connection fails, respond: "Unable to retrieve data at this time."
3. If tool returns an error, respond: "Could not complete the request. Please try again."
4. NEVER create fictional names, numbers, percentages, or statistics
5. NEVER estimate or approximate values - only report exact database values
6. If asked about data that doesn't exist, say "No records found" - do NOT invent data

HIDE TECHNICAL DETAILS:
1. NEVER show SQL queries in responses
2. NEVER show UUIDs or internal IDs to users
3. NEVER show tool names or function calls in responses
4. NEVER show error stack traces or database errors verbatim
5. Format errors as user-friendly messages only

WHEN DATA IS UNAVAILABLE:
- Say: "No [attendance/fee/marks] records found for [student/class/school]"
- Say: "The requested information is not available in the system"
- Say: "Please verify the student/class exists in the database"
- NEVER say: "Based on typical patterns..." or "Usually..." or "I assume..."
"""

# Improved tool selection guide
TOOL_SELECTION_GUIDE = """
=== TOOL SELECTION GUIDE ===

## UNDERSTAND QUERY SCOPE FIRST:

INDIVIDUAL STUDENT queries (use specialized tools):
- "Show Rahul's attendance" -> get_attendance_analysis(student_id)
- "What are Priya's marks?" -> get_performance_insights(student_id)
- "Check Amit's fee status" -> get_fee_status(student_id)

AGGREGATE/ALL queries (use SQL or class tools):
- "Fee summary for all students" -> run_sql_query(SELECT ... GROUP BY ...)
- "Academic Report of School" -> get_academic_report(school_id)
- "All pending fees" -> run_sql_query(SELECT ... WHERE balance_amount > 0)
- "List all students" -> run_sql_query(SELECT from students)

## TOOL DESCRIPTIONS:

### FOR INDIVIDUAL STUDENT:
- get_performance_insights(student_id)
  USE WHEN: Single student's marks, grades, and academic performance

### FOR CLASS / SCHOOL AGGREGATES:
- get_class_analytics(class_id)
  **PASS class_id by SELECT id from classes**
  USE WHEN: Overall class performance, attendance averages, top 10 students, fee collection stats

- get_academic_report(class_id/school_id/exam_id: uuid)
  USE WHEN: Academic Reports, Rankings, subject-wise analysis, pass/fail statistics of All or any school

- identify_at_risk_students(school_id, class_id)
  USE WHEN: Finding students who need academic intervention

### FOR FEES QUERIES:
- get_fee_status(student_id/class_id/school_id)
  USE WHEN: Get Fee status, details, payments, and dues asked for class/school/student

### FOR ATTENDANCE QUERIES:
- get_attendance_analysis(student_id/class_id/school_id, days=30)
USE WHEN: Attendance analysis is asked for individual student, class-wide, or school-wide.

### FOR CUSTOM/AGGREGATE QUERIES:
- run_sql_query(query)
  USE WHEN:
    - Aggregating data across multiple students
    - Custom filters not covered by other tools
    - Joining multiple tables for reports
    - COUNT, SUM, AVG, GROUP BY operations
    - Listing multiple records

  ALWAYS write complete SQL with proper JOINs using the schema documentation.
  ALWAYS include relevant columns for context (names, class, section, etc.)

### FOR SCHEDULES:
- get_timetable(class_id/teacher_id/school_id/day)
  USE WHEN: Getting class or teacher schedules

- get_holidays(school_id, month, year)
  USE WHEN: Getting holiday calendar

### FOR CERTIFICATES:
- get_certificate_requests(school_id/student_id/status)
  USE WHEN: Viewing certificate request status

### FOR NOTIFICATIONS:
- get_notifications(school_id/class_id/user_id)
  Use when: User asks to view notifications, announcements, or messages

### FOR WRITING (teacher/principal/admin only):
- execute_write_query(query) - For INSERT/UPDATE operations
- send_notification(...) - For sending announcements

## DECISION TREE:

Question mentions "all", "every", "class-wide", "school-wide", "list", "summary"?
  YES -> Use aggregate tools or run_sql_query with GROUP BY/listing
  NO -> Is it about ONE specific student by name or ID?
    YES -> Use individual student tools (get_attendance_analysis, get_performance_insights, get_fee_status)
    NO -> Use run_sql_query with appropriate filters and JOINs

CRITICAL: Never call individual student tools in a loop for aggregate queries!
If asked for "all students' fees", write ONE SQL query with GROUP BY, not multiple get_fee_status calls.
"""
