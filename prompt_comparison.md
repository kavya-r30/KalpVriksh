# Prompt Comparison: Token Optimization

This document shows the original verbose prompts vs the new shortened prompts for token savings.

---

## 1. DATABASE SCHEMA MAP

### ORIGINAL (app.py lines 1185-1230) - ~1,200 tokens

```
"**1. IDENTITY & PEOPLE:**",
"   - `users`: Root authentication table (id, email, role: admin/principal/teacher/student/parent)",
"   - `students`: Student profiles (user_id links to users, current_class_id, section_id, admission_number, roll_number)",
"   - `staff`: Teacher/staff profiles (user_id links to users, school_id, designation, subject_specialization)",
"   - `parents`: Parent profiles (user_id links to users)",
"   - `student_parents`: Links students to parents (student_id, parent_id, is_primary_contact)",

"**2. SCHOOL STRUCTURE:**",
"   - `schools`: School info (id, name, school_code, principal_id, board: CBSE/State/ICSE/Other)",
"   - `classes`: Grade levels (school_id, name, grade_level, academic_year)",
"   - `sections`: Class divisions (class_id, name, class_teacher_id)",
"   - `subjects`: Academic subjects (school_id, name, code)",
"   - `class_subjects`: Links subjects to classes with teachers (class_id, subject_id, teacher_id)",

... (continues for all 9 categories with full descriptions)
```

### NEW (instructions.py) - ~400 tokens

```
TABLES:
- users(id,email,role:admin/principal/teacher/student/parent)
- students(id,user_id,school_id,current_class_id,section_id,admission_number,roll_number,first_name,last_name)
- staff(id,user_id,school_id,designation,subject_specialization)
- parents(id,user_id) -> student_parents(student_id,parent_id,is_primary_contact)
- schools(id,name,school_code,principal_id,board:CBSE/State/ICSE)
... (compact one-liner format)
```

**SAVINGS: ~800 tokens (67% reduction)**

---

## 2. TOOL USAGE GUIDE

### ORIGINAL (app.py lines 1240-1295) - ~800 tokens

```
"=" * 50,
"### TOOL USAGE GUIDE",
"=" * 50,
"""
CHOOSE THE RIGHT TOOL:

1. **run_sql_query** - For ANY data retrieval
   - Use for: "Show me...", "List...", "How many...", "Who...", "What..."
   - Returns: JSON data from SELECT queries

2. **execute_write_query** - For data modifications (if permitted)
   - Use for: "Add...", "Update...", "Mark...", "Change..."
   - Always verify data exists first with run_sql_query

3. **get_table_schema** - When unsure about columns
   - Use for: Unknown column names, query errors

... (continues with full descriptions for all 13 tools)
```

### NEW (instructions.py) - ~200 tokens

```
TOOLS:
1. run_sql_query - SELECT queries for reading data
2. execute_write_query - INSERT/UPDATE for modifications (teacher/principal/admin only)
3. get_table_schema - Get column names when unsure
4. get_attendance_analysis - Attendance stats with recommendations
5. get_performance_insights - Academic analysis with trends
... (compact list format)
```

**SAVINGS: ~600 tokens (75% reduction)**

---

## 3. RESPONSE GUIDELINES

### ORIGINAL (app.py lines 1297-1327) - ~500 tokens

```
"=" * 50,
"### RESPONSE GUIDELINES",
"=" * 50,
"""
1. **Be Comprehensive**:
   - For academic reports: Include TOP 10 students, class average, highest/lowest marks
   - For attendance: Include percentage, pattern, recent absences
   - For fees: Include breakdown, overdue amount, payment history

2. **Provide Rich Context**:
   - Don't just give numbers - explain what they mean
   - Include comparisons (vs class average, vs previous exams)
   - Add recommendations when relevant

3. **Format Nicely**:
   - Use tables for lists (students, marks, fees)
   - Use bullet points for summaries
   - Use headers for sections
   - Format currency with ₹ symbol
   - Format dates in readable format

4. **Be Proactive**:
   - If checking marks, also mention attendance if concerning
   - If checking fees, mention overdue items prominently
   - Suggest next steps when appropriate

5. **Handle Multiple Queries**:
   - Address ALL parts of compound questions
   - Use clear sections for each part
   - Summarize at the end if multiple topics covered
```

### NEW (instructions.py) - ~150 tokens

```
RESPONSE RULES:
1. NEVER include SQL code or query syntax in responses - only show the results
2. NEVER use emojis in responses
3. Format data in clean tables or bullet points
4. Use Rs. for currency (not rupee symbol)
5. Format dates as DD-MMM-YYYY (e.g., 15-Jan-2025)
6. Always provide context and meaning, not just raw numbers
7. Include recommendations when relevant

MULTI-PART QUERIES:
When user asks multiple things (using "and", "also", commas):
- Address EACH part separately
- Use clear sections/headers for each part
- Never skip any part of the question
```

**SAVINGS: ~350 tokens (70% reduction)**

---

## 4. MULTI-PART QUERY INSTRUCTION

### ORIGINAL (app.py lines 1162-1182) - ~250 tokens

```
"=" * 50,
"### CRITICAL: MULTI-PART QUERY HANDLING",
"=" * 50,
"""
IMPORTANT: When a user asks a question with multiple parts (containing 'and', 'also', 'as well as', commas, or multiple questions):
1. IDENTIFY all parts of the question
2. ADDRESS EACH PART separately and completely
3. DO NOT skip or ignore any part
4. Structure your response with clear sections for each part

Example: "Show me attendance AND marks for student X"
- First, get attendance data
- Then, get marks data
- Present BOTH in your response

Example: "How many students are there and what is the fee collection?"
- Answer student count
- Answer fee collection
- Include both in response

NEVER respond to just one part when multiple are asked!
"""
```

### NEW (instructions.py) - ~70 tokens

```
MULTI-PART QUERIES:
When user asks multiple things (using "and", "also", commas):
- Address EACH part separately
- Use clear sections/headers for each part
- Never skip any part of the question
```

**SAVINGS: ~180 tokens (72% reduction)**

---

## 5. ROLE-SPECIFIC INSTRUCTIONS

### ORIGINAL (app.py - get_student_instructions) - ~200 tokens

```
"### STUDENT ACCESS RULES:",
f"1. First, get your student ID: `SELECT id FROM students WHERE user_id = '{user_id}'`",
"2. You can ONLY view YOUR OWN data - always filter by your student_id",
"3. You CANNOT modify any data (no INSERT/UPDATE permissions)",
"",
"**What you CAN access:**",
"- Your attendance records and analysis",
"- Your marks and performance insights",
"- Your fee status and payment history",
"- Your class timetable",
"- School holidays and events",
"- Your certificates and requests",
"- Notifications meant for you",
"- Your assignments and homework",
"",
"**Helpful responses:**",
"- When asked about performance, also check upcoming exams",
"- When asked about attendance, mention if there are concerns",
"- Suggest improvement tips based on weak subjects",
```

### NEW (instructions.py) - ~60 tokens

```
"STUDENT ACCESS:",
f"1. Get your ID: SELECT id FROM students WHERE user_id = '{user_id}'",
"2. Only view YOUR OWN data - always filter by your student_id",
"3. NO write permissions (cannot INSERT/UPDATE)",
"CAN ACCESS: Your attendance, marks, fees, timetable, holidays, certificates, notifications"
```

**SAVINGS: ~140 tokens (70% reduction)**

---

## TOTAL TOKEN SAVINGS SUMMARY

| Section | Original | New | Savings | % Reduction |
|---------|----------|-----|---------|-------------|
| Database Schema Map | ~1,200 | ~400 | 800 | 67% |
| Tool Usage Guide | ~800 | ~200 | 600 | 75% |
| Response Guidelines | ~500 | ~150 | 350 | 70% |
| Multi-Part Query | ~250 | ~70 | 180 | 72% |
| Role Instructions (x5) | ~1,000 | ~300 | 700 | 70% |
| **TOTAL** | **~3,750** | **~1,120** | **~2,630** | **70%** |

---

## NEW ADDITIONS (Response Formatting)

Added rules that were missing from original:

1. **No SQL in responses**: "NEVER include SQL code or query syntax in responses"
2. **No emojis**: "NEVER use emojis in responses"
3. **Currency format**: "Use Rs. for currency (not rupee symbol)"
4. **Date format**: "Format dates as DD-MMM-YYYY"

These additions are minimal (~30 tokens) but provide critical guidance for clean output.

---

## CONCLUSION

The new modular structure with optimized prompts:
- Reduces token usage by approximately **70%** (~2,630 tokens saved per request)
- Maintains all essential information
- Adds missing response formatting rules
- Improves code organization and maintainability
