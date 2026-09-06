# SaGo Project Plan 🏠
*Staff management app for SaGo — "For unlocking your Dream House"*

## Requirements (from handwritten notes, 05-Sep-2026)
1. Login page with Google Sign-In
2. Three role sections: **Admin** (1st), **Manager** (2nd), **Employee** (3rd)
3. Admin can add/delete people
4. Attendance twice a day: **Morning + Afternoon**
5. Department-wise admins — each admin manages their own department; admins mark attendance & assign tasks
6. Employee/Manager can **reply by text** to assigned tasks + **send proof** (photo)
7. Admin can assign/promote Managers and Employees
8. Manager can assign tasks to Employees
9. **Full history log** — every change in the person's own history + separate Admin history section
10. WhatsApp group connection via redirect

## ✅ Decisions locked
| # | Topic | Decision |
|---|-------|----------|
| 1 | WhatsApp | **Redirect only** (free `wa.me` links). No paid Business API. Phone icon → opens personal chat; Group button → opens WhatsApp group; proof shared manually by user |
| 2 | Design | **Professional look, theme matches logo** → primary green #00A878 + white, mobile-first, REAL SaGo logo used (no AI images) |
| 3 | Architecture | Proper **Frontend + Backend + Database** (not a toy demo) |
| 4 | Build trigger | ⛔ Do NOT start coding until backend is decided and user says **START** |
| 5 | Departments | ✅ **Construction** + **SaGo Showroom** — both Admins have access to **BOTH** departments |
| 6 | Hierarchy | ✅ **Super Admin: SAGO** (top) → Admin → Manager → Employee |
| 7 | WhatsApp | ✅ One **company-wide** group |
| 8 | Backend | ✅ **Supabase** (user choice — "easy for me") — keys pending, app ships with demo adapter until keys are pasted |
| 9 | Architecture | Static SPA (no build step) → `app/js/db/adapter.js` facade; **demo (localStorage) ↔ Supabase** adapters; zero rework when going live |

## 👥 Team (real data) ✅ confirmed
**Super Admin:**
| Name | Access | Phone | Gmail |
|------|--------|-------|-------|
| **SAGO** (company main account) | Everything — top of hierarchy | — | ⏳ later |

**Admins:**
| Name | Department | Phone (WhatsApp icon) | Gmail (for login) |
|------|-----------|----------------------|-------------------|
| Er. G. Sakthimohan | **Both departments (full access)** | 87788 66080 | ⏳ later |
| Er. T. Gokulnath | **Both departments (full access)** | 88077 10937 | ⏳ later |

**Managers:**
| Name | Department | Phone | Gmail |
|------|-----------|-------|-------|
| Gowsikan K | Construction *(default, confirm/change anytime)* | 93457 21307 | ⏳ later |

**Employees:**
| Name | Department | Phone | Gmail |
|------|-----------|-------|-------|
| Sanjay K | Construction *(default, confirm/change anytime)* | 75503 21307 | ⏳ later |

## ❓ Status of all questions
- [x] App type → **Mobile web app (PWA)** — recommended, no objection
- [x] WhatsApp → redirect only, **one company group**
- [x] Departments → **Construction** + **SaGo Showroom**; both Admins access both
- [x] Hierarchy → **Super Admin (SAGO)** > Admin > Manager > Employee
- [x] Backend → **Supabase** ✅ (user decision)
- [x] Defaults assumed *(accepted — change anytime in-app)*:
  - Gowsikan & Sanjay → **Construction** department
  - Task **"Verified ✅"** can be pressed by **Admin + Manager**
  - Attendance marked by **Admin only** (Morning ☀️ / Afternoon 🌤️)

## 📊 PROGRESS vs original 10 notes (excluding Supabase assembly + hosting) — 05-Sep
| Note | Requirement | Status | Done |
|------|-------------|--------|------|
| 1 | Login page + Google Sign-In | Page ✅ · Google waits for Supabase keys | 80% |
| 2 | Admin + Manager sections | ✅ Built & working | 100% |
| 3 | Employee section | ✅ Built & working | 100% |
| 4 | Add/delete people + Attendance (Morning/Afternoon) | ✅ Built & tested | 100% |
| 5 | Admin department access | ✅ Both admins → both departments (as decided) | 100% |
| 6 | Text replies + WhatsApp number icon + send proof | ✅ All working (photos compressed on-device in demo) | 95% |
| 7 | Admin power to assign Manager + Employee | ✅ Built & tested | 100% |
| 8 | Manager can assign Employee | ✅ Built & tested (employees can't assign ✋) | 100% |
| 9 | History: person's own + separate Admin history | ✅ Every action logged | 100% |
| 10 | WhatsApp group redirect | ✅ Works — just paste real group link in Settings | 90% |
| | **TOTAL** | | **≈ 96.5%** |


1. ✅ Confirm tech choices — **done 05-Sep**
2. ✅ **Skeleton v0.1 built 05-Sep** — login, 4 role dashboards (SAGO/Admin/Manager/Employee), people directory + WhatsApp icons, add/remove people, Morning/Afternoon attendance, task replies (text), history log, settings (group link)
3. ⏳ Supabase setup (user pastes keys → I run schema + wire data layer + cloud photo storage)
4. ✅ **Task module v0.2 built 05-Sep** — assign tasks (Admin → Manager/Employee, Manager → Employee), optional due dates (Due today / Overdue badges), Open/All/Verified filters, **Verified ✅ flow** (Admin+Manager), text + **📷 photo proof replies** (compressed, on-device in demo). Full flow unit-tested ✅
4b. ✅ **Cleanup v0.3 built 05-Sep** — demo users (Priya/Arun) removed, quick-access chips removed, ALL "demo mode / next step / activates with..." wording removed; production-clean UI; real 5 users only; local data sealed under new key (old demo data auto-discarded); retested ✅
4c. ✅ **Assign-Task Control Pack v0.4 built 05-Sep** — 🚩 priority (urgent pinned on top), ✏️ edit task (assigner/Admin only), 🗑️ delete task (assigner/Admin only), 🔁 reopen verified task (Admin/Manager), 🔒 verified tasks locked until reopened, 🏗️ department filter chips (Admin view), unified assign/edit sheet; **bug found & fixed: same-millisecond ID collision**; full permission tests passed ✅
4d. ✅ **Enhance-All v0.5 built 05-Sep** — logo upscaled to HD 1024px (crisp, 171 KB) + all icons regen (32/180/192/512), branded **splash loading screen** (floating logo + pulse ring + loading bar), 9 keyframe animations: staggered page entrances, sheet slide-up, tab icon pop, button press feedback, hover lifts, login glow floaters, login card pop, WhatsApp button pop; `prefers-reduced-motion` respected; no-cache server installed (refresh always shows latest) ✅
5. ⏳ Proof photos to cloud (Supabase Storage — comes with step 3)
6. ⏳ Google Sign-In wiring
7. ⏳ Deploy live (PWA install on phones)

---
*Workspace note: keep total files small (source code only, few MB). Limit ~126 MB.*
