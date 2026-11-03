# Super Admin Platform — Project Document

**Status:** Planning document for a new, separate project
**Date:** 2 November 2026
**Source:** Everything the Smart School Management System (StudentManagement_LiveTracking) currently says or does about Super Admin, collected from:
- `Detailed_Project_Report.md` / `.docx`
- `Scope_of_Work.md` / `.docx`
- `README.md`
- `Smart_School_Management_System_Product_Document.pdf`
- The current code (backend routes/services, frontend pages, database migrations)

---

## 1. Why a separate project

Today, Super Admin lives inside the school project as a "Platform Console". The team has decided to move it out into its own project.

- **Super Admin project (this document):** runs the platform. It creates schools, accepts school requests, blocks/unblocks schools, and manages School Admin accounts.
- **School project (StudentManagement_LiveTracking):** runs one school. It keeps School Admin, Principal, Teacher, Student/Parent, Accountant, Driver, Extracurricular Staff and Support Staff. It will have no Super Admin role.
- **Link:** each school project connects to the Super Admin project. When a new school joins, it is linked to the same Super Admin project, so one Super Admin can manage many schools from one place.

---

## 2. Who the Super Admin is

The Super Admin is the platform operator, the top level above every school. They can do everything:

- Create, edit, view and delete schools.
- Activate or deactivate (block) a school. Blocking a school suspends access for all of its users.
- Create and manage School Admin accounts, including giving one admin more than one school.
- Review requests from School Admins to open a new school (approve or reject).
- See platform-wide statistics across all schools.
- See a full audit log of every platform-level action.
- Manage the Website Knowledge question bank and its settings.
- Watch Website Knowledge progress for the people they oversee (School Admins).

School Admin and Super Admin accounts **cannot self-register**. They are created only by an existing administrator.

---

## 3. Screens (Platform Console)

The current Platform Console menu:

| Menu group | Screen | Route today |
|---|---|---|
| Platform | Dashboard | `/dashboard/super-admin` |
| Platform | Notifications | `/dashboard/super-admin/notifications` |
| Platform | Schools | `/dashboard/super-admin/schools` |
| Platform | School overview (one school) | `/dashboard/super-admin/schools/:id` |
| Platform | School Requests | `/dashboard/super-admin/school-requests` |
| Platform | School Admins | `/dashboard/super-admin/school-admins` |
| Oversight | Audit Log | `/dashboard/super-admin/audit-log` |

After logging in, a Super Admin lands on the Dashboard.

Shared UI parts today: page header, platform stat cards, platform charts, the impact preview dialog, the School Admin form modal, and the reset-password modal.

---

## 4. Features

### 4.1 Dashboard (platform statistics)

Totals only, with no student-level rows:

- Schools: total, active, inactive
- School Admins: total and active
- Principals, Teachers, Students, Accountants, Drivers, Extracurricular Staff, Support Staff
- Parent contacts (distinct guardian phone numbers on student profiles; there is no separate parent account)

Charts:
- Schools by status (active vs inactive)
- Users by role
- Students per school
- School growth over time (by month)
- User growth over time (by month)

### 4.2 Schools

- List every school with details (active and inactive).
- Create a school.
- View a school's overview: profile plus counts of its students, staff and so on.
- Edit a school.
- Delete a school.
- **Activate / deactivate (block) one or many schools.**
  - Before blocking, an **impact preview** shows how many accounts and how much data will be affected.
  - Blocking **cascade-suspends** the school's users (`cascade_suspended` flag on the school and its users). Access stops immediately.
  - Data is kept. Student, teacher, attendance, fee, exam and transport history is preserved, and reactivating the school restores access.

### 4.3 School Requests

- A School Admin can ask for a new school to be set up (in the school project).
- The Super Admin sees all requests, opens one, and **approves** it (which actually creates the school) or **rejects** it.
- The person who asked is notified of the decision.

### 4.4 School Admins

- List School Admins, with filters.
- View one School Admin.
- Create a School Admin (full name, email, optional phone, and at least one assigned school).
- Edit a School Admin (name, phone).
- Reset a School Admin's password (strong password rules apply).
- **Multi-school assignment:** one School Admin can manage more than one school (`school_admin_schools` table). The Super Admin can replace the full list of assigned schools or remove a single school. In the school project, an admin with several schools gets a school switcher.
- **Deactivate / activate** a School Admin, with an impact preview first. Deactivation can cascade-suspend.

### 4.5 Audit Log

- A paginated record of every platform action (`platform_audit_logs` table), filterable by action type.
- Actions recorded today:
  - `school.created`, `school.updated`
  - `school_request.created`, `school_request.approved`, `school_request.rejected`
  - `school_admin.created`, `school_admin.updated`, `school_admin.activated`, `school_admin.deactivated`, `school_admin.password_reset`, `school_admin.schools_assigned`, `school_admin.school_removed`

### 4.6 Website Knowledge (certification) administration

- Question bank: create, edit and delete multiple-choice questions (4 options each).
- Question sets per role (student, teacher, principal, school admin, accountant, driver, extracurricular staff): create, edit and delete sets, and add or remove questions in a set.
- Platform settings for the assessment (pass mark, retakes, and so on).
- Monitoring: the Super Admin sees School Admins' completion status, plus global stats. The supervision chain is: class teacher → students, principal → teachers, school admin → principals, super admin → school admins.

### 4.7 Duties that touch school workflows

These run inside the school project today, and the Super Admin shares them with School Admin:

- **Principal registration review:** Principal sign-up requests go to School Admin or Super Admin.
- **Principal leave approval:** a Principal's leave is approved by School Admin or Super Admin, never by another Principal.
- **Notifications:** Super Admins are included in "notify the admins" messages (fee changes, payments recorded, and so on) and can send school-wide emergency alerts.
- **School Console access:** a Super Admin can currently open any school's Admin Console with full school permissions.

> **Decision needed:** once Super Admin moves out, these duties should go to School Admin only in the school project. The Super Admin project would just link to a school when deeper access is needed.

---

## 5. Permissions

Super Admin holds **every permission** in the system. Only Super Admin holds the platform-tier ones:

| Permission | What it allows |
|---|---|
| `platform.manage_schools` | Create, edit, delete, activate/deactivate schools; review school requests; platform stats |
| `platform.manage_school_admins` | Create, update, assign schools to, reset passwords of, and activate/deactivate School Admins |
| `platform.view_audit_log` | View the platform audit log |
| `assessment.manage_questions` | Manage the Website Knowledge question bank and sets |
| `assessment.manage_settings` | Manage Website Knowledge settings |

Related permission held by School Admin: `schools.request_creation` (lets a School Admin ask the Super Admin for a new school).

Every Super Admin API route is checked twice: by role (`super_admin`) and by the specific `platform.*` permission.

> Note: the Detailed Project Report's permission matrix says School Admin also has `platform.manage_schools`. That is out of date. Migration `066_super_admin_multi_school.sql` revoked it, so today only Super Admin has `platform.*` permissions.

---

## 6. API (current endpoints to carry over)

Base path today: `/api/v1`

**Platform** (`/super-admin`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/super-admin/dashboard` | Platform stats and charts |
| GET | `/super-admin/schools` | List schools with detail |
| POST | `/super-admin/schools` | Create a school |
| POST | `/super-admin/schools/impact` | Impact preview before blocking schools |
| POST | `/super-admin/schools/set-active` | Activate/deactivate schools |
| GET | `/super-admin/schools/:id` | School overview |
| PATCH | `/super-admin/schools/:id` | Update a school |
| DELETE | `/super-admin/schools/:id` | Delete a school |
| GET | `/super-admin/school-admins` | List School Admins |
| POST | `/super-admin/school-admins` | Create a School Admin |
| GET | `/super-admin/school-admins/:id` | View a School Admin |
| PATCH | `/super-admin/school-admins/:id` | Update a School Admin |
| POST | `/super-admin/school-admins/:id/reset-password` | Reset password |
| PUT | `/super-admin/school-admins/:id/schools` | Replace assigned schools |
| DELETE | `/super-admin/school-admins/:id/schools/:schoolId` | Remove one school assignment |
| GET | `/super-admin/school-admins/:id/impact` | Impact preview before deactivating |
| POST | `/super-admin/school-admins/:id/deactivate` | Deactivate |
| POST | `/super-admin/school-admins/:id/activate` | Activate |
| GET | `/super-admin/audit-log` | Audit log (paginated) |
| GET | `/super-admin/audit-log/actions` | Action types for the filter |

**School Requests** (`/school-requests`)

| Method | Path | Who |
|---|---|---|
| POST | `/school-requests` | School Admin submits a request |
| GET | `/school-requests/mine` | School Admin sees their own requests |
| GET | `/school-requests` | Super Admin lists all |
| GET | `/school-requests/:id` | Super Admin views one |
| POST | `/school-requests/:id/approve` | Super Admin approves (creates the school) |
| POST | `/school-requests/:id/reject` | Super Admin rejects |

**Other platform endpoints**

| Method | Path | Purpose |
|---|---|---|
| GET/POST | `/schools` | List/create schools (`platform.manage_schools`) |
| GET | `/schools/platform/stats` | Platform stats |
| GET | `/website-knowledge/monitoring/school-admins` | School Admins' certification progress |
| GET | `/website-knowledge/monitoring/global-stats` | Global certification stats |
| * | `/website-knowledge/admin/questions`, `/admin/question-sets`, `/admin/settings` | Question bank and settings |

---

## 7. Data

Tables the Super Admin project owns or needs:

| Table | Purpose |
|---|---|
| `schools` | Every school (tenant), with `is_active` and `cascade_suspended` |
| `school_admin_schools` | Which School Admin manages which schools (many-to-many) |
| `school_creation_requests` | New-school requests from School Admins |
| `platform_audit_logs` | Platform action history |
| `users`, `user_roles`, `roles`, `permissions`, `role_permissions` | School Admin accounts and the `super_admin` role (role id 7) |
| `website_knowledge_questions`, question sets, settings | Certification question bank |

Read-only counts are also taken from school data (`students`, `users` by role) for the dashboard.

Database security today: Row Level Security on nearly every table, using helper functions including `is_super_admin()`. The backend uses a service-role key and its own permission checks as the main security boundary.

---

## 8. Security requirements (carry over)

- Super Admin accounts are never self-registered. They are created by an existing administrator.
- Every platform route is gated by role plus specific permission.
- Every platform action is written to the audit log.
- An impact preview is shown before any school or admin is blocked.
- Blocking is a soft suspension (data kept), and access stops immediately.
- Login attempts are rate-limited and logged.

---

## 9. Linking to school projects

The separate project must replace what is shared inside one database today:

1. **School registry:** the Super Admin project is the master list of schools. Each school project knows its own school ID.
2. **Block/unblock:** when a school is blocked in the Super Admin project, the linked school project must refuse logins for that school's users.
3. **School Admin accounts:** created and assigned in the Super Admin project; the school project must recognise them, including admins with several schools.
4. **School requests:** the school project sends new-school requests to the Super Admin project and shows the result back to the School Admin.
5. **Statistics:** the Super Admin project reads counts (students, staff by role) from each linked school.
6. **Question bank:** the Super Admin project publishes questions and sets that each school project uses.

> **Decision needed:** how the projects talk to each other (a shared database, or an API between them), and whether login is shared. This decides how much of sections 6 and 7 is copied and how much is reached over the link.

---

## 10. What the school project will remove later

This is for reference only. The school project's documents and code are **not** changed by this document.

- `super_admin` role (id 7) and all `platform.*` permissions
- Platform Console pages (`frontend/src/pages/superAdmin/*`) and the `/super-admin` and `/school-requests` review routes
- Super Admin mentions in `Detailed_Project_Report`, `Scope_of_Work`, `README` and the Product Document
- Super Admin in shared rules: Principal registration review, Principal leave approval, admin notifications, and the `is_super_admin()` database helper
