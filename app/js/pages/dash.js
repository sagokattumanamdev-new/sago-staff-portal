// ============================================================
// DASHBOARD — one shell, role-driven tabs:
//   Super Admin (SAGO) / Admin / Manager / Employee
// ============================================================
import { DB } from '../db/adapter.js?v=050';
import { CONFIG } from '../config.js?v=050';
import { openExportModal, generatePDFReport, exportCSVReport } from '../reports.js?v=050';
import {
  esc, icon, avatarHTML, initials, roleBadge, statusPill, prioPill,
  toast, openSheet, waLink, todayKey, fmtDateKey, timeAgo,
  greeting, firstName, roleLabel, dueMeta, fileToDataURL
} from '../ui.js?v=050';

const TAB_ICON = {
  overview: 'home', people: 'people', team: 'people',
  attendance: 'sun', tasks: 'task', history: 'history',
  settings: 'settings', group: 'wa', reports: 'pdf'
};
const TABS = {
  superadmin: [['overview', 'Home'], ['people', 'People'], ['attendance', 'Attendance'], ['reports', 'Reports'], ['history', 'History'], ['settings', 'Settings']],
  admin:      [['overview', 'Home'], ['people', 'People'], ['attendance', 'Attendance'], ['tasks', 'Tasks'], ['reports', 'Reports'], ['history', 'History']],
  manager:    [['overview', 'Home'], ['tasks', 'Tasks'], ['team', 'Team'], ['history', 'History']],
  employee:   [['tasks', 'My Tasks'], ['attendance', 'Attendance'], ['history', 'History'], ['group', 'WhatsApp']],
};
const canManage = u => ['superadmin', 'admin'].includes(u.role);

export async function renderDashboard(root, user, tab) {
  const tabs = TABS[user.role] || TABS.employee;
  tab = tab || tabs[0][0];

  root.innerHTML = `
    <header class="hdr"><div class="hdr-inner">
      <img class="hdr-logo" src="./assets/logo-hd.png" alt="SaGo" />
      <div><div class="hdr-name">${esc(CONFIG.company)} Staff</div>
      <div class="hdr-sub">${esc(CONFIG.tagline)}</div></div>
      <div class="hdr-right">
        <div class="hdr-user"><div class="n">${esc(user.name)}</div>
        <div class="r">${esc(roleLabel(user.role))}${user.dept && user.dept !== '—' ? ' · ' + esc(user.dept) : ''}</div></div>
        ${avatarHTML(user.name, 34)}
        <button class="icon-btn" id="logoutBtn" title="Sign out">${icon('logout')}</button>
      </div>
    </div></header>
    <main class="page center-col" id="page"></main>
    <nav class="tabbar"><div class="tabbar-inner">
      ${tabs.map(([id, label]) => `
        <button class="tab ${id === tab ? 'active' : ''}" data-tab="${id}">
          ${icon(TAB_ICON[id])}<span>${label}</span>
        </button>`).join('')}
    </div></nav>`;

  root.querySelector('#logoutBtn').addEventListener('click', async () => {
    await DB.signOut(); location.hash = '#/login';
  });
  root.querySelectorAll('.tab').forEach(b =>
    b.addEventListener('click', () => renderDashboard(root, user, b.dataset.tab)));

  await renderTab(root.querySelector('#page'), root, user, tab);
}

async function renderTab(page, root, user, tab) {
  const R = {
    overview: tabOverview, people: tabPeople, team: tabTeam,
    attendance: tabAttendance, tasks: tabTasks, reports: tabReports, history: tabHistory,
    settings: tabSettings, group: tabGroup
  }[tab] || tabOverview;
  await R(page, root, user);
}

const greetHTML = user => `
  <div class="greet">
    <h2>${greeting()}, ${esc(firstName(user.name))}! 👋</h2>
    <p>${esc(fmtDateKey(todayKey()))} · ${esc(roleLabel(user.role))}${user.dept && user.dept !== '—' ? ' · ' + esc(user.dept) : ''}</p>
  </div>`;

const statHTML = (n, l) => `<div class="stat"><div class="n">${n}</div><div class="l">${l}</div></div>`;

async function openGroupWA() {
  const s = await DB.settings();
  if (s?.whatsappGroup) window.open(s.whatsappGroup, '_blank');
  else toast('Group link not added yet — Admin can add it in Settings.');
}

/* =============== OVERVIEW =============== */
async function tabOverview(page, root, user) {
  const [people, staff, att, tasks] = await Promise.all([
    DB.listPeople(), DB.listStaff(), DB.attendanceFor(todayKey()), DB.listTasks(user)
  ]);
  const mP = staff.filter(s => att[s.id]?.morning === 'present').length;
  const aP = staff.filter(s => att[s.id]?.afternoon === 'present').length;
  const open = tasks.filter(t => t.status !== 'done').length;
  const active = tasks.filter(t => t.status === 'in-progress').length;

  const QA = {
    superadmin: [['Mark today\'s attendance', 'sun', 'attendance'], ['Add a person', 'plus', '__add'], ['Export Data / PDF', 'pdf', '__export'], ['Assign task', 'task', '__assign'], ['Open WhatsApp group', 'wa', '__wa']],
    admin:      [['Mark today\'s attendance', 'sun', 'attendance'], ['Add a person', 'plus', '__add'], ['Export Data / PDF', 'pdf', '__export'], ['Assign task', 'task', '__assign'], ['Open WhatsApp group', 'wa', '__wa']],
    manager:    [['My tasks', 'task', 'tasks'], ['My team', 'people', 'team'], ['Open WhatsApp group', 'wa', '__wa'], ['Assign task', 'task', '__assign']],
    employee:   [['Reply / send proof', 'send', 'tasks'], ['My attendance', 'sun', 'attendance'], ['Open WhatsApp group', 'wa', '__wa'], ['WhatsApp contacts', 'people', 'group']],
  }[user.role] || [];

  page.innerHTML = `
    ${greetHTML(user)}
    <div class="stats">
      ${statHTML(people.length, 'Team members')}
      ${statHTML(`${mP}/${staff.length}`, 'Present · Morning ☀')}
      ${statHTML(open, 'Open tasks')}
      ${statHTML(active, 'Tasks with replies')}
    </div>
    <div class="section-title">Quick actions</div>
    <div class="qa-grid">
      ${QA.map(([label, ic, act]) => `
        <button class="qa-btn" data-act="${act}">${icon(ic)}<span>${label}</span></button>`).join('')}
    </div>`;

  page.querySelectorAll('.qa-btn').forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.act;
    if (a === '__wa') return openGroupWA();
    if (a === '__add') return openAddSheet(root, user);
    if (a === '__assign') return goAssign(root, user);
    if (a === '__export') return openExportModal(root, user);
    renderDashboard(root, user, a);
  }));
}

/* =============== PEOPLE (manage: superadmin/admin) =============== */
const personRow = (p, user, manage) => `
  <div class="row">
    ${avatarHTML(p.name, 38)}
    <div class="grow">
      <div class="ellipsis"><b>${esc(p.name)}</b> ${roleBadge(p.role)}</div>
      <div class="muted small">${esc(p.dept)}${p.phone ? ` · +91 ${esc(p.phone)}` : ''}</div>
    </div>
    ${p.phone ? `<a class="wa-btn" href="${waLink(p.phone)}" target="_blank" rel="noopener" title="WhatsApp ${esc(p.name)}">${icon('wa')}</a>` : ''}
    ${manage && p.id !== user.id ? `<button class="icon-btn" data-del="${p.id}" style="color:var(--red)" title="Remove">${icon('trash')}</button>` : ''}
  </div>`;

async function tabPeople(page, root, user) {
  const manage = canManage(user);
  const people = await DB.listPeople();
  const grp = r => people.filter(p => p.role === r);

  page.innerHTML = `
    <div class="greet"><h2>Team & Staff</h2><p>${people.length} members${manage ? ' · tap the green icon to open WhatsApp' : ''}</p></div>
    ${manage ? `<button class="btn btn-primary btn-sm" id="addBtn" style="width:auto">${icon('plus')} Add staff member</button>` : ''}
    ${[['admin', 'Admins'], ['manager', 'Managers'], ['employee', 'Staff Members']].map(([r, title]) => `
      <div class="section-title">${title} (${grp(r).length})</div>
      <div class="card">
        ${grp(r).length ? grp(r).map(p => personRow(p, user, manage)).join('') : `<div class="empty">No ${title.toLowerCase()} yet.</div>`}
      </div>`).join('')}`;

  page.querySelector('#addBtn')?.addEventListener('click', () => openAddSheet(root, user));
  page.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
    const p = people.find(x => x.id === b.dataset.del);
    const sh = openSheet(`
      <h3>Remove ${esc(p.name)}?</h3>
      <p class="muted small">They will lose access immediately. This is written to History.</p>
      <div class="sheet-actions">
        <button class="btn-ghost" id="cn">Cancel</button>
        <button class="btn-danger" id="ok">${icon('trash')} Remove</button>
      </div>`);
    sh.el.querySelector('#cn').onclick = sh.close;
    sh.el.querySelector('#ok').onclick = async () => {
      const r = await DB.deletePerson(p.id, user);
      sh.close();
      if (r.error) return toast(r.error);
      toast(`${p.name} removed`);
      renderDashboard(root, user, 'people');
    };
  }));
}

function openAddSheet(root, user) {
  const sh = openSheet(`
    <h3>Add staff member</h3>
    <p class="muted small">Create login ID and password for the new member</p>
    
    <div class="field"><label>FULL NAME</label>
      <input class="inp" id="f-name" placeholder="e.g. Ragul" required /></div>
      
    <div class="field"><label>ROLE</label>
      <select class="inp" id="f-role">
        <option value="employee" selected>Staff Member</option>
        <option value="manager">Manager</option>
        <option value="admin">Admin</option>
      </select></div>
      
    <div class="field"><label>DEPARTMENT</label>
      <select class="inp" id="f-dept">${CONFIG.departments.map(d => `<option>${esc(d)}</option>`).join('')}</select></div>
      
    <div class="field"><label>PHONE (WhatsApp)</label>
      <input class="inp" id="f-phone" inputmode="numeric" placeholder="10-digit mobile number" /></div>

    <div class="field"><label>LOGIN EMAIL / USERNAME</label>
      <input class="inp" id="f-email" placeholder="e.g. ragul@sagostaff" /></div>

    <div class="field"><label>LOGIN PASSWORD</label>
      <input class="inp" id="f-pass" placeholder="e.g. ragulsago" value="sago123" /></div>

    <div class="sheet-actions" style="margin-top:16px">
      <button class="btn-ghost" id="cn">Cancel</button>
      <button class="btn-primary" id="ok" style="flex:1">${icon('plus')} Create & Save</button>
    </div>`);

  const nameInp = sh.el.querySelector('#f-name');
  const emailInp = sh.el.querySelector('#f-email');
  const passInp = sh.el.querySelector('#f-pass');

  nameInp.addEventListener('input', () => {
    const raw = nameInp.value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
    if (raw) {
      emailInp.value = `${raw}@sagostaff`;
      passInp.value = `${raw}sago`;
    }
  });

  sh.el.querySelector('#cn').onclick = sh.close;
  sh.el.querySelector('#ok').onclick = async () => {
    const nameVal = nameInp.value.trim();
    if (!nameVal) return toast('Please enter a name.');

    const roleVal = sh.el.querySelector('#f-role').value;
    const deptVal = sh.el.querySelector('#f-dept').value;
    const phoneVal = sh.el.querySelector('#f-phone').value.trim();
    const emailVal = emailInp.value.trim() || `${nameVal.toLowerCase().replace(/[^a-z0-9]+/g, '')}@sagostaff`;
    const passVal = passInp.value.trim() || 'sago123';

    const r = await DB.addPerson({
      name: nameVal,
      role: roleVal,
      dept: deptVal,
      phone: phoneVal,
      email: emailVal,
      pass: passVal
    }, user);

    if (r.error) return toast(r.error);
    sh.close();

    // Show credential summary modal
    showCredentialsSheet(root, user, {
      name: nameVal,
      role: roleVal === 'employee' ? 'Staff' : roleVal === 'manager' ? 'Manager' : 'Admin',
      email: emailVal,
      pass: passVal,
      phone: phoneVal
    });
  };
}

function showCredentialsSheet(root, user, creds) {
  const credMsg = `SaGo Staff Portal Login Details:\nName: ${creds.name}\nRole: ${creds.role}\nEmail: ${creds.email}\nPassword: ${creds.pass}\nURL: http://localhost:8420`;

  const credSheet = openSheet(`
    <div style="text-align:center">
      <div style="font-size:36px;margin-bottom:6px">🎉</div>
      <h3 style="margin:0 0 4px">Staff Added Successfully!</h3>
      <p class="muted small" style="margin-top:0">Share these login credentials with the member</p>
    </div>

    <div class="card" style="background:#F3F7F5;border:1.5px solid var(--green);margin:14px 0">
      <div class="row" style="padding:6px 0"><span class="muted small">Name:</span> <b>${esc(creds.name)}</b></div>
      <div class="row" style="padding:6px 0"><span class="muted small">Role:</span> <span class="role-badge" style="background:var(--green-50);color:var(--green-deep)">${esc(creds.role.toUpperCase())}</span></div>
      <div class="row" style="padding:6px 0"><span class="muted small">Login Email:</span> <code style="background:#fff;padding:2px 6px;border-radius:6px;font-weight:700">${esc(creds.email)}</code></div>
      <div class="row" style="padding:6px 0"><span class="muted small">Password:</span> <code style="background:#fff;padding:2px 6px;border-radius:6px;font-weight:700;color:var(--green-deep)">${esc(creds.pass)}</code></div>
    </div>

    <div class="sheet-actions" style="display:flex;flex-direction:column;gap:8px">
      <button class="btn btn-primary" id="copyCredBtn">📋 Copy Login Info</button>
      ${creds.phone ? `<a class="btn" id="waCredBtn" href="${waLink(creds.phone)}&text=${encodeURIComponent(credMsg)}" target="_blank" rel="noopener" style="background:var(--wa);color:#fff">💬 Send on WhatsApp</a>` : ''}
      <button class="btn-ghost" id="doneCredBtn">Done</button>
    </div>
  `);

  credSheet.el.querySelector('#copyCredBtn').onclick = () => {
    navigator.clipboard.writeText(credMsg);
    toast('Credentials copied to clipboard! 📋');
  };

  const doneBtn = credSheet.el.querySelector('#doneCredBtn');
  if (doneBtn) doneBtn.onclick = () => {
    credSheet.close();
    renderDashboard(root, user, 'people');
  };
}

/* =============== TEAM (manager view: people + today attendance) =============== */
async function tabTeam(page, root, user) {
  const [people, att] = await Promise.all([DB.listPeople(), DB.attendanceFor(todayKey())]);
  page.innerHTML = `
    <div class="greet"><h2>Team</h2><p>Today's attendance · tap the green icon for WhatsApp</p></div>
    <div class="card">
      ${people.map(p => {
        const a = att[p.id] || {};
        return `<div class="row">
          ${avatarHTML(p.name, 38)}
          <div class="grow">
            <div class="ellipsis"><b>${esc(p.name)}</b> ${roleBadge(p.role)}</div>
            <div class="muted small">${esc(p.dept)}</div>
          </div>
          <span class="mini-chip ${a.morning === 'present' ? 'on' : ''}" title="Morning">☀ ${a.morning === 'present' ? 'P' : a.morning === 'absent' ? 'A' : '—'}</span>
          <span class="mini-chip ${a.afternoon === 'present' ? 'on' : ''}" title="Afternoon">⛅ ${a.afternoon === 'present' ? 'P' : a.afternoon === 'absent' ? 'A' : '—'}</span>
          ${p.phone ? `<a class="wa-btn" href="${waLink(p.phone)}" target="_blank" rel="noopener">${icon('wa')}</a>` : ''}
        </div>`;
      }).join('')}
    </div>
    <div class="notice">Attendance is marked by Admins. Assign tasks from <b>Home → Assign task</b>.</div>`;
}

/* =============== ATTENDANCE =============== */
async function tabAttendance(page, root, user) {
  if (canManage(user)) return tabAttendanceAdmin(page, root, user);
  return tabAttendanceSelf(page, user);
}

async function tabAttendanceAdmin(page, root, user) {
  const today = todayKey();
  const [staff, att] = await Promise.all([DB.listStaff(), DB.attendanceFor(today)]);
  const count = ses => staff.filter(s => att[s.id]?.[ses] === 'present').length;
  const mark = (p, ses) => (att[p.id]?.[ses]) || null;
  const chip = (p, ses, label, sym) => {
    const v = mark(p, ses);
    const cls = v === 'present' ? 'on' : v === 'absent' ? 'abs' : '';
    const txt = v === 'present' ? '✓' : v === 'absent' ? '✕' : sym;
    return `<button class="session-chip ${cls}" data-u="${p.id}" data-ses="${ses}" data-v="${v || ''}">${txt} ${label}</button>`;
  };

  page.innerHTML = `
    <div class="greet"><h2>Attendance</h2>
      <p>${esc(fmtDateKey(today))} · tap a chip: — none, ✓ present, ✕ absent</p></div>
    <div class="stats">
      ${statHTML(`${count('morning')}/${staff.length}`, 'Present · Morning ☀')}
      ${statHTML(`${count('afternoon')}/${staff.length}`, 'Present · Afternoon ⛅')}
    </div>
    <div class="section-title">Staff</div>
    <div class="card">
      ${staff.length ? staff.map(p => `
        <div class="row">
          ${avatarHTML(p.name, 36)}
          <div class="grow"><div class="ellipsis"><b>${esc(p.name)}</b></div>
            <div class="muted small">${esc(p.dept)}</div></div>
          ${chip(p, 'morning', 'Morning', '☀')}
          ${chip(p, 'afternoon', 'Aft.', '⛅')}
        </div>`).join('') : '<div class="empty">No staff yet.</div>'}
    </div>
    <div class="notice">Every change is saved to History (yours + the person's own history).</div>`;

  page.querySelectorAll('.session-chip').forEach(b => b.addEventListener('click', async () => {
    const cur = b.dataset.v || null;
    const next = cur === null ? 'present' : cur === 'present' ? 'absent' : null; // cycle
    await DB.markAttendance(b.dataset.u, today, b.dataset.ses, next, user);
    renderDashboard(root, user, 'attendance');
  }));
}

async function tabAttendanceSelf(page, user) {
  const rows = await DB.attendanceHistory(user.id, 7);
  const cell = v => v === 'present' ? '<span class="mark-y">✓</span>'
    : v === 'absent' ? '<span class="mark-n">✕</span>' : '<span class="mark-x">—</span>';
  page.innerHTML = `
    <div class="greet"><h2>My attendance</h2><p>marked by Admin · last 7 days</p></div>
    <div class="card">
      <table class="htable">
        <tr><th>Date</th><th>☀ Morning</th><th>⛅ Afternoon</th></tr>
        ${rows.map(r => `<tr><td>${esc(fmtDateKey(r.date))}</td><td>${cell(r.morning)}</td><td>${cell(r.afternoon)}</td></tr>`).join('')}
      </table>
    </div>
    <div class="notice">Wrong entry? Tap the WhatsApp icon next to your Admin on the <b>WhatsApp</b> tab and inform them.</div>`;
}

/* =============== TASKS =============== */
let taskFilter = 'open'; // 'open' | 'all' | 'done'
let deptFilter = 'all';  // 'all' | department name (admin/superadmin only)
const canAssign = u => ['superadmin', 'admin', 'manager'].includes(u.role);
const canVerifyRole = u => ['superadmin', 'admin', 'manager'].includes(u.role);

function taskCard(t, user, name) {
  const due = dueMeta(t.due, t.status);
  const isDone = t.status === 'done';
  const manageTask = canManage(user) || t.assignedBy === user.id; // admin/superadmin or the assigner
  return `
  <div class="card" data-task="${t.id}">
    <div style="display:flex;gap:8px;align-items:flex-start">
      <div class="grow"><b>${esc(t.title)}</b>
        <div class="muted small" style="margin-top:3px">
          ${esc(t.dept)} · ${esc(name(t.assignedBy))} → ${esc(name(t.assignedTo))} · ${timeAgo(t.createdAt)}
          ${due ? ` · <span class="due ${due.cls}">${due.text}</span>` : ''}
        </div>
      </div>
      <div class="pill-stack">${statusPill(t.status)}${prioPill(t.priority)}</div>
    </div>
    ${t.replies.map(r => `
      <div class="rep">${avatarHTML(r.name, 26)}
        <div class="rep-body">
          <div class="rep-meta"><b>${esc(r.name)}</b> · ${timeAgo(r.at)}</div>
          ${esc(r.text || '')}
          ${r.photo ? `<img class="rep-photo" src="${r.photo}" data-view alt="proof photo" />` : ''}
        </div>
      </div>`).join('')}
    ${isDone
      ? `<div class="verified-line">${icon('badgecheck')} Verified by ${esc(name(t.verifiedBy))} · ${timeAgo(t.verifiedAt)}</div>
         ${canVerifyRole(user) ? `<div class="mini-actions"><button class="mbtn" data-reopen>${icon('reopen')} Reopen</button></div>` : ''}`
      : `
        <div class="reply-box">
          <textarea rows="1" placeholder="Reply by text…"></textarea>
          <input type="file" accept="image/*" class="photo-input" hidden />
          <button class="cam-btn" data-cam title="Attach proof photo">${icon('camera')}</button>
          <button class="send-btn" data-send title="Send">${icon('send')}</button>
        </div>
        <div class="photo-slot"></div>
        ${canVerifyRole(user) ? `<button class="btn-ghost btn-sm" data-verify style="width:100%;margin-top:8px">${icon('badgecheck')} Verify task ✅</button>` : ''}
        ${manageTask ? `<div class="mini-actions">
          <button class="mbtn" data-edit>${icon('pencil')} Edit</button>
          <button class="mbtn danger" data-del>${icon('trash')} Delete</button>
        </div>` : ''}`}
  </div>`;
}

async function tabTasks(page, root, user) {
  const [tasksAll, folksArr, targets] = await Promise.all([
    DB.listTasks(user), DB.allPeople(), DB.assignTargets(user)
  ]);
  const name = id => (folksArr.find(f => f.id === id)?.name) || '—';
  const vis = (deptFilter === 'all' || !canManage(user)) ? tasksAll : tasksAll.filter(t => t.dept === deptFilter);
  const open = vis.filter(t => t.status !== 'done');
  const done = vis.filter(t => t.status === 'done');
  const tasks = taskFilter === 'done' ? done : taskFilter === 'all' ? vis : open;

  page.innerHTML = `
    <div class="greet" style="display:flex;align-items:flex-start;gap:10px">
      <div class="grow"><h2>${user.role === 'employee' ? 'My tasks' : 'Tasks'}</h2>
      <p>${open.length} open · ${done.length} verified ✅</p></div>
      ${canAssign(user) ? `<button class="btn btn-primary btn-sm" id="assignBtn" style="width:auto">${icon('plus')} Assign</button>` : ''}
    </div>
    <div class="filter-chips">
      ${[['open', `Open (${open.length})`], ['all', 'All'], ['done', `Verified (${done.length})`]].map(([f, l]) =>
        `<button class="fchip ${taskFilter === f ? 'active' : ''}" data-f="${f}">${l}</button>`).join('')}
    </div>
    ${canManage(user) ? `<div class="filter-chips">
      ${['all', ...CONFIG.departments].map(d =>
        `<button class="fchip ${deptFilter === d ? 'active' : ''}" data-dept="${esc(d)}">${d === 'all' ? 'All depts' : esc(d)}</button>`).join('')}
    </div>` : ''}
    ${tasks.length ? '' : `<div class="empty">${taskFilter === 'done' ? 'No verified tasks yet.' : 'No tasks here. 🎉'}</div>`}
    ${tasks.map(t => taskCard(t, user, name)).join('')}`;

  page.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => {
    taskFilter = b.dataset.f; tabTasks(page, root, user);
  }));
  page.querySelectorAll('[data-dept]').forEach(b => b.addEventListener('click', () => {
    deptFilter = b.dataset.dept; tabTasks(page, root, user);
  }));
  page.querySelector('#assignBtn')?.addEventListener('click', () => openTaskSheet(root, user, 'new', null, targets));

  page.querySelectorAll('[data-task]').forEach(card => {
    const task = tasksAll.find(x => x.id === card.dataset.task);
    const ta = card.querySelector('textarea');
    const fileInp = card.querySelector('.photo-input');
    const slot = card.querySelector('.photo-slot');
    let photo = null;

    card.querySelector('[data-cam]')?.addEventListener('click', () => fileInp.click());
    fileInp?.addEventListener('change', async () => {
      const f = fileInp.files[0];
      if (!f) return;
      try {
        photo = await fileToDataURL(f);
        slot.innerHTML = `<span class="photo-chip">${icon('camera')} Photo attached <b data-rm style="cursor:pointer">✕</b></span>`;
        slot.querySelector('[data-rm]').onclick = () => { photo = null; slot.innerHTML = ''; fileInp.value = ''; };
      } catch (e) { toast(e.message); }
    });
    card.querySelector('[data-send]')?.addEventListener('click', async () => {
      const r = await DB.replyTask(card.dataset.task, user, ta.value, photo);
      if (r.error) return toast(r.error);
      toast(photo ? 'Proof sent ✅' : 'Reply sent ✅');
      renderDashboard(root, user, 'tasks');
    });
    card.querySelector('[data-verify]')?.addEventListener('click', async () => {
      const r = await DB.verifyTask(card.dataset.task, user);
      if (r.error) return toast(r.error);
      toast('Task verified ✅');
      renderDashboard(root, user, 'tasks');
    });
    card.querySelector('[data-reopen]')?.addEventListener('click', async () => {
      const r = await DB.reopenTask(card.dataset.task, user);
      if (r.error) return toast(r.error);
      toast('Task reopened 🔁');
      renderDashboard(root, user, 'tasks');
    });
    card.querySelector('[data-edit]')?.addEventListener('click', () =>
      openTaskSheet(root, user, 'edit', task, targets));
    card.querySelector('[data-del]')?.addEventListener('click', () => {
      const sh = openSheet(`
        <h3>Delete task?</h3>
        <p class="muted small">“${esc(task.title)}” and its replies will be removed. This is written to History.</p>
        <div class="sheet-actions">
          <button class="btn-ghost" id="cn">Cancel</button>
          <button class="btn-danger" id="ok">${icon('trash')} Delete</button>
        </div>`);
      sh.el.querySelector('#cn').onclick = sh.close;
      sh.el.querySelector('#ok').onclick = async () => {
        const r = await DB.deleteTask(task.id, user);
        sh.close();
        if (r.error) return toast(r.error);
        toast('Task deleted');
        renderDashboard(root, user, 'tasks');
      };
    });
  });
  page.querySelectorAll('[data-view]').forEach(im => im.addEventListener('click', () => {
    openSheet(`<img src="${im.src}" style="width:100%;border-radius:12px" alt="proof" />`);
  }));
}

async function goAssign(root, user) {
  await renderDashboard(root, user, 'tasks');
  const targets = await DB.assignTargets(user);
  openTaskSheet(root, user, 'new', null, targets);
}

function personOptions(targets, selected) {
  const mgrs = targets.filter(t => t.role === 'manager');
  const emps = targets.filter(t => t.role === 'employee');
  const opt = t => `<option value="${t.id}" ${t.id === selected ? 'selected' : ''}>${esc(t.name)} — ${esc(t.dept)}</option>`;
  return `${mgrs.length ? `<optgroup label="Managers">${mgrs.map(opt).join('')}</optgroup>` : ''}
          <optgroup label="Staff">${emps.map(opt).join('')}</optgroup>`;
}

function openTaskSheet(root, user, mode, task, targets) {
  if (!targets || !targets.length) return toast('No one available to assign.');
  const isEdit = mode === 'edit';
  const sh = openSheet(`
    <h3>${isEdit ? 'Edit task' : 'Assign task'}</h3>
    <p class="muted small">${user.role === 'manager' ? 'Managers assign to staff.' : 'Admins assign to managers & staff.'}</p>
    <div class="field"><label>TASK</label>
      <input class="inp" id="f-title" placeholder="e.g. Check site material delivery" value="${isEdit ? esc(task.title) : ''}" /></div>
    <div class="field"><label>ASSIGN TO</label>
      <select class="inp" id="f-to">${personOptions(targets, isEdit ? task.assignedTo : null)}</select></div>
    <div class="field"><label>DUE DATE (optional)</label>
      <input class="inp" id="f-due" type="date" min="${todayKey()}" value="${isEdit && task.due ? esc(task.due) : ''}" /></div>
    <div class="field"><label>PRIORITY</label>
      <select class="inp" id="f-prio">
        <option value="normal" ${!isEdit || task?.priority !== 'urgent' ? 'selected' : ''}>Normal</option>
        <option value="urgent" ${isEdit && task?.priority === 'urgent' ? 'selected' : ''}>🚩 Urgent</option>
      </select></div>
    <div class="sheet-actions">
      <button class="btn-ghost" id="cn">Cancel</button>
      <button class="btn-primary" id="ok" style="flex:1">${icon(isEdit ? 'check' : 'send')} ${isEdit ? 'Save changes' : 'Assign'}</button>
    </div>`);
  sh.el.querySelector('#cn').onclick = sh.close;
  sh.el.querySelector('#ok').onclick = async () => {
    const payload = {
      title: sh.el.querySelector('#f-title').value,
      assignedTo: sh.el.querySelector('#f-to').value,
      due: sh.el.querySelector('#f-due').value || null,
      priority: sh.el.querySelector('#f-prio').value,
    };
    const r = isEdit ? await DB.updateTask(task.id, payload, user) : await DB.createTask(payload, user);
    if (r.error) return toast(r.error);
    sh.close();
    toast(isEdit ? 'Task updated ✅' : 'Task assigned ✅');
    renderDashboard(root, user, 'tasks');
  };
}

/* =============== HISTORY =============== */
async function tabHistory(page, user) {
  const rows = await DB.historyFor(user);
  const own = !canManage(user);
  page.innerHTML = `
    <div class="greet"><h2>History</h2>
      <p>${own ? 'every change about you / by you' : 'every change in the company (Admin view)'}</p></div>
    <div class="card">
      ${rows.length ? rows.map(h => `
        <div class="row">
          <span class="muted">${icon('dot')}</span>
          <div class="grow"><div style="font-size:13.5px">${esc(h.text)}</div></div>
          <div class="muted small" style="white-space:nowrap">${timeAgo(h.at)}</div>
        </div>`).join('') : '<div class="empty">Nothing yet.</div>'}
    </div>`;
}

/* =============== WHATSAPP GROUP (employee) =============== */
async function tabGroup(page, user) {
  const [s, people] = await Promise.all([DB.settings(), DB.listPeople()]);
  const contacts = people.filter(p => ['admin', 'manager'].includes(p.role));
  page.innerHTML = `
    <div class="greet"><h2>WhatsApp</h2><p>one company group · proofs & updates go here</p></div>
    <div class="group-hero">
      ${icon('wa', 'width:38px;height:38px')}
      <div class="grow"><b>SaGo Company Group</b>
        <div class="small" style="opacity:.9">${s?.whatsappGroup ? 'Tap below — opens on your phone' : 'Link not added yet — tell your Admin'}</div>
      </div>
      ${s?.whatsappGroup ? `<a class="big-btn" href="${esc(s.whatsappGroup)}" target="_blank" rel="noopener">Open</a>` : ''}
    </div>
    <div class="section-title">Quick contacts — send proof personally</div>
    <div class="card">
      ${contacts.map(p => `
        <div class="row">${avatarHTML(p.name, 38)}
          <div class="grow"><div class="ellipsis"><b>${esc(p.name)}</b> ${roleBadge(p.role)}</div>
            <div class="muted small">${esc(p.dept)}</div></div>
          ${p.phone ? `<a class="wa-btn" href="${waLink(p.phone)}" target="_blank" rel="noopener">${icon('wa')}</a>` : ''}
        </div>`).join('')}
    </div>`;
}

/* =============== REPORTS & EXPORTS (superadmin/admin) =============== */
async function tabReports(page, root, user) {
  const [people, staff, tasks, historyData, attPack] = await Promise.all([
    DB.allPeople(),
    DB.listStaff(),
    DB.listTasks(user),
    DB.historyFor(user),
    DB.allAttendance(30)
  ]);

  const ctx = { people, staff, tasks, historyData, attPack, user };

  page.innerHTML = `
    <div class="greet">
      <h2>Reports & Data Export</h2>
      <p>Official company PDFs & spreadsheet exports (Admin only)</p>
    </div>

    <div class="stats">
      ${statHTML(people.length, 'Staff members')}
      ${statHTML(tasks.length, 'Total tasks')}
      ${statHTML(attPack.dates.length, 'Attendance days')}
      ${statHTML(historyData.length, 'Audit logs')}
    </div>

    <div class="section-title">One-Click PDF Reports</div>
    <div class="card" style="display:flex;flex-direction:column;gap:12px">
      <div class="report-quick-row">
        <div class="grow">
          <b>📊 Master Executive Report</b>
          <div class="muted small">All-in-one comprehensive overview: Directory, Attendance, Tasks & Audit Log</div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-primary btn-sm" data-pdf="master" style="width:auto">${icon('pdf')} PDF</button>
          <button class="btn btn-ghost btn-sm" data-csv="master" style="width:auto">${icon('download')}</button>
        </div>
      </div>

      <div class="report-quick-row">
        <div class="grow">
          <b>☀ Attendance Register & Summary</b>
          <div class="muted small">Morning & afternoon session records, present/absent counts per staff</div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-primary btn-sm" data-pdf="attendance" style="width:auto">${icon('pdf')} PDF</button>
          <button class="btn btn-ghost btn-sm" data-csv="attendance" style="width:auto">${icon('download')}</button>
        </div>
      </div>

      <div class="report-quick-row">
        <div class="grow">
          <b>📋 Task Execution & Proof Report</b>
          <div class="muted small">Assigned tasks, urgency flags, proof replies, and verification trail</div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-primary btn-sm" data-pdf="tasks" style="width:auto">${icon('pdf')} PDF</button>
          <button class="btn btn-ghost btn-sm" data-csv="tasks" style="width:auto">${icon('download')}</button>
        </div>
      </div>

      <div class="report-quick-row">
        <div class="grow">
          <b>👥 Staff Directory & Team Roster</b>
          <div class="muted small">Official list of employees, managers, roles, and WhatsApp contacts</div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-primary btn-sm" data-pdf="staff" style="width:auto">${icon('pdf')} PDF</button>
          <button class="btn btn-ghost btn-sm" data-csv="staff" style="width:auto">${icon('download')}</button>
        </div>
      </div>

      <div class="report-quick-row">
        <div class="grow">
          <b>📜 Audit Trail & History Log</b>
          <div class="muted small">Timestamped event log of logins, assignments, and attendance changes</div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-primary btn-sm" data-pdf="history" style="width:auto">${icon('pdf')} PDF</button>
          <button class="btn btn-ghost btn-sm" data-csv="history" style="width:auto">${icon('download')}</button>
        </div>
      </div>
    </div>

    <div class="section-title">Custom Export Builder</div>
    <div class="card">
      <p class="muted small" style="margin-top:0">Customize date ranges, filter by department, and select whether to include reply proofs.</p>
      <button class="btn btn-primary" id="openCustomReportBtn" style="width:100%">
        ${icon('pdf')} Open Custom Report Builder
      </button>
    </div>
  `;

  page.querySelectorAll('[data-pdf]').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.pdf;
      generatePDFReport({ ...ctx, filters: { type, dept: 'all', range: '7days', includeReplies: true } });
    });
  });

  page.querySelectorAll('[data-csv]').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.csv;
      exportCSVReport({ ...ctx, filters: { type, dept: 'all', range: '7days', includeReplies: true } });
    });
  });

  page.querySelector('#openCustomReportBtn').addEventListener('click', () => {
    openExportModal(root, user);
  });
}

/* =============== SETTINGS (superadmin/admin) =============== */
async function tabSettings(page, root, user) {
  const s = await DB.settings();
  const live = DB.mode() === 'supabase';
  page.innerHTML = `
    <div class="greet"><h2>Settings</h2><p>company-wide controls</p></div>

    <div class="section-title">Backend</div>
    <div class="card">
      <div style="display:flex;align-items:center;gap:10px">
        <b>Supabase</b>
        <span class="conn-pill ${live ? 'conn-live' : 'conn-demo'}">${live ? '● LIVE' : '● LOCAL DATA'}</span>
      </div>
      <ol class="ol">
        <li>Create a free project at <b>supabase.com</b></li>
        <li>Project Settings → API → copy <b>Project URL</b> + <b>anon key</b></li>
        <li>Paste them in <b>app/js/config.js</b> → tell me, I'll activate the data layer (guide: <b>supabase/CONNECT.md</b>)</li>
      </ol>
    </div>

    <div class="section-title">WhatsApp group</div>
    <div class="card">
      <div class="field"><label>COMPANY GROUP INVITE LINK</label>
        <input class="inp" id="grp" placeholder="https://chat.whatsapp.com/..." value="${esc(s?.whatsappGroup || '')}" /></div>
      <button class="btn btn-primary btn-sm" id="saveGrp" style="width:auto;margin-top:10px">${icon('check')} Save link</button>
      <div class="muted small" style="margin-top:8px">Everyone's "Open group" button redirects here on their phone.</div>
    </div>

    <div class="section-title">Departments</div>
    <div class="card">
      ${CONFIG.departments.map(d => `<span class="mini-chip on" style="margin-right:6px">${esc(d)}</span>`).join('')}
    </div>

    ${user.role === 'superadmin' ? `
      <div class="section-title">Danger zone</div>
      <div class="card">
        <button class="btn-danger" id="resetDemo">${icon('trash')} Reset data on this device</button>
        <div class="muted small" style="margin-top:8px">Wipes all data on this device and restores the initial records.</div>
      </div>` : ''}`;

  page.querySelector('#saveGrp').addEventListener('click', async () => {
    const v = page.querySelector('#grp').value.trim();
    if (v && !/^https:\/\/(chat\.)?whatsapp\.com\//.test(v) && !v.startsWith('https://wa.me/'))
      return toast('That does not look like a WhatsApp link.');
    const r = await DB.saveSettings({ whatsappGroup: v }, user);
    if (r.error) return toast(r.error);
    toast('Group link saved ✅');
  });
  page.querySelector('#resetDemo')?.addEventListener('click', async () => {
    await DB.resetDemo(); location.hash = '#/login'; location.reload();
  });
}
