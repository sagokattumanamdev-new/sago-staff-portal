# SaGo Staff Portal

Modern Construction & Showroom Staff Management, Task Tracking, Attendance, and Reporting Platform.

---

## 🚀 Features

- **Staff Attendance Tracking**: Real-time morning & afternoon attendance logging with history.
- **Task Assignment & Proof Pipeline**: Assign tasks, receive photo proofs/updates from staff, and verify completion.
- **Reports & PDF Generator**: Instant generation and printing of Master Reports, Attendance Sheets, Task Progress, and CSV exports.
- **Role-Based Access Control**:
  - **Super Admin**: Full administrative control, roster management, settings.
  - **Admin**: Staff management, task assignment, verification, attendance, reports.
  - **Staff**: Task execution, photo proof submissions, attendance view, WhatsApp group access.
- **Cloud & Offline Dual-Sync**: Supabase cloud backend with resilient offline fallback.

---

## 🔑 Default Accounts

| Name | Role | Email / Login ID | Password | Google Login |
| :--- | :--- | :--- | :--- | :--- |
| **SAGO** | Super Admin | `sago@sago.com` | `pavisathya` | — |
| **Er. G. Sakthimohan** | Admin | `sakthimohan@sago.com` | `sakthimohan` | `sgsakthimohan@gmail.com` |
| **Er. T. Gokulnath** | Admin | `gokulnath@sago.com` | `gokulnath` | `gokulnath2gn@gmail.com` |
| **Ragul** | Staff | `ragul@sagostaff` | `ragulsago` | — |
| **Jeeva** | Staff | `jeeva@sagostaff` | `jeevasago` | — |

---

## 🌐 Vercel Deployment

This project is configured for 1-click deployment on [Vercel](https://vercel.com).
The `vercel.json` file points the output directory directly to `/app`.

1. Import this repository into Vercel.
2. Framework Preset: **Other** / **Static Site**.
3. Output Directory: `app` (automatically read from `vercel.json`).
4. Click **Deploy**.
