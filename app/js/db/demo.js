// ============================================================
// DEMO adapter — localStorage-backed fake backend.
// Mirrors the exact same API as the Supabase adapter, so the
// whole app works today and switches to the cloud with 2 keys.
// Data stays on this device only.
// ============================================================
import { CONFIG } from '../config.js?v=050';

const LS = 'sago.local.v5'; // v5: clean production-ready roster (SAGO, Sakthimohan, Gokulnath, Ragul, Jeeva)
const pad = n => String(n).padStart(2, '0');
export const dateKey = (offset = 0) => {
  const d = new Date(); d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const iso = (msOffset = 0) => new Date(Date.now() + msOffset).toISOString();

function seed() {
  const users = [
    { id: 'u_sago',    name: 'SAGO',                 role: 'superadmin', dept: 'All',            phone: '',           email: 'sago@sago.com', pass: 'pavisathya', aliases: ['sago@sago.app', 'sago@sago'] },
    { id: 'u_sakthi',  name: 'Er. G. Sakthimohan',   role: 'admin',      dept: 'Both',           phone: '8778866080', email: 'sakthimohan@sago.com', pass: 'sakthimohan', aliases: ['sakthimohan@sago.app', 'sakthimohan@sago', 'sgsakthimohan@gmail.com'] },
    { id: 'u_gokul',   name: 'Er. T. Gokulnath',     role: 'admin',      dept: 'Both',           phone: '8807710937', email: 'gokulnath@sago.com', pass: 'gokulnath', aliases: ['gokulnath@sago.app', 'gokulnath@sago', 'gokulnath2gn@gmail.com'] },
    { id: 'u_ragul',   name: 'Ragul',                role: 'employee',   dept: 'Construction',   phone: '',           email: 'ragul@sagostaff', pass: 'ragulsago' },
    { id: 'u_jeeva',   name: 'Jeeva',                role: 'employee',   dept: 'Construction',   phone: '',           email: 'jeeva@sagostaff', pass: 'jeevasago' },
  ];

  return {
    settings: { whatsappGroup: '', updatedBy: null, updatedAt: null },
    users,
    attendance: {
      [dateKey(-2)]: { u_ragul: { morning: 'present', afternoon: 'present' }, u_jeeva: { morning: 'present' } },
      [dateKey(-1)]: { u_ragul: { morning: 'present', afternoon: 'present' }, u_jeeva: { morning: 'present', afternoon: 'present' } },
      [dateKey(0)]:  { u_ragul: { morning: 'present' }, u_jeeva: { morning: 'present' } },
    },
    tasks: [
      {
        id: 't1', title: 'Verify cement and steel stock at Site A', dept: 'Construction',
        assignedTo: 'u_ragul', assignedBy: 'u_sakthi', status: 'in-progress',
        createdAt: iso(-24 * 3600e3), due: dateKey(1), priority: 'urgent', verifiedBy: null, verifiedAt: null,
        replies: [{ by: 'u_ragul', name: 'Ragul', text: 'Supplier bill verified. Physical count is going on now.', at: iso(-2 * 3600e3), photo: null }],
      },
      {
        id: 't2', title: 'Prepare site progress report for client visit', dept: 'Construction',
        assignedTo: 'u_jeeva', assignedBy: 'u_gokul', status: 'assigned',
        createdAt: iso(-5 * 3600e3), due: null, priority: 'normal', verifiedBy: null, verifiedAt: null, replies: []
      }
    ],
    history: [
      { id: 'h1', at: iso(-24 * 3600e3), actorId: 'u_sakthi', actorName: 'Er. G. Sakthimohan', subjectId: 'u_ragul', text: 'Er. G. Sakthimohan assigned task “Verify cement and steel stock at Site A” to Ragul' },
      { id: 'h2', at: iso(-8 * 3600e3),  actorId: 'u_sakthi', actorName: 'Er. G. Sakthimohan', subjectId: 'u_ragul', text: 'Marked Ragul present — Morning' },
      { id: 'h3', at: iso(-2 * 3600e3),  actorId: 'u_ragul',  actorName: 'Ragul',              subjectId: 't1',      text: 'Ragul replied on task “Verify cement and steel stock at Site A”' },
      { id: 'h4', at: iso(-5 * 3600e3),  actorId: 'u_gokul',  actorName: 'Er. T. Gokulnath',   subjectId: 'u_jeeva', text: 'Er. T. Gokulnath assigned task “Prepare site progress report for client visit” to Jeeva' },
    ],
    session: null
  };
}

function load() {
  try { const s = JSON.parse(localStorage.getItem(LS)); if (s && s.users) return s; } catch (e) {}
  const s = seed(); localStorage.setItem(LS, JSON.stringify(s)); return s;
}
let S = load();
const save = () => localStorage.setItem(LS, JSON.stringify(S));
const now = () => new Date().toISOString();
const pub = u => (u ? { ...u, pass: undefined, aliases: undefined } : null);
const log = (actor, subjectId, text) => {
  S.history.unshift({
    id: 'h' + Date.now().toString(36) + Math.random().toString(16).slice(2, 6),
    at: now(), actorId: actor?.id || null, actorName: actor?.name || 'System',
    subjectId: subjectId || null, text
  });
  save();
};

// ---------- auth ----------
export function signInPassword(email, pass) {
  const norm = String(email || '').trim().toLowerCase();
  const u = S.users.find(x => {
    const ue = x.email.toLowerCase();
    const aliases = (x.aliases || []).map(a => a.toLowerCase());
    return ue === norm || aliases.includes(norm) || ue === norm + '.com' || ue === norm + '.app' || ue.split('@')[0] === norm.split('@')[0];
  });
  if (!u || u.pass !== pass) return { error: 'Wrong email or password.' };
  
  S.session = u.id; save();
  log(u, u.id, `${u.name} signed in`);
  return { user: pub(u) };
}
export function signInGoogle() {
  return { error: 'Google sign-in needs the Supabase connection first (Settings → Backend).' };
}
export function signOut() { S.session = null; save(); }
export function currentUser() { return pub(S.users.find(u => u.id === S.session)); }

// ---------- people ----------
export function userById(id) { return pub(S.users.find(u => u.id === id)); }
export function allPeople() { return S.users.map(pub); }
export function listPeople() { return S.users.filter(u => u.role !== 'superadmin').map(pub); }
export function listStaff() { return S.users.filter(u => ['manager', 'employee'].includes(u.role)).map(pub); }
export function addPerson(d, actor) {
  if (!d.name || !String(d.name).trim()) return { error: 'Name is required.' };
  const id = 'u_' + Date.now().toString(36);
  const cleanName = String(d.name).toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');
  const email = String(d.email || '').trim() || `${cleanName}@sagostaff`;
  const pass = String(d.pass || '').trim() || CONFIG.demoPass;

  const nu = {
    id,
    name: String(d.name).trim(),
    role: d.role || 'employee',
    dept: d.dept || CONFIG.departments[0],
    phone: String(d.phone || '').replace(/\D/g, ''),
    email,
    pass
  };

  S.users.push(nu); save();
  log(actor, id, `Added ${nu.name} (${nu.role === 'employee' ? 'Staff' : nu.role} · ${nu.dept})`);
  return { user: pub(nu), credentials: { email, pass } };
}
export function deletePerson(id, actor) {
  if (id === 'u_sago') return { error: 'Super Admin (SAGO) cannot be deleted.' };
  if (actor && actor.id === id) return { error: 'You cannot delete yourself.' };
  const u = S.users.find(x => x.id === id);
  if (!u) return { error: 'Person not found.' };
  S.users = S.users.filter(x => x.id !== id); save();
  log(actor, id, `Removed ${u.name} (${u.role})`);
  return { ok: true };
}

// ---------- attendance ----------
export function attendanceFor(date) { return S.attendance[date] || {}; }
export function markAttendance(userId, date, session, value, actor) {
  const day = (S.attendance[date] = S.attendance[date] || {});
  const rec = (day[userId] = day[userId] || {});
  if (!value) delete rec[session]; else rec[session] = value;
  save();
  const u = S.users.find(x => x.id === userId);
  const label = value ? (value === 'present' ? 'present' : 'absent') : 'cleared';
  log(actor, userId, `Marked ${u ? u.name : 'user'} ${label} — ${session === 'morning' ? 'Morning' : 'Afternoon'}${date === dateKey() ? '' : ` (${date})`}`);
  return { ok: true };
}
export function attendanceHistory(userId, days = 7) {
  const rows = [];
  for (let i = 0; i < days; i++) {
    const k = dateKey(-i);
    const r = (S.attendance[k] || {})[userId] || {};
    rows.push({ date: k, morning: r.morning || null, afternoon: r.afternoon || null });
  }
  return rows;
}
export function allAttendance(days = 30) {
  const dates = [];
  for (let i = 0; i < days; i++) {
    dates.push(dateKey(-i));
  }
  const result = {};
  for (const d of dates) {
    result[d] = S.attendance[d] || {};
  }
  return { dates, attendance: result, users: S.users.filter(u => ['manager', 'employee'].includes(u.role)) };
}


// ---------- tasks ----------
export function listTasks(user) {
  let ts;
  const uid = String(user?.id || '').toLowerCase();
  const uEmail = String(user?.email || '').toLowerCase().trim();
  const uName = String(user?.name || '').toLowerCase().trim();
  const uHandle = uEmail ? uEmail.split('@')[0] : '';

  if (user?.role === 'employee') {
    ts = S.tasks.filter(t => {
      const toId = String(t.assignedTo || '').toLowerCase();
      if (toId === uid) return true;
      const target = S.users.find(u => String(u.id).toLowerCase() === toId);
      const tEmail = (target?.email || '').toLowerCase().trim();
      const tName = (target?.name || '').toLowerCase().trim();
      const tHandle = tEmail ? tEmail.split('@')[0] : '';

      if (tEmail && (tEmail === uEmail || (tHandle && tHandle === uHandle))) return true;
      if (tName && (tName === uName || (uName && tName.includes(uName)))) return true;
      if (uHandle && toId.includes(uHandle)) return true;
      return false;
    });
  } else if (user?.role === 'manager') {
    ts = S.tasks.filter(t => {
      const toId = String(t.assignedTo || '').toLowerCase();
      const byId = String(t.assignedBy || '').toLowerCase();
      if (toId === uid || byId === uid) return true;
      const target = S.users.find(u => String(u.id).toLowerCase() === toId);
      const by = S.users.find(u => String(u.id).toLowerCase() === byId);
      if (target && (target.email.toLowerCase() === uEmail || target.name.toLowerCase() === uName)) return true;
      if (by && (by.email.toLowerCase() === uEmail || by.name.toLowerCase() === uName)) return true;
      return false;
    });
  } else {
    ts = S.tasks.slice();
  }
  // open first (urgent pinned on top, then newest), verified sink to the bottom
  return ts.sort((a, b) => (a.status === 'done') - (b.status === 'done')
    || ((b.priority === 'urgent') - (a.priority === 'urgent'))
    || (a.createdAt < b.createdAt ? 1 : -1));
}
export function assignTargets(actor) {
  if (!actor) return [];
  if (actor.role === 'superadmin' || actor.role === 'admin')
    return S.users.filter(u => ['manager', 'employee'].includes(u.role)).map(pub);
  if (actor.role === 'manager') return S.users.filter(u => u.role === 'employee').map(pub);
  return [];
}
export function createTask(d, actor) {
  const targets = assignTargets(actor);
  if (!targets.length) return { error: 'You do not have power to assign tasks.' };
  const t = targets.find(x => x.id === d.assignedTo);
  if (!t) return { error: 'Pick a valid person to assign.' };
  if (!String(d.title || '').trim()) return { error: 'Task title is required.' };
  const task = {
    id: 't_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), title: String(d.title).trim(), dept: t.dept || '—',
    assignedTo: t.id, assignedBy: actor.id, status: 'assigned', createdAt: now(),
    due: d.due || null, priority: d.priority === 'urgent' ? 'urgent' : 'normal',
    verifiedBy: null, verifiedAt: null, replies: []
  };
  S.tasks.unshift(task); save();
  log(actor, t.id, `${actor.name} assigned ${task.priority === 'urgent' ? '🚩 URGENT ' : ''}task “${task.title}” to ${t.name}${task.due ? ` (due ${task.due})` : ''}`);
  return { task };
}
export function verifyTask(taskId, actor) {
  const t = S.tasks.find(x => x.id === taskId);
  if (!t) return { error: 'Task not found.' };
  if (!['superadmin', 'admin', 'manager'].includes(actor.role)) return { error: 'Only Admin/Manager can verify tasks.' };
  if (t.status === 'done') return { error: 'Task already verified.' };
  t.status = 'done'; t.verifiedBy = actor.id; t.verifiedAt = now(); save();
  log(actor, taskId, `${actor.name} verified ✅ task “${t.title}”`);
  return { task: t };
}
const canManageTask = (t, actor) =>
  actor && (actor.role === 'superadmin' || actor.role === 'admin' || t.assignedBy === actor.id);

export function updateTask(taskId, patch, actor) {
  const t = S.tasks.find(x => x.id === taskId);
  if (!t) return { error: 'Task not found.' };
  if (!canManageTask(t, actor)) return { error: 'Only the assigner or an Admin can change this task.' };
  if (t.status === 'done') return { error: 'Verified tasks are locked. Reopen it first.' };
  const changes = [];
  if (patch.title !== undefined) {
    if (!String(patch.title).trim()) return { error: 'Task title is required.' };
    t.title = String(patch.title).trim(); changes.push('title');
  }
  if (patch.assignedTo !== undefined && patch.assignedTo !== t.assignedTo) {
    const target = assignTargets(actor).find(x => x.id === patch.assignedTo);
    if (!target) return { error: 'Pick a valid person to assign.' };
    t.assignedTo = target.id; t.dept = target.dept || '—'; changes.push(`reassigned → ${target.name}`);
  }
  if (patch.due !== undefined) { t.due = patch.due || null; changes.push('due date'); }
  if (patch.priority !== undefined) { t.priority = patch.priority === 'urgent' ? 'urgent' : 'normal'; changes.push('priority'); }
  save();
  log(actor, taskId, `${actor.name} edited task “${t.title}” (${changes.join(', ') || 'no changes'})`);
  return { task: t };
}
export function deleteTask(taskId, actor) {
  const t = S.tasks.find(x => x.id === taskId);
  if (!t) return { error: 'Task not found.' };
  if (!canManageTask(t, actor)) return { error: 'Only the assigner or an Admin can delete this task.' };
  S.tasks = S.tasks.filter(x => x.id !== taskId); save();
  log(actor, taskId, `${actor.name} deleted task “${t.title}”`);
  return { ok: true };
}
export function reopenTask(taskId, actor) {
  const t = S.tasks.find(x => x.id === taskId);
  if (!t) return { error: 'Task not found.' };
  if (!['superadmin', 'admin', 'manager'].includes(actor.role)) return { error: 'Only Admin/Manager can reopen tasks.' };
  if (t.status !== 'done') return { error: 'Task is not verified yet.' };
  t.status = 'in-progress'; t.verifiedBy = null; t.verifiedAt = null;
  save();
  log(actor, taskId, `${actor.name} reopened 🔁 task “${t.title}”`);
  return { task: t };
}
export function replyTask(taskId, user, text, photo) {
  const t = S.tasks.find(x => x.id === taskId);
  if (!t) return { error: 'Task not found.' };
  const txt = String(text || '').trim();
  if (!txt && !photo) return { error: 'Type a reply or attach a photo.' };
  if (photo && photo.length > 400000) return { error: 'Photo is too large — try a different one.' };
  t.replies.push({ by: user.id, name: user.name, text: txt, at: now(), photo: photo || null });
  if (t.status === 'assigned') t.status = 'in-progress';
  save();
  log(user, taskId, `${user.name} ${photo ? 'sent a proof photo 📷' : 'replied'} on task “${t.title}”`);
  return { task: t };
}

// ---------- history & settings ----------
export function historyFor(user) {
  if (user.role === 'superadmin' || user.role === 'admin') return S.history.slice(0, 100);
  return S.history.filter(h => h.actorId === user.id || h.subjectId === user.id).slice(0, 100);
}
export function settings() { return S.settings; }
export function saveSettings(patch, actor) {
  Object.assign(S.settings, patch, { updatedBy: actor?.name || null, updatedAt: now() });
  save();
  log(actor, null, 'Updated settings (WhatsApp group link)');
  return { settings: S.settings };
}
export function resetDemo() { localStorage.removeItem(LS); S = load(); }
