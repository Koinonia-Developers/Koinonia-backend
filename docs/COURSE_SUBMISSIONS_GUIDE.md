markdown
# 🎯 LMS Course Submissions – Complete Team Guide

---

## 📖 Table of Contents

1. [Feature Overview](#-feature-overview)
2. [User Roles & Permissions](#-user-roles--permissions)
3. [The Complete Submission Lifecycle](#-the-complete-submission-lifecycle)
4. [API Endpoints Guide](#-api-endpoints-guide)
5. [Data Models & Relationships](#-data-models--relationships)
6. [Status Transition Rules](#-status-transition-rules)
7. [Frontend Implementation Guide](#-frontend-implementation-guide)
8. [Backend Implementation Guide](#-backend-implementation-guide)
9. [Testing & Quality Assurance](#-testing--quality-assurance)

---

## 📋 Feature Overview

### What is this feature?

The **Course Submissions** feature allows **Teachers** to create and submit course curriculum packages for review. **Education Managers** then review, approve, and track the implementation of these courses.

**Think of it as a content publishing workflow:**
- Teachers create course content (lessons, exams, materials)
- Managers review the quality and theological accuracy
- Approved content gets published to the LMS for students

### Why is this important?

| Benefit | Description |
| :--- | :--- |
| **Quality Control** | Ensures all courses meet the church's theological standards |
| **Structured Workflow** | Clear stages from draft to published |
| **Audit Trail** | Complete history of who did what and when |
| **Collaboration** | Teachers and managers work together seamlessly |

---

## 👥 User Roles & Permissions

### Who is involved?

| Role | Abbreviation | What they can do |
| :--- | :--- | :--- |
| **Teacher** | `TEACHER` | Create, edit, submit, and delete **their OWN** submissions |
| **Education Manager** | `SERVICE_MANAGER` (የትምህርት ክፍል) | **Can do EVERYTHING a Teacher can do** PLUS review, approve, and publish **ALL** submissions |
| **Secretariat Members** | `SECRETARIAT_*` | ❌ **No special privileges** on this feature |
| **Class Leader** | `CLASS_LEADER` | ❌ **No special privileges** on this feature |
| **Other Members** | `USER`, `MEMBER` | ❌ **No access** to this feature |

### ⚠️ Key Role Corrections

| Role | Status |
| :--- | :--- |
| `SECRETARIAT_SECRETARY` | ❌ Removed – No special privileges |
| `SECRETARIAT_VICE` | ❌ Removed – No special privileges |
| `SECRETARIAT_CHAIRMAN` | ❌ Removed – No special privileges |
| `CLASS_LEADER` | ❌ Removed – No special privileges |
| `SUPER_ADMIN` | ❌ Removed – This role does NOT exist |
| `SERVICE_MANAGER` (የትምህርት ክፍል) | ✅ **Full access** – Teacher + Review + Publish |

### Permission Matrix

| Action | Teacher | Education Manager | Other Roles |
| :--- | :--- | :--- | :--- |
| Create Submission | ✅ | ✅ | ❌ |
| View Own Submissions | ✅ | ✅ | ❌ |
| View ALL Submissions | ❌ | ✅ | ❌ |
| Edit Own Draft | ✅ | ✅ | ❌ |
| Submit for Review | ✅ | ✅ | ❌ |
| Review (Approve/Reject) | ❌ | ✅ | ❌ |
| Publish Content | ❌ | ✅ | ❌ |
| Delete Own Draft | ✅ | ✅ | ❌ |
| Delete Any Submission | ❌ | ✅ | ❌ |

---

## 🔄 The Complete Submission Lifecycle

### Visual Flow Diagram
┌─────────┐ ┌──────────┐ ┌─────────────┐ ┌──────────┐
│ DRAFT │────▶│ SUBMITTED│────▶│ UNDER_REVIEW│────▶│ APPROVED │
└─────────┘ └──────────┘ └─────────────┘ └──────────┘
│ │ │ │
▼ ▼ ▼ ▼
[Teacher] [Teacher] [Manager] [Manager]
Edits content Submits for Reviews and Approves
freely review gives feedback content

│
▼
┌─────────────┐
│ REJECTED │
└─────────────┘
│
▼
[Teacher]
Revises and
resubmits

┌─────────────────────────────────────────────────────────────────┐
│ PUBLICATION PHASE │
│ │
│ ┌─────────────┐ ┌──────────────────┐ ┌──────────┐ │
│ │ APPROVED │────▶│IMPLEMENTATION_ │────▶│ PUBLISHED│ │
│ │ │ │ IN_PROGRESS │ │ │ │
│ └─────────────┘ └──────────────────┘ └──────────┘ │
│ │ │ │ │
│ ▼ ▼ ▼ │
│ [Manager] [Manager] [Manager] │
│ Marks as Final publish │
│ implementation to LMS │
│ in progress │
└─────────────────────────────────────────────────────────────────┘

text

### Status Descriptions

| Status | What it means | Who can act |
| :--- | :--- | :--- |
| **DRAFT** | Teacher is still working on the content | Teacher can edit, submit, or delete |
| **SUBMITTED** | Submitted for review. Waiting for Manager. | Teacher cannot edit. Manager can review. |
| **UNDER_REVIEW** | Manager is actively reviewing | Manager can approve or reject |
| **APPROVED** | Content passed review | Manager can publish |
| **REJECTED** | Content needs revision | Teacher can edit and resubmit |
| **IMPLEMENTATION_IN_PROGRESS** | Being implemented (uploaded to website) | Manager can finalize publish |
| **PUBLISHED** | Content is live on the LMS | No further changes allowed |

---

## 🌐 API Endpoints Guide

### Base URL
https://koinonia-backend-99wb.onrender.com/api/v1/lms/submissions

text

### Endpoint Summary

| Method | Endpoint | Who | Description |
| :--- | :--- | :--- | :--- |
| POST | `/submissions` | Teacher + Manager | Create a new submission |
| GET | `/submissions` | All Auth Users | List submissions (with filters) |
| GET | `/submissions/:id` | Owner + Manager | Get single submission details |
| PUT | `/submissions/:id` | Owner + Manager | Update (DRAFT/REJECTED only) |
| PATCH | `/submissions/:id/submit` | Owner + Manager | Submit for review |
| PATCH | `/submissions/:id/review` | **Manager ONLY** | Approve/Reject |
| PATCH | `/submissions/:id/publish` | **Manager ONLY** | Publish content |
| DELETE | `/submissions/:id` | Owner + Manager | Delete submission |

---

### 1. POST `/submissions` – Create

**Who:** Teachers and Education Managers

**Request Body:**

```json
{
  "batch_id": "uuid-of-the-batch",
  "title": "ምስጢረ ሥላሴ - መግቢያ",
  "content_package": "{ \"course\": { ... }, \"lessons\": [...], \"exam\": {...} }",
  "submit_immediately": false
}
Required Fields:

Field	Type	Required	Description
batch_id	UUID (string)	✅ Yes	ID of the LMS batch
title	string (max 200 chars)	✅ Yes	Course title
content_package	string (JSON)	✅ Yes	JSON string with all course content
submit_immediately	boolean	❌ No (default: false)	If true, status becomes SUBMITTED
Response (201 Created):

json
{
  "id": "uuid",
  "teacher_id": "uuid",
  "batch_id": "uuid",
  "title": "ምስጢረ ሥላሴ - መግቢያ",
  "content_package": "{ ... }",
  "status": "DRAFT",
  "review_feedback": null,
  "implemented_page_url": null,
  "submitted_at": null,
  "reviewed_at": null,
  "implemented_at": null,
  "published_at": null,
  "created_by": "uuid",
  "created_at": "2026-01-15T10:30:00Z",
  "updated_at": "2026-01-15T10:30:00Z"
}
Error Scenarios:

Error	Status	When
Batch not found	404	batch_id doesn't exist
Missing required fields	400	Required fields missing
Invalid UUID format	400	batch_id is not a valid UUID
2. GET /submissions – List
Who: All authenticated users

Query Parameters:

Parameter	Type	Default	Description
page	integer	1	Page number
limit	integer	20	Items per page (max 100)
batch_id	UUID	-	Filter by batch
status	string	-	Filter by status
teacher_id	UUID	-	Filter by teacher (Managers only)
Data Scoping Rules:

Teacher: Only sees teacher_id = req.user.userID

Education Manager: Sees ALL submissions

Other roles: No access

Response (200 OK):

json
{
  "data": [
    {
      "id": "uuid",
      "title": "ምስጢረ ሥላሴ - መግቢያ",
      "status": "DRAFT",
      "submitted_at": null,
      "created_at": "2026-01-15T10:30:00Z",
      "lms_batches": {
        "id": "uuid",
        "title": "Batch 2024 - ጉባኤ አበው",
        "code": "BATCH-2024-01"
      },
      "users_course_submissions_teacher_idTousers": {
        "id": "uuid",
        "full_name_three_parts": "አበበ ቀለም ወርቅ",
        "email": "abebe@example.com",
        "profile_image_url": "https://..."
      }
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
3. GET /submissions/:id – Details
Who: Owner (Teacher) or Education Manager

Response (200 OK):

json
{
  "id": "uuid",
  "teacher_id": "uuid",
  "batch_id": "uuid",
  "title": "ምስጢረ ሥላሴ - መግቢያ",
  "content_package": "{ \"course\": { ... }, \"lessons\": [...], \"exam\": {...} }",
  "status": "UNDER_REVIEW",
  "review_feedback": "Excellent content. Please add more references.",
  "implemented_page_url": null,
  "submitted_at": "2026-01-16T09:00:00Z",
  "reviewed_at": "2026-01-17T14:30:00Z",
  "implemented_at": null,
  "published_at": null,
  "created_by": "uuid",
  "created_at": "2026-01-15T10:30:00Z",
  "updated_at": "2026-01-17T14:30:00Z",
  "lms_batches": {
    "id": "uuid",
    "title": "Batch 2024 - ጉባኤ አበው",
    "code": "BATCH-2024-01"
  },
  "users_course_submissions_teacher_idTousers": {
    "id": "uuid",
    "full_name_three_parts": "አበበ ቀለም ወርቅ",
    "email": "abebe@example.com",
    "profile_image_url": "https://..."
  },
  "created_by_user": {
    "id": "uuid",
    "full_name_three_parts": "አበበ ቀለም ወርቅ",
    "email": "abebe@example.com",
    "profile_image_url": "https://..."
  }
}
4. PUT /submissions/:id – Update
Who: Teacher (owner) OR Education Manager – only when status is DRAFT or REJECTED

Request Body:

json
{
  "title": "ምስጢረ ሥላሴ - የተሻሻለ ርዕስ",
  "content_package": "{ ... updated content ... }"
}
Field	Type	Required	Description
title	string	❌ No	Updated title
content_package	string (JSON)	❌ No	Updated content package
Response (200 OK): Returns the updated submission object.

5. PATCH /submissions/:id/submit – Submit
Who: Teacher (owner) OR Education Manager

Request Body: None

Transitions: DRAFT → SUBMITTED

Response (200 OK): Returns the updated submission object.

6. PATCH /submissions/:id/review – Review
Who: Education Manager ONLY

Request Body:

json
{
  "status": "APPROVED",
  "review_feedback": "Great content! Please add a section on the Holy Spirit."
}
Field	Type	Required	Description
status	string	✅ Yes	One of: UNDER_REVIEW, APPROVED, REJECTED
review_feedback	string	❌ No	Feedback for the teacher (max 500 chars)
Response (200 OK): Returns the updated submission object.

7. PATCH /submissions/:id/publish – Publish
Who: Education Manager ONLY

Request Body:

json
{
  "status": "PUBLISHED",
  "implemented_page_url": "https://endaeyesusbete.vercel.app/courses/trinity"
}
Field	Type	Required	Description
status	string	✅ Yes	One of: IMPLEMENTATION_IN_PROGRESS, PUBLISHED
implemented_page_url	string	❌ No	URL where the content is accessible
Response (200 OK): Returns the updated submission object.

8. DELETE /submissions/:id – Delete
Who: Teacher (owner, if DRAFT/REJECTED) OR Education Manager (any status)

Response (200 OK):

json
{
  "success": true
}
📊 Data Models & Relationships
Course Submissions Table
Column	Type	Description
id	UUID	Primary key
teacher_id	UUID	References users.id (Teacher)
batch_id	UUID	References lms_batches.id
title	String (200)	Course title
content_package	JSON	Entire course content
status	Enum	DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, IMPLEMENTATION_IN_PROGRESS, PUBLISHED
review_feedback	Text	Feedback from manager
implemented_page_url	String	URL where content is live
submitted_at	DateTime	When submitted
reviewed_at	DateTime	When reviewed
implemented_at	DateTime	When implementation started
published_at	DateTime	When published
created_by	UUID	Who created this
created_at	DateTime	Auto-generated
updated_at	DateTime	Auto-updated
Relationships
text
users (Teacher)
    │
    │ 1 ──── * (One teacher can have many submissions)
    ▼
course_submissions
    │
    │ * ──── 1 (Many submissions belong to one batch)
    ▼
lms_batches
🔒 Status Transition Rules
Allowed Transitions
From Status	To Status	Allowed By	Notes
(New)	DRAFT	Teacher	Default on create
(New)	SUBMITTED	Teacher	If submit_immediately: true
DRAFT	SUBMITTED	Teacher	Submit for review
DRAFT	DRAFT	Teacher	Edit saved as draft
REJECTED	DRAFT	Teacher	Edit after rejection
SUBMITTED	UNDER_REVIEW	Education Manager	Start reviewing
UNDER_REVIEW	APPROVED	Education Manager	Approve content
UNDER_REVIEW	REJECTED	Education Manager	Reject with feedback
APPROVED	IMPLEMENTATION_IN_PROGRESS	Education Manager	Start implementation
IMPLEMENTATION_IN_PROGRESS	PUBLISHED	Education Manager	Final publish
APPROVED	PUBLISHED	Education Manager	Skip implementation (publish directly)
Disallowed Transitions
From Status	To Status	Why
SUBMITTED	DRAFT	Cannot unsend a submission
APPROVED	DRAFT	Cannot unapprove
PUBLISHED	Any other	Cannot unpublish (except by admin deletion)
DRAFT	APPROVED	Cannot skip the submission step
🎨 Frontend Implementation Guide
Pages to Build
Page	URL	Description
Submission List	/teacher/submissions	Teacher view
Submission List	/admin/submissions	Manager view
Create Submission	/teacher/submissions/create	New submission form
Edit Submission	/teacher/submissions/:id/edit	Edit form
Submission Detail	/submissions/:id	Full details
Review Submission	/admin/submissions/:id/review	Review panel
UI Components
Component	Description
SubmissionCard	Display submission in list
StatusBadge	Color-coded status badge
LessonBuilder	Rich text editor + drag-and-drop
ExamBuilder	Question editor with options
ContentPreview	Render lessons + exam
ActionButtons	Conditional based on status/role
ReviewPanel	Status + feedback form
FilterBar	Dropdown filters
Pagination	Page controls
Status Color Scheme
Status	Color	Hex
DRAFT	Gray	#6B7280
SUBMITTED	Blue	#3B82F6
UNDER_REVIEW	Yellow	#F59E0B
APPROVED	Green	#10B981
REJECTED	Red	#EF4444
IMPLEMENTATION_IN_PROGRESS	Purple	#8B5CF6
PUBLISHED	Emerald	#059669
🛠️ Backend Implementation Guide
Files to Create
text
src/modules/course-submissions/
├── course-submissions.controller.ts  ← HTTP handlers
├── course-submissions.service.ts     ← Business logic + Prisma
├── course-submissions.routes.ts      ← Router + middleware
└── course-submissions.schema.ts      ← Zod validation
Implementation Order (Recommended)
Schema – Define Zod schemas for all requests

Service – Implement each database operation

Controller – Wrap service methods with HTTP handlers

Routes – Define all endpoints with middleware

Registration – Import and use routes in app.ts

🔑 Critical Backend Logic (Service Layer)
typescript
// Helper to check if user is an Education Manager
private isEducationManager(user: JwtPayload): boolean {
  return user.role === 'SERVICE_MANAGER' && 
         user.serviceClassName === 'የትምህርት ክፍል';
}

// Helper to check ownership OR manager status
private canModify(user: JwtPayload, submissionTeacherId: string): boolean {
  return user.userID === submissionTeacherId || 
         this.isEducationManager(user);
}

// Example: DELETE logic
async delete(user: JwtPayload, id: string) {
  const submission = await this.getSubmissionById(id);
  
  // Education Manager -> always allowed
  if (this.isEducationManager(user)) {
    return db.course_submissions.delete({ where: { id } });
  }
  
  // Owner must have DRAFT or REJECTED status
  if (submission.teacher_id !== user.userID) {
    throw new ForbiddenError('You are not the owner of this submission');
  }
  if (!['DRAFT', 'REJECTED'].includes(submission.status)) {
    throw new BadRequestError('Cannot delete submissions that are not DRAFT or REJECTED');
  }
  
  return db.course_submissions.delete({ where: { id } });
}
✅ Definition of Done – Team Checklist
Backend Team
□ All 8 endpoints implemented and tested
□ Zod validation schemas for all requests
□ Education Manager has full Teacher + Review/Publish privileges
□ Secretariat/Class Leader have NO special privileges
□ No SUPER_ADMIN role in the system
□ Proper data scoping (Teachers see only their own)
□ Status transition guards prevent invalid changes
□ Swagger UI shows all endpoints with examples
□ No TypeScript/ESLint errors
□ Unit tests for service layer
□ Integration tests for API endpoints
□ Postman collection created/shared
Frontend Team
□ Submission list page with filters and pagination
□ Create submission form with lesson/exam builder
□ Edit submission form
□ Submission detail page with all metadata
□ Status badges with correct colors
□ Conditional action buttons based on status/role
□ No UI elements for Secretariat/Class Leader special access
□ Review panel for managers
□ Publish panel for managers
□ Delete with confirmation dialog
□ Error handling for all API calls
□ Loading states
□ Responsive design (mobile + desktop)
QA Team
□ Test all API endpoints (Postman collection)
□ Test role-based permissions (Teacher vs Education Manager)
□ Verify Secretariat/Class Leader have NO special access
□ Verify Education Manager can do everything a Teacher can do
□ Test data scoping (teacher sees only own submissions)
□ Test all status transitions
□ Test edge cases (invalid UUIDs, non-existent records)
□ Test rejection scenario (Teacher edits after rejection)
□ Test approval and publish flow
□ Test delete permissions
📊 Summary Table – Quick Reference
Action	Endpoint	Teacher	Education Manager	Other Roles
Create	POST /submissions	✅	✅	❌
List	GET /submissions	✅ (own only)	✅ (all)	❌
Get Detail	GET /submissions/:id	✅ (own)	✅ (all)	❌
Update	PUT /submissions/:id	✅ (draft/rejected)	✅ (draft/rejected)	❌
Submit	PATCH /submissions/:id/submit	✅	✅	❌
Review	PATCH /submissions/:id/review	❌	✅	❌
Publish	PATCH /submissions/:id/publish	❌	✅	❌
Delete	DELETE /submissions/:id	✅ (draft/rejected)	✅ (any)	❌
🚀 Summary of Key Changes
Aspect	Old (Incorrect)	New (Correct)
Secretariat roles	Had review/publish access	❌ No special privileges
Class Leader	Had view-only access	❌ No special privileges
Super Admin	Listed as a role	❌ Removed (doesn't exist)
Education Manager	Could only review/publish	✅ Can do EVERYTHING (Teacher + Manager)
Teacher	Could only create	✅ Full CRUD on own submissions
Member/USER	Not mentioned	❌ No access to this feature
📞 Need Help?
Issue	Contact
API questions	Backend Lead
UI/UX questions	Frontend Lead
Database questions	Database Admin
Permissions questions	Product Manager
Timeline questions	Project Manager
Good luck, team! Let's build this together! 🎉

text

---

## ✅ How to Use This

1. Copy **everything inside the markdown code block** above
2. Paste it into `docs/COURSE_SUBMISSIONS_GUIDE.md`
3. Save the file
4. Commit and push

**Now every single note is inside proper Markdown formatting** – no mixed content, no raw text outside the structure. GitHub will render it beautifully! 🚀