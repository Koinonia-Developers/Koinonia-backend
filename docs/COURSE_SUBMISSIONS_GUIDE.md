🎯 LMS Course Submissions Feature – Complete Team Guide (UPDATED)
📖 Table of Contents
Feature Overview

User Roles & Permissions

The Complete Submission Lifecycle

API Endpoints – Frontend & Backend Guide

Data Models & Relationships

Status Transition Rules

Frontend Implementation Guide

Backend Implementation Checklist

Testing & Quality Assurance

📋 Feature Overview
What is this feature?
The Course Submissions feature allows Teachers to create and submit course curriculum packages for review. Education Managers then review, approve, and track the implementation of these courses.

Think of it as a content publishing workflow where:

Teachers create course content (lessons, exams, materials)

Managers review the quality and theological accuracy

Approved content gets published to the LMS for students

Why is this important?
Quality Control: Ensures all courses meet the church's theological standards

Structured Workflow: Clear stages from draft to published

Audit Trail: Complete history of who did what and when

Collaboration: Teachers and managers work together seamlessly

👥 User Roles & Permissions
Who is involved?
Role	Abbreviation	What they can do
Teacher	TEACHER	Create, edit, submit, and delete their OWN submissions
Education Manager	SERVICE_MANAGER (የትምህርት ክፍል)	Can do EVERYTHING a Teacher can do (create, edit, submit, delete) PLUS review, approve/reject, and publish ALL submissions
Secretariat Members	SECRETARIAT_SECRETARY, SECRETARIAT_VICE, SECRETARIAT_CHAIRMAN	❌ No special privileges on this feature. Treated as regular members.
Class Leader	CLASS_LEADER	❌ No special privileges on this feature. Treated as regular members.
Other Members	USER, MEMBER	❌ No access to this feature at all.
✅ Key Corrections
Role	Status
SECRETARIAT_SECRETARY	❌ Removed – No special privileges
SECRETARIAT_VICE	❌ Removed – No special privileges
SECRETARIAT_CHAIRMAN	❌ Removed – No special privileges
CLASS_LEADER	❌ Removed – No special privileges
SUPER_ADMIN	❌ Removed – This role does not exist
SERVICE_MANAGER (የትምህርት ክፍል)	✅ Full access – Can do everything a Teacher can do, PLUS Review & Publish
Permission Matrix (Simple View)
Action	Teacher	Education Manager	Secretariat / Class Leader / Member
Create Submission	✅ Yes	✅ Yes	❌ No
View Own Submissions	✅ Yes	✅ Yes	❌ No
View ALL Submissions	❌ No	✅ Yes	❌ No
Edit Own Draft	✅ Yes	✅ Yes	❌ No
Submit for Review	✅ Yes	✅ Yes	❌ No
Review (Approve/Reject)	❌ No	✅ Yes	❌ No
Publish Content	❌ No	✅ Yes	❌ No
Delete Own Draft	✅ Yes	✅ Yes	❌ No
Delete Any Submission	❌ No	✅ Yes	❌ No
🔄 The Complete Submission Lifecycle
Visual Flow Diagram
text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COURSE SUBMISSION LIFECYCLE                              │
│                                                                             │
│  ┌─────────┐     ┌──────────┐     ┌─────────────┐     ┌──────────┐       │
│  │  DRAFT   │────▶│ SUBMITTED│────▶│ UNDER_REVIEW│────▶│ APPROVED │       │
│  └─────────┘     └──────────┘     └─────────────┘     └──────────┘       │
│       │               │                  │                  │              │
│       │               │                  │                  │              │
│       ▼               ▼                  ▼                  ▼              │
│  [Teacher]       [Teacher]        [Manager]          [Manager]           │
│  Edits content   Submits for      Reviews and        Approves            │
│  freely          review           gives feedback     content             │
│                                                                             │
│                                       │                                     │
│                                       ▼                                     │
│                               ┌─────────────┐                              │
│                               │  REJECTED   │                              │
│                               └─────────────┘                              │
│                                    │                                        │
│                                    ▼                                        │
│                               [Teacher]                                    │
│                               Revises and                                  │
│                               resubmits                                    │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    PUBLICATION PHASE                                │  │
│  │                                                                      │  │
│  │  ┌─────────────┐     ┌──────────────────┐     ┌──────────┐        │  │
│  │  │  APPROVED   │────▶│IMPLEMENTATION_   │────▶│ PUBLISHED│        │  │
│  │  │             │     │ IN_PROGRESS      │     │          │        │  │
│  │  └─────────────┘     └──────────────────┘     └──────────┘        │  │
│  │                            │                     │                   │  │
│  │                            ▼                     ▼                   │  │
│  │                       [Manager]            [Manager]                │  │
│  │                       Marks as            Final publish            │  │
│  │                       implementation      to LMS                   │  │
│  │                       in progress                                  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
Status Descriptions (For Everyone)
Status	What it means	Who can act
DRAFT	Teacher is still working on the content. Not ready for review.	Teacher can edit, submit, or delete.
SUBMITTED	Teacher has finished and submitted for review. Waiting for Manager.	Teacher cannot edit anymore. Manager can start review.
UNDER_REVIEW	Manager is actively reviewing the content.	Manager can approve or reject with feedback.
APPROVED	Content passed review. Ready for implementation/publishing.	Manager can mark as "in progress" or publish directly.
REJECTED	Content needs revision. Teacher gets feedback.	Teacher can edit and resubmit.
IMPLEMENTATION_IN_PROGRESS	Content is being implemented (e.g., being uploaded to the website).	Manager can finalize publish.
PUBLISHED	Content is live on the LMS. Students can access it.	No further changes (except by admin).
🌐 API Endpoints – Frontend & Backend Guide
Base URL
text
https://koinonia-backend-99wb.onrender.com/api/v1/lms/submissions
1. POST /submissions – Create a New Submission
Who can use this: Teachers and Education Managers

What it does: Creates a new course submission. The status is either DRAFT or SUBMITTED depending on the submit_immediately flag.

Request Body:

json
{
  "batch_id": "uuid-of-the-batch",
  "title": "ምስጢረ ሥላሴ - መግቢያ",
  "content_package": "{ \"course\": { ... }, \"lessons\": [...], \"exam\": {...} }",
  "submit_immediately": false
}
Field	Type	Required	Description
batch_id	UUID (string)	✅ Yes	ID of the LMS batch this submission belongs to
title	string (max 200 chars)	✅ Yes	Course title
content_package	string (JSON)	✅ Yes	The entire course content (lessons, exam, etc.) as a JSON string
submit_immediately	boolean	❌ No (default: false)	If true, status becomes SUBMITTED immediately
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
Missing required fields	400	batch_id, title, or content_package missing
Invalid UUID format	400	batch_id is not a valid UUID
Frontend Implementation:

Show a "Create Submission" form with:

Batch dropdown (fetch from /api/v1/lms/batches)

Title input

Content builder (lessons + exam)

"Save as Draft" and "Submit for Review" buttons

If user clicks "Submit for Review" → set submit_immediately: true

After successful creation, redirect to the submission detail page

Backend Implementation:

Validate that batch_id exists in lms_batches

Create the submission with teacher_id from req.user.userID

Set status based on submit_immediately flag

Allow both TEACHER and SERVICE_MANAGER (Education Manager) roles

2. GET /submissions – List All Submissions (with Filters)
Who can use this: All authenticated users

What it does: Returns a paginated list of submissions. Teachers see only their own. Education Managers see all.

Query Parameters:

Parameter	Type	Default	Description
page	integer	1	Page number
limit	integer	20	Items per page (max 100)
batch_id	UUID	-	Filter by batch
status	string	-	Filter by status (e.g., DRAFT, SUBMITTED)
teacher_id	UUID	-	Filter by teacher (Managers only)
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
Data Scoping (Important!):

Teacher: Only sees teacher_id = req.user.userID

Education Manager: Can see ALL submissions, and can filter by teacher_id

Other roles: No access

Frontend Implementation:

Display a table/list of submissions with:

Title

Batch name

Teacher name

Status (with color-coded badge)

Created/Submitted date

Add filters (dropdowns for status, batch, teacher)

Add pagination controls (Previous/Next, page numbers)

Click on a row → navigate to detail page

Backend Implementation:

Apply data scoping based on req.user.role

Build where clause from query parameters

Use prisma.course_submissions.findMany() with pagination

Use prisma.course_submissions.count() for total count

Include batch and teacher relations

3. GET /submissions/{id} – Get Single Submission Details
Who can use this: Owner (Teacher) or Education Manager

What it does: Returns full details of a single submission including all relations.

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
Frontend Implementation:

Show a detailed view with:

Title and metadata (batch, teacher, dates)

Status badge with color

Content preview (render lessons and exam)

Feedback section (if reviewed)

Action buttons based on status and role

Action buttons logic:

Teacher OR Education Manager:

DRAFT → Show "Edit", "Submit for Review", "Delete"

REJECTED → Show "Edit", "Submit for Review"

SUBMITTED or UNDER_REVIEW → Show "View Only"

Education Manager ONLY:

SUBMITTED or UNDER_REVIEW → Show "Approve", "Reject with Feedback"

APPROVED → Show "Mark as In Progress", "Publish"

IMPLEMENTATION_IN_PROGRESS → Show "Publish"

Backend Implementation:

Fetch submission by ID with all relations

Check permissions:

Teacher/Education Manager → only if teacher_id === req.user.userID (or Education Manager can access any)

Education Manager → always allowed

Others → 403 Forbidden

Throw NotFoundError if submission doesn't exist

4. PUT /submissions/{id} – Update Submission
Who can use this: Teacher (owner) OR Education Manager – only when status is DRAFT or REJECTED

What it does: Updates the title or content package.

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

Frontend Implementation:

Pre-fill the edit form with existing data

Show "Save Changes" button

Disable editing if status is not DRAFT or REJECTED

After saving, refresh the detail page

Backend Implementation:

Check if submission exists and user is owner OR Education Manager

Validate status is DRAFT or REJECTED

Update only provided fields

Update updated_at timestamp

5. PATCH /submissions/{id}/submit – Submit for Review
Who can use this: Teacher (owner) OR Education Manager

What it does: Transitions status from DRAFT → SUBMITTED.

Request Body: None

Response (200 OK): Returns the updated submission object.

Frontend Implementation:

Show "Submit for Review" button on draft submissions

Show confirmation dialog: "Are you sure you want to submit this for review?"

On confirmation, call the endpoint and refresh the page

Disable the button after submission

Backend Implementation:

Check if submission exists and user is owner OR Education Manager

Validate current status is DRAFT

Update status to SUBMITTED and set submitted_at

6. PATCH /submissions/{id}/review – Review Submission
Who can use this: Education Manager ONLY

What it does: Approves or rejects a submission with optional feedback.

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

Frontend Implementation:

Show a "Review" panel with:

Status dropdown (Approve / Reject / Under Review)

Feedback textarea

Submit button

Display existing feedback if available

After review, refresh the page and show updated status

Backend Implementation:

Check if user has Education Manager privileges using requireEducationManager guard

Validate that the provided status is one of the allowed values

Update status and set reviewed_at

7. PATCH /submissions/{id}/publish – Publish Content
Who can use this: Education Manager ONLY

What it does: Marks content as implemented or publishes it.

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

Frontend Implementation:

Show "Publish" panel with:

Status dropdown (Implementation in Progress / Published)

URL input field (optional)

Submit button

After publishing, refresh the page

Backend Implementation:

Check if user has Education Manager privileges using requireEducationManager guard

Validate status transition is allowed

Update status and set appropriate timestamps

8. DELETE /submissions/{id} – Delete Submission
Who can use this: Teacher (owner, if DRAFT/REJECTED) OR Education Manager (any status)

What it does: Permanently deletes the submission.

Response (200 OK):

json
{
  "success": true
}
Frontend Implementation:

Show "Delete" button with:

Confirmation dialog: "Are you sure you want to delete this submission? This action cannot be undone."

Disable if user doesn't have permission

On confirmation, call the endpoint and redirect to the list page

Backend Implementation:

Check if user is owner OR Education Manager

If owner, validate status is DRAFT or REJECTED

If Education Manager, allow deletion regardless of status

Delete the record

📊 Data Models & Relationships
Key Tables
text
┌─────────────────────────────────────────────────────────────────────────┐
│                        course_submissions                               │
├─────────────────────────────────────────────────────────────────────────┤
│ id (UUID)              ← Primary key                                   │
│ teacher_id (UUID)      ← References users.id (Teacher)                │
│ batch_id (UUID)        ← References lms_batches.id                    │
│ title (String)         ← Course title (max 200 chars)                 │
│ content_package (JSON) ← The entire course content                    │
│ status (Enum)          ← DRAFT | SUBMITTED | UNDER_REVIEW | ...      │
│ review_feedback (Text) ← Feedback from manager                        │
│ implemented_page_url   ← URL where content is live                    │
│ submitted_at           ← When teacher submitted                       │
│ reviewed_at            ← When manager reviewed                        │
│ implemented_at         ← When implementation started                  │
│ published_at           ← When content went live                       │
│ created_by (UUID)      ← Who created this record                     │
│ created_at             ← Auto-generated                               │
│ updated_at             ← Auto-updated                                 │
└─────────────────────────────────────────────────────────────────────────┘
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
Submission List	/teacher/submissions	List all submissions (teacher view)
Submission List	/admin/submissions	List all submissions (manager view)
Create Submission	/teacher/submissions/create	Form to create a new submission
Edit Submission	/teacher/submissions/:id/edit	Edit an existing submission
Submission Detail	/submissions/:id	View full submission details
Review Submission	/admin/submissions/:id/review	Review panel for managers
UI Components to Build
Component	Description
SubmissionCard	Display a single submission in a list (title, status, batch, teacher, dates)
StatusBadge	Color-coded badge for each status (e.g., green for APPROVED, red for REJECTED)
LessonBuilder	Rich text editor + drag-and-drop for lessons
ExamBuilder	Question editor with options and correct answer selection
ContentPreview	Render the submission content (lessons + exam)
ActionButtons	Conditional buttons based on status and role
ReviewPanel	Status + feedback form for managers
FilterBar	Dropdown filters for batch, status, teacher
Pagination	Page controls for the list view
Color Scheme for Statuses
Status	Color	Hex
DRAFT	Gray	#6B7280
SUBMITTED	Blue	#3B82F6
UNDER_REVIEW	Yellow	#F59E0B
APPROVED	Green	#10B981
REJECTED	Red	#EF4444
IMPLEMENTATION_IN_PROGRESS	Purple	#8B5CF6
PUBLISHED	Emerald	#059669
🛠️ Backend Implementation Checklist
Files to Create
text
src/modules/course-submissions/
├── course-submissions.controller.ts  ← HTTP handlers
├── course-submissions.service.ts     ← Business logic + Prisma
├── course-submissions.routes.ts      ← Router + middleware
└── course-submissions.schema.ts      ← Zod validation
Implementation Order (Recommended)
Schema (course-submissions.schema.ts)

Define Zod schemas for all request bodies, params, and query strings

Service (course-submissions.service.ts)

Implement each database operation

Add validation logic (status guards, ownership checks)

CRITICAL: Use isEducationManager() helper for permission checks

Throw custom errors

Controller (course-submissions.controller.ts)

Wrap service methods with HTTP handlers

Use try/catch with next(error)

Routes (course-submissions.routes.ts)

Define all endpoints with middleware and validation

Apply requireAuth, requireRole, requireEducationManager

Registration (src/app.ts)

Import and use the routes

🔑 Critical Backend Logic (For Service Layer)
typescript
// Helper to check if user is an Education Manager
private isEducationManager(user: JwtPayload): boolean {
  return user.role === 'SERVICE_MANAGER' && user.serviceClassName === 'የትምህርት ክፍል';
}

// Helper to check ownership OR manager status
private canModify(user: JwtPayload, submissionTeacherId: string): boolean {
  return user.userID === submissionTeacherId || this.isEducationManager(user);
}

// Example: DELETE logic
async delete(user: JwtPayload, id: string) {
  const submission = await this.getSubmissionById(id);
  
  // If Education Manager -> always allowed
  if (this.isEducationManager(user)) {
    return db.course_submissions.delete({ where: { id } });
  }
  
  // Otherwise, must be the OWNER and status must be DRAFT or REJECTED
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
□ Education Manager has full Teacher privileges + Review/Publish
□ Secretariat/Class Leader/Members have NO special privileges
□ No SUPER_ADMIN role in the system
□ Proper data scoping: Teachers see only their own submissions
□ Status transition guards prevent invalid changes
□ All Prisma queries work correctly
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
Action	Endpoint	Teacher	Education Manager	Secretariat / Class Leader / Member
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
Education Manager	Could only review/publish	✅ Can do EVERYTHING (Teacher + Manager privileges)
Teacher	Could only create own submissions	✅ Teachers can still create, edit, submit, delete their own
Member/USER	Not mentioned	❌ No access to this feature
📞 Need Help?
Issue	Contact
API questions	Backend Lead
UI/UX questions	Frontend Lead
Database questions	Database Admin
Permissions questions	Product Manager
Timeline questions	Project Manager
Good luck, team! Let's build this together! 🎉