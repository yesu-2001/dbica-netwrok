# Production Blank Slate & Mock Data Elimination

This plan details the transition of the DBICA Leave Management portal to a clean, production-ready blank slate. All sample staff accounts (David Anthony, Kavitha Raman, Maria Theresa), mock leave applications, and sample audit trails will be purged from live Firestore and codebase seeds, preserving only the authenticated Super Admin and official department structures.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were confirmed through interactive clarification and define the scope of this migration:

- **Confirmed Decision 1 (Staff Scope)**: Completely reset all sample staff accounts to a blank production slate. Only the authorized Super Admin account (`director@dbica.org` / `yesupadam2001@gmail.com`) is retained. All department heads, faculty, and HR can now be freshly invited or added through the portal's "Add Staff" management flow.
- **Confirmed Decision 2 (Live Database Purge)**: Immediate live deletion of all sample leave records (including David Anthony's upcoming leave) and sample audit logs in Cloud Firestore (`(default)` database on `dbica-network`).
- **Preserved Production Structure**: Official DBICA academic departments (Media Production, Design & Visual Arts, Audio Engineering, Administration, Animation & VFX, Journalism & Broadcasting) and institutional leave quotas (Casual: 12, Sick: 10, Compensatory: 15, Earned: 15) remain intact.

---

## 1. Overview & Core Concept

- **What It Does**: Transitions the DBICA Leave Management System from a pre-populated test environment to a clean, zero-mock production state. Real staff members and leave applications will originate solely from genuine user actions.
- **Target Audience / Persona**: Fr. Joseph Raj SDB (Super Admin), department heads, and faculty members using the live portal at Don Bosco Institute of Communication Arts.
- **Key Value**: Eliminates confusion caused by synthetic test records, prevents accidental approvals of test data, and ensures institutional records reflect 100% genuine academic operations.

---

## 2. User Experience & Visual Design

- **Upcoming Leaves Widget (Zero-State)**:
  - Replaces synthetic entries with an elegant institutional status banner: *"No upcoming leaves scheduled. Academic operations are in full session."*
  - Subdued slate styling with an emerald operational indicator pulse.
- **Staff Directory (Zero-State / Super Admin View)**:
  - Displays the single active Super Admin profile with badge "Rector & Director".
  - Clear, prominent "Add Faculty / Staff Member" button triggering the modal with role assignment (Faculty, HoD/Manager, HR).
- **Leave Requests Queue (Zero-State)**:
  - Tab views ("Pending", "Approved", "All") render clean empty states with an illustration icon, clear status text, and quick action for faculty to "Submit Leave Request".
- **Audit Trail & Activity Log**:
  - Fresh starting entry: *"SYSTEM_INITIALIZATION: Production portal launched with clean ledger."*

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Direct Firestore Live Document Purge**:
  - *Chosen Approach*: Execute an automated Firestore clean-up routine on initial load for the Super Admin that queries and batch-deletes all synthetic document IDs (`req-001`, `req-002`, `audit-001`, `dbica-002`, `dbica-003`, `dbica-004`).
  - *Why*: Modifying `seedData.ts` alone only impacts new databases. Existing documents already written to the user's `(default)` Firestore database must be explicitly deleted so the live UI immediately updates.
  - *Alternatives Considered*: Manual deletion in Firebase Console (error-prone and requires user effort).
- **Decision 2: Retention of Official Academic Departments & Leave Quotas**:
  - *Chosen Approach*: Retain the 6 configured academic departments and institutional threshold rules.
  - *Why*: Departments represent DBICA's actual institutional structure; recreating them manually on launch would be redundant administrative overhead.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                   Cloud Firestore                      │
│                  (dbica-network)                       │
├─────────────────┬──────────────────────┬───────────────┤
│   Collection    │  Sample State (Old)  │ Clean (New)   │
├─────────────────┼──────────────────────┼───────────────┤
│ staff           │ 4 members (demo)     │ Super Admin   │
│ leaveRequests   │ 2 records (David A.) │ [] Empty (0)  │
│ auditLogs       │ 1 mock record        │ Clean ledger  │
│ departments     │ 6 academic depts     │ Preserved (6) │
│ settings        │ Global thresholds    │ Preserved     │
└─────────────────┴──────────────────────┴───────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│               AppContext & FirestoreService            │
│  - seedIfEmpty(): Seeds only Super Admin & Departments │
│  - purgeMockData(): Cleanses legacy sample records     │
│  - Real-time Listeners: Stream live empty collections  │
└────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│                  Frontend UI Views                     │
│  - Dashboard: "No Upcoming Leaves" zero-state card     │
│  - StaffView: Single Super Admin + "Add Staff" CTA     │
│  - LeaveRequestsView: Empty queues ready for live apps │
└────────────────────────────────────────────────────────┘
```

### Data Model Clean State

- `INITIAL_STAFF_MEMBERS`: Single entry for `dbica-001` (Fr. Joseph Raj SDB / `director@dbica.org` / Super Admin).
- `INITIAL_LEAVE_REQUESTS`: `[]` (0 records).
- `INITIAL_AUDIT_LOGS`: `[]` (0 records).
- `INITIAL_NOTIFICATIONS`: `[]` (0 records).
- `FirestoreService.purgeMockArtifacts()`: One-time automated routine that removes any legacy sample records present in Firestore.
