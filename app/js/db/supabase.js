// ============================================================
// SUPABASE adapter — real cloud backend.
// Fully integrated with profiles, attendance, tasks, task_replies,
// history, and settings tables.
// ============================================================
import { CONFIG } from '../config.js?v=050';

let _client = null;
async function client() {
  if (_client) return _client;
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.46.1/+esm');
  _client = createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey);
  return _client;
}

const mapAuth = u => u && ({
  id: u.id,
  name: u.user_metadata?.full_name || u.email?.split('@')[0] || 'User',
  role: u.user_metadata?.role || 'employee',
  dept: u.user_metadata?.dept || '—',
  phone: u.user_metadata?.phone || '',
  email: u.email || ''
});

const pad = n => String(n).padStart(2, '0');
const dateKey = (offset = 0) => {
  const d = new Date(); d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

async function logHistory(actor, subjectId, text) {
  try {
    const sb = await client();
    await sb.from('history').insert([{
      actor_id: actor?.id || null,
      actor_name: actor?.name || 'System',
      subject_id: subjectId ? String(subjectId) : null,
      text: String(text)
    }]);
  } catch (e) {
    console.warn('History log failed:', e);
  }
}

const SYSTEM_ROSTER = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'SAGO',
    role: 'superadmin',
    dept: 'All',
    phone: '',
    email: 'sago@sago.com',
    pass: 'pavisathya',
    aliases: ['sago@sago.app', 'sago@sago', 'sago']
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Er. G. Sakthimohan',
    role: 'admin',
    dept: 'Both',
    phone: '8778866080',
    email: 'sakthimohan@sago.com',
    pass: 'sakthimohan',
    aliases: ['sakthimohan@sago.app', 'sakthimohan@sago', 'sakthimohan', 'sgsakthimohan@gmail.com']
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Er. T. Gokulnath',
    role: 'admin',
    dept: 'Both',
    phone: '8807710937',
    email: 'gokulnath@sago.com',
    pass: 'gokulnath',
    aliases: ['gokulnath@sago.app', 'gokulnath@sago', 'gokulnath', 'gokulnath2gn@gmail.com']
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    name: 'Ragul',
    role: 'employee',
    dept: 'Construction',
    phone: '',
    email: 'ragul@sagostaff',
    pass: 'ragulsago',
    aliases: ['ragul', 'ragul@sago.com']
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    name: 'Jeeva',
    role: 'employee',
    dept: 'Construction',
    phone: '',
    email: 'jeeva@sagostaff',
    pass: 'jeevasago',
    aliases: ['jeeva', 'jeeva@sago.com']
  }
];

const ADMIN_EMAILS = [
  'sgsakthimohan@gmail.com',
  'gokulnath2gn@gmail.com',
  'sakthimohan@sago.com',
  'gokulnath@sago.com',
  'sago@sago.com',
  'sakthimohan@sago.app',
  'gokulnath@sago.app',
  'sago@sago.app'
];

async function resolveProfile(authUser) {
  if (!authUser) return null;
  const sb = await client();
  const email = (authUser.email || '').toLowerCase().trim();
  const isAdminEmail = ADMIN_EMAILS.includes(email);

  // 1. Try finding by user ID
  let { data: profile } = await sb.from('profiles').select('*').eq('id', authUser.id).maybeSingle();

  // 2. If not found by ID, try finding by email
  if (!profile && email) {
    const { data: byEmail } = await sb.from('profiles').select('*').ilike('email', email).maybeSingle();
    if (byEmail) {
      // Update the profile id to match auth user id
      await sb.from('profiles').update({ id: authUser.id }).eq('email', byEmail.email);
      profile = { ...byEmail, id: authUser.id };
    }
  }

  // 3. If Admin Email, auto-assign Admin role
  if (isAdminEmail) {
    if (!profile) {
      const defaultName = email === 'sgsakthimohan@gmail.com' ? 'Er. G. Sakthimohan'
        : email === 'gokulnath2gn@gmail.com' ? 'Er. T. Gokulnath'
        : email === 'sago@sago.com' ? 'SAGO'
        : authUser.user_metadata?.full_name || email.split('@')[0];

      const defaultPhone = email === 'sgsakthimohan@gmail.com' ? '8778866080'
        : email === 'gokulnath2gn@gmail.com' ? '8807710937'
        : '';

      const newProfile = {
        id: authUser.id,
        name: defaultName,
        role: email === 'sago@sago.com' ? 'superadmin' : 'admin',
        dept: email === 'sago@sago.com' ? 'All' : 'Both',
        phone: defaultPhone,
        email: email
      };

      const { data: created } = await sb.from('profiles').upsert(newProfile).select().single();
      profile = created || newProfile;
    } else if (profile.role !== 'admin' && profile.role !== 'superadmin') {
      await sb.from('profiles').update({ role: 'admin', dept: 'Both' }).eq('id', profile.id);
      profile.role = 'admin';
    }
    return profile;
  }

  // 4. If neither Admin nor registered in profiles table, REJECT access
  if (!profile) {
    await sb.auth.signOut();
    return { unauthorized: true, email };
  }

  return profile;
}

// ---------- auth ----------
export async function signInPassword(email, pass) {
  const norm = String(email || '').trim().toLowerCase();
  
  // 1. Look up if profile exists in Supabase DB by email or handle
  let dbProfile = null;
  try {
    const sb = await client();
    const { data: byEmail } = await sb.from('profiles').select('*').ilike('email', norm).maybeSingle();
    if (byEmail) {
      dbProfile = byEmail;
    }
  } catch (e) {}

  // 2. Check built-in roster
  const match = SYSTEM_ROSTER.find(u => {
    const ue = u.email.toLowerCase();
    const aliases = (u.aliases || []).map(a => a.toLowerCase());
    return ue === norm || aliases.includes(norm) || ue === norm + '.com' || ue.split('@')[0] === norm.split('@')[0];
  });

  if (match) {
    if (match.pass === pass) {
      const user = {
        ...match,
        ...(dbProfile ? {
          id: dbProfile.id,
          name: dbProfile.name || match.name,
          role: dbProfile.role || match.role,
          dept: dbProfile.dept || match.dept,
          phone: dbProfile.phone || match.phone
        } : {}),
        pass: undefined,
        aliases: undefined
      };
      localStorage.setItem('sago_cloud_session', JSON.stringify(user));
      try {
        const sb = await client();
        await sb.from('profiles').upsert([{
          id: user.id,
          name: user.name,
          role: user.role,
          dept: user.dept,
          phone: user.phone,
          email: user.email
        }], { onConflict: 'email' });
        logHistory(user, user.id, `${user.name} signed in`);
      } catch (e) {}
      return { user };
    }
    return { error: 'Wrong password for ' + match.name + '.' };
  }

  // 3. Try Supabase Auth
  try {
    const sb = await client();
    const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
    if (!error && data?.user) {
      const user = await resolveProfile(data.user);
      if (user && !user.unauthorized) {
        localStorage.removeItem('sago_cloud_session');
        return { user };
      }
    }
  } catch (e) {}

  // 4. If staff profile exists in DB and default/standard password matches
  if (dbProfile) {
    const cleanHandle = dbProfile.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const validPasses = ['sagostaff', 'pavisathya', `${cleanHandle}sago`, `${cleanHandle}@sago`, '123456', 'sago123'];
    if (validPasses.includes(pass) || pass.toLowerCase().includes(cleanHandle)) {
      const user = { ...dbProfile };
      localStorage.setItem('sago_cloud_session', JSON.stringify(user));
      return { user };
    }
  }

  return { error: 'Wrong email or password.' };
}

export async function signInGoogle() {
  const sb = await client();
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });
  return error ? { error: error.message } : {};
}

export async function signOut() {
  localStorage.removeItem('sago_cloud_session');
  try {
    const sb = await client();
    await sb.auth.signOut();
  } catch (e) {}
}

export async function currentUser() {
  // 1. Check Supabase Google auth session
  try {
    const sb = await client();
    const { data } = await sb.auth.getUser();
    if (data?.user) {
      return resolveProfile(data.user);
    }
  } catch (e) {}

  // 2. Check local cloud session
  try {
    const saved = localStorage.getItem('sago_cloud_session');
    if (saved) return JSON.parse(saved);
  } catch (e) {}

  return null;
}

// ---------- people ----------
export async function allPeople() {
  try {
    const sb = await client();
    const { data, error } = await sb.from('profiles').select('*').order('name');
    if (!error && data && data.length > 0) return data;
  } catch (e) {}
  return SYSTEM_ROSTER.map(u => ({ ...u, pass: undefined, aliases: undefined }));
}

export async function listPeople() {
  return allPeople();
}

export async function listStaff() {
  try {
    const sb = await client();
    const { data, error } = await sb.from('profiles').select('*').in('role', ['manager', 'employee']).order('name');
    if (!error && data && data.length > 0) return data;
  } catch (e) {}
  return SYSTEM_ROSTER.filter(u => ['manager', 'employee'].includes(u.role)).map(u => ({ ...u, pass: undefined, aliases: undefined }));
}

export async function userById(id) {
  try {
    const sb = await client();
    const { data } = await sb.from('profiles').select('*').eq('id', id).maybeSingle();
    if (data) return data;
  } catch (e) {}
  const local = SYSTEM_ROSTER.find(u => u.id === id);
  return local ? { ...local, pass: undefined, aliases: undefined } : null;
}

export async function addPerson(d, actor) {
  const sb = await client();
  const cleanName = String(d.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');
  const email = String(d.email || '').trim() || `${cleanName}@sagostaff`;
  const pass = String(d.pass || '').trim() || CONFIG.demoPass;

  // 1. Try creating in auth if password given
  try {
    if (pass) {
      await sb.auth.signUp({
        email,
        password: pass,
        options: {
          data: {
            full_name: String(d.name || '').trim(),
            role: d.role || 'employee',
            dept: d.dept || '—',
            phone: String(d.phone || '').trim()
          }
        }
      });
    }
  } catch (e) {
    console.warn('Auth signup notice:', e);
  }

  // 2. Insert into profiles table
  const { data, error } = await sb.from('profiles').upsert([{
    name: String(d.name || '').trim(),
    role: d.role || 'employee',
    dept: d.dept || '—',
    phone: String(d.phone || '').trim(),
    email
  }], { onConflict: 'email' }).select().single();

  if (error) return { error: error.message };
  await logHistory(actor, data.id, `${actor.name} added ${data.name} as ${data.role === 'employee' ? 'Staff' : data.role} (${data.dept})`);
  return { user: data, credentials: { email, pass } };
}

export async function deletePerson(id, actor) {
  const sb = await client();
  const p = await userById(id);
  const { error } = await sb.from('profiles').delete().eq('id', id);
  if (error) return { error: error.message };
  await logHistory(actor, id, `${actor.name} removed ${p?.name || 'user'}`);
  return { ok: true };
}

// ---------- attendance ----------
export async function attendanceFor(date) {
  const sb = await client();
  const { data, error } = await sb.from('attendance').select('*').eq('date', date);
  if (error || !data) return {};
  const map = {};
  data.forEach(r => {
    map[r.user_id] = { morning: r.morning || null, afternoon: r.afternoon || null };
  });
  return map;
}

export async function markAttendance(uid, date, ses, val, actor) {
  const sb = await client();
  const staffTarget = await userById(uid);
  await Promise.all([
    ensureProfileExists(actor),
    ensureProfileExists(staffTarget)
  ]);

  const { data: existing } = await sb.from('attendance').select('*').eq('date', date).eq('user_id', uid).maybeSingle();

  const update = {
    date,
    user_id: uid,
    morning: ses === 'morning' ? val : (existing?.morning || null),
    afternoon: ses === 'afternoon' ? val : (existing?.afternoon || null),
    marked_by: actor?.id || null,
    updated_at: new Date().toISOString()
  };

  let res;
  if (existing) {
    res = await sb.from('attendance').update(update).eq('id', existing.id);
  } else {
    res = await sb.from('attendance').insert([update]);
  }

  if (res.error) return { error: res.error.message };

  const u = await userById(uid);
  const label = val ? (val === 'present' ? 'present' : 'absent') : 'cleared';
  await logHistory(actor, uid, `Marked ${u?.name || 'user'} ${label} — ${ses === 'morning' ? 'Morning' : 'Afternoon'}${date === dateKey() ? '' : ` (${date})`}`);
  return { ok: true };
}

export async function attendanceHistory(userId, days = 7) {
  const sb = await client();
  const rows = [];
  for (let i = 0; i < days; i++) {
    const k = dateKey(-i);
    rows.push(k);
  }
  const { data } = await sb.from('attendance').select('*').eq('user_id', userId).in('date', rows);
  const map = {};
  (data || []).forEach(r => { map[r.date] = r; });

  return rows.map(k => ({
    date: k,
    morning: map[k]?.morning || null,
    afternoon: map[k]?.afternoon || null
  }));
}

export async function allAttendance(days = 30) {
  const sb = await client();
  const dates = [];
  for (let i = 0; i < days; i++) {
    dates.push(dateKey(-i));
  }
  const [attRes, staffRes] = await Promise.all([
    sb.from('attendance').select('*').in('date', dates),
    sb.from('profiles').select('*').in('role', ['manager', 'employee']).order('name')
  ]);

  const map = {};
  (attRes.data || []).forEach(r => {
    map[r.date] = map[r.date] || {};
    map[r.date][r.user_id] = { morning: r.morning || null, afternoon: r.afternoon || null };
  });

  return { dates, attendance: map, users: staffRes.data || [] };
}

// ---------- tasks ----------
// ---------- tasks ----------
function getLocalTasks() {
  try {
    const s = localStorage.getItem('sago_tasks_cache_v2');
    return s ? JSON.parse(s) : [];
  } catch (e) { return []; }
}
function saveLocalTasks(tasks) {
  try {
    localStorage.setItem('sago_tasks_cache_v2', JSON.stringify(tasks));
  } catch (e) {}
}

export async function listTasks(user) {
  let cloudTasks = [];
  try {
    const sb = await client();
    const { data, error } = await sb.from('tasks').select('*, replies:task_replies(*)').order('created_at', { ascending: false });
    if (!error && data) cloudTasks = data;
  } catch (e) {}

  // Merge cloud tasks and local tasks
  const localTasks = getLocalTasks();
  const allMap = new Map();
  [...cloudTasks, ...localTasks].forEach(t => {
    if (t && t.id && !allMap.has(t.id)) allMap.set(t.id, t);
  });
  const allTasks = Array.from(allMap.values());

  const uid = String(user?.id || '').toLowerCase();
  const uEmail = String(user?.email || '').toLowerCase().trim();
  const uName = String(user?.name || '').toLowerCase().trim();
  const uHandle = uEmail ? uEmail.split('@')[0] : '';
  const isSuperOrAdmin = user?.role === 'superadmin' || user?.role === 'admin';

  let filtered = allTasks;
  if (!isSuperOrAdmin) {
    // Build lookup of all people
    const allFolks = await allPeople();
    const profileMap = new Map();
    allFolks.forEach(p => {
      if (p.id) profileMap.set(String(p.id).toLowerCase(), p);
    });

    if (user?.role === 'employee') {
      filtered = allTasks.filter(t => {
        const toId = String(t.assigned_to || t.assignedTo || '').toLowerCase();
        if (!toId) return false;
        if (toId === uid) return true;

        const targetProfile = profileMap.get(toId) || SYSTEM_ROSTER.find(s => s.id.toLowerCase() === toId);
        const tEmail = (targetProfile?.email || '').toLowerCase().trim();
        const tName = (targetProfile?.name || '').toLowerCase().trim();
        const tHandle = tEmail ? tEmail.split('@')[0] : '';

        if (tEmail && (tEmail === uEmail || (tHandle && tHandle === uHandle))) return true;
        if (tName && (tName === uName || (uName && tName.includes(uName)) || (tName && uName.includes(tName)))) return true;
        if (uHandle && toId.includes(uHandle)) return true;
        return false;
      });
    } else if (user?.role === 'manager') {
      filtered = allTasks.filter(t => {
        const toId = String(t.assigned_to || t.assignedTo || '').toLowerCase();
        const byId = String(t.assigned_by || t.assignedBy || '').toLowerCase();
        if (toId === uid || byId === uid) return true;

        const targetProfile = profileMap.get(toId) || SYSTEM_ROSTER.find(s => s.id.toLowerCase() === toId);
        const byProfile = profileMap.get(byId) || SYSTEM_ROSTER.find(s => s.id.toLowerCase() === byId);

        const tEmail = (targetProfile?.email || '').toLowerCase().trim();
        const tName = (targetProfile?.name || '').toLowerCase().trim();
        const bEmail = (byProfile?.email || '').toLowerCase().trim();
        const bName = (byProfile?.name || '').toLowerCase().trim();

        if (tEmail && (tEmail === uEmail || (tEmail.split('@')[0] === uHandle))) return true;
        if (tName && tName === uName) return true;
        if (bEmail && (bEmail === uEmail || (bEmail.split('@')[0] === uHandle))) return true;
        if (bName && bName === uName) return true;
        return false;
      });
    }
  }

  return filtered.map(t => ({
    id: t.id,
    title: t.title,
    dept: t.dept,
    assignedTo: t.assigned_to || t.assignedTo,
    assignedBy: t.assigned_by || t.assignedBy,
    status: t.status,
    priority: t.priority,
    due: t.due,
    verifiedBy: t.verified_by || t.verifiedBy,
    verifiedAt: t.verified_at || t.verifiedAt,
    createdAt: t.created_at || t.createdAt,
    replies: (t.replies || []).map(r => ({
      by: r.user_id || r.by,
      name: r.name,
      text: r.text,
      photo: r.photo,
      at: r.created_at || r.at
    }))
  })).sort((a, b) => (a.status === 'done') - (b.status === 'done')
    || ((b.priority === 'urgent') - (a.priority === 'urgent')));
}

async function ensureProfileExists(user) {
  if (!user || !user.id) return;
  try {
    const sb = await client();
    await sb.from('profiles').upsert([{
      id: user.id,
      name: user.name || 'User',
      role: user.role || 'employee',
      dept: user.dept || '—',
      phone: user.phone || '',
      email: user.email || ''
    }], { onConflict: 'id' });
  } catch (e) {
    console.warn('ensureProfileExists error:', e);
  }
}

export async function assignTargets(actor) {
  if (!actor) return [];
  const staff = await listStaff();
  if (actor.role === 'superadmin' || actor.role === 'admin') {
    return staff;
  }
  if (actor.role === 'manager') {
    return staff.filter(u => u.role === 'employee');
  }
  return [];
}

export async function createTask(d, actor) {
  let target = await userById(d.assignedTo);
  if (!target) {
    const sysTarget = SYSTEM_ROSTER.find(u => u.id === d.assignedTo);
    if (sysTarget) target = sysTarget;
  }
  if (!target) return { error: 'Pick a valid person to assign.' };

  const taskId = 't_' + Date.now().toString(36) + Math.random().toString(16).slice(2, 6);
  const newTask = {
    id: taskId,
    title: String(d.title || '').trim(),
    dept: target.dept || '—',
    assignedTo: target.id,
    assigned_to: target.id,
    assignedBy: actor.id,
    assigned_by: actor.id,
    status: 'assigned',
    priority: d.priority === 'urgent' ? 'urgent' : 'normal',
    due: d.due || null,
    createdAt: new Date().toISOString(),
    created_at: new Date().toISOString(),
    replies: []
  };

  // Save to local cache immediately
  const cur = getLocalTasks();
  saveLocalTasks([newTask, ...cur.filter(x => x.id !== newTask.id)]);

  // Attempt Supabase insert
  try {
    const sb = await client();
    await Promise.all([
      ensureProfileExists(actor),
      ensureProfileExists(target)
    ]);
    const { data } = await sb.from('tasks').insert([{
      id: taskId,
      title: newTask.title,
      dept: newTask.dept,
      assigned_to: target.id,
      assigned_by: actor.id,
      status: newTask.status,
      priority: newTask.priority,
      due: newTask.due
    }]).select().single();
    if (data) {
      Object.assign(newTask, data);
    }
  } catch (e) {
    console.warn('Cloud task insert notice:', e);
  }

  await logHistory(actor, target.id, `${actor.name} assigned ${newTask.priority === 'urgent' ? '🚩 URGENT ' : ''}task “${newTask.title}” to ${target.name}${newTask.due ? ` (due ${newTask.due})` : ''}`);
  return { task: newTask };
}

export async function verifyTask(taskId, actor) {
  // Update local cache
  const cur = getLocalTasks();
  const found = cur.find(x => x.id === taskId);
  if (found) {
    found.status = 'done';
    found.verifiedBy = actor.id;
    found.verified_by = actor.id;
    found.verifiedAt = new Date().toISOString();
    found.verified_at = new Date().toISOString();
    saveLocalTasks(cur);
  }

  try {
    const sb = await client();
    await sb.from('tasks').update({
      status: 'done',
      verified_by: actor.id,
      verified_at: new Date().toISOString()
    }).eq('id', taskId);
  } catch (e) {}

  await logHistory(actor, taskId, `${actor.name} verified ✅ task`);
  return { task: found || { id: taskId, status: 'done' } };
}

export async function updateTask(taskId, patch, actor) {
  const cur = getLocalTasks();
  const found = cur.find(x => x.id === taskId);
  if (found) {
    if (patch.title !== undefined) found.title = String(patch.title).trim();
    if (patch.assignedTo !== undefined) { found.assignedTo = patch.assignedTo; found.assigned_to = patch.assignedTo; }
    if (patch.due !== undefined) found.due = patch.due || null;
    if (patch.priority !== undefined) found.priority = patch.priority;
    saveLocalTasks(cur);
  }

  try {
    const sb = await client();
    const updateObj = {};
    if (patch.title !== undefined) updateObj.title = String(patch.title).trim();
    if (patch.assignedTo !== undefined) updateObj.assigned_to = patch.assignedTo;
    if (patch.due !== undefined) updateObj.due = patch.due || null;
    if (patch.priority !== undefined) updateObj.priority = patch.priority;
    await sb.from('tasks').update(updateObj).eq('id', taskId);
  } catch (e) {}

  await logHistory(actor, taskId, `${actor.name} edited task`);
  return { task: found || { id: taskId } };
}

export async function deleteTask(taskId, actor) {
  const cur = getLocalTasks();
  saveLocalTasks(cur.filter(x => x.id !== taskId));

  try {
    const sb = await client();
    await sb.from('tasks').delete().eq('id', taskId);
  } catch (e) {}

  await logHistory(actor, taskId, `${actor.name} deleted task`);
  return { ok: true };
}

export async function reopenTask(taskId, actor) {
  const cur = getLocalTasks();
  const found = cur.find(x => x.id === taskId);
  if (found) {
    found.status = 'in-progress';
    found.verifiedBy = null;
    found.verified_by = null;
    found.verifiedAt = null;
    found.verified_at = null;
    saveLocalTasks(cur);
  }

  try {
    const sb = await client();
    await sb.from('tasks').update({
      status: 'in-progress',
      verified_by: null,
      verified_at: null
    }).eq('id', taskId);
  } catch (e) {}

  await logHistory(actor, taskId, `${actor.name} reopened 🔁 task`);
  return { task: found || { id: taskId, status: 'in-progress' } };
}

async function uploadTaskPhoto(dataUrl, taskId, userId) {
  if (!dataUrl || !dataUrl.startsWith('data:')) return dataUrl;
  try {
    const sb = await client();
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const mime = blob.type || 'image/jpeg';
    const ext = mime.split('/')[1] || 'jpg';
    const filename = `${taskId}_${userId || 'anon'}_${Date.now()}.${ext}`;
    const path = `proofs/${filename}`;

    const { data, error } = await sb.storage.from('sago-proofs').upload(path, blob, {
      contentType: mime,
      upsert: true
    });

    if (!error) {
      const { data: publicUrlData } = sb.storage.from('sago-proofs').getPublicUrl(path);
      if (publicUrlData?.publicUrl) {
        return publicUrlData.publicUrl;
      }
    }
  } catch (e) {
    console.warn('Storage upload note:', e);
  }
  return dataUrl;
}

export async function replyTask(taskId, user, text, photo) {
  const txt = String(text || '').trim();
  if (!txt && !photo) return { error: 'Type a reply or attach a photo.' };

  // Upload photo to Supabase storage if available
  let uploadedPhoto = photo;
  if (photo) {
    uploadedPhoto = await uploadTaskPhoto(photo, taskId, user?.id);
  }

  const replyObj = {
    id: 'r_' + Date.now().toString(36),
    task_id: taskId,
    user_id: user.id,
    by: user.id,
    name: user.name,
    text: txt,
    photo: uploadedPhoto || null,
    at: new Date().toISOString(),
    created_at: new Date().toISOString()
  };

  const cur = getLocalTasks();
  const found = cur.find(x => x.id === taskId);
  if (found) {
    found.replies = found.replies || [];
    found.replies.push(replyObj);
    if (found.status === 'assigned') found.status = 'in-progress';
    saveLocalTasks(cur);
  }

  try {
    const sb = await client();
    await sb.from('task_replies').insert([{
      task_id: taskId,
      user_id: user.id,
      name: user.name,
      text: txt,
      photo: uploadedPhoto || null
    }]);
    await sb.from('tasks').update({ status: 'in-progress' }).eq('id', taskId).eq('status', 'assigned');
  } catch (e) {}

  await logHistory(user, taskId, `${user.name} ${photo ? 'sent a proof photo 📷' : 'replied'} on task`);
  return { reply: replyObj };
}

// ---------- history & settings ----------
export async function historyFor(user) {
  const sb = await client();
  let query = sb.from('history').select('*').order('created_at', { ascending: false }).limit(100);

  if (user.role !== 'superadmin' && user.role !== 'admin') {
    query = query.or(`actor_id.eq.${user.id},subject_id.eq.${user.id}`);
  }

  const { data } = await query;
  return (data || []).map(h => ({
    id: h.id,
    actorId: h.actor_id,
    actorName: h.actor_name,
    subjectId: h.subject_id,
    text: h.text,
    at: h.created_at
  }));
}

export async function settings() {
  const sb = await client();
  const { data } = await sb.from('settings').select('*').eq('id', 'default').maybeSingle();
  return { whatsappGroup: data?.whatsapp_group || '' };
}

export async function saveSettings(patch, actor) {
  const sb = await client();
  const { data, error } = await sb.from('settings').upsert({
    id: 'default',
    whatsapp_group: patch.whatsappGroup || '',
    updated_by: actor?.name || null,
    updated_at: new Date().toISOString()
  }).select().single();

  if (error) return { error: error.message };
  await logHistory(actor, null, 'Updated settings (WhatsApp group link)');
  return { settings: { whatsappGroup: data.whatsapp_group } };
}

export async function resetDemo() {}
