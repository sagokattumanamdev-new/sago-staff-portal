// ============================================================
// DB FACADE — the rest of the app talks ONLY to this object.
// If Supabase keys exist in config.js → real cloud backend.
// Otherwise → demo backend on this device. Nothing else changes.
// ============================================================
import { isSupabaseConfigured } from '../config.js?v=075';
import * as demo from './demo.js?v=075';
import * as sb from './supabase.js?v=075';

const impl = () => (isSupabaseConfigured() ? sb : demo);

export const DB = {
  mode: () => (isSupabaseConfigured() ? 'supabase' : 'demo'),

  // auth
  signInPassword: async (e, p) => impl().signInPassword(e, p),
  signInGoogle: async () => impl().signInGoogle(),
  signOut: async () => impl().signOut(),
  currentUser: async () => impl().currentUser(),

  // people
  userById: async id => impl().userById(id),
  allPeople: async () => impl().allPeople(),
  listPeople: async () => impl().listPeople(),
  listStaff: async () => impl().listStaff(),
  addPerson: async (d, actor) => impl().addPerson(d, actor),
  deletePerson: async (id, actor) => impl().deletePerson(id, actor),

  // attendance
  attendanceFor: async date => impl().attendanceFor(date),
  markAttendance: async (uid, date, ses, val, actor) => impl().markAttendance(uid, date, ses, val, actor),
  attendanceHistory: async (uid, days) => impl().attendanceHistory(uid, days),
  allAttendance: async (days) => impl().allAttendance(days),

  // tasks
  listTasks: async user => impl().listTasks(user),
  assignTargets: async actor => impl().assignTargets(actor),
  createTask: async (d, actor) => impl().createTask(d, actor),
  verifyTask: async (tid, actor) => impl().verifyTask(tid, actor),
  updateTask: async (tid, patch, actor) => impl().updateTask(tid, patch, actor),
  deleteTask: async (tid, actor) => impl().deleteTask(tid, actor),
  reopenTask: async (tid, actor) => impl().reopenTask(tid, actor),
  replyTask: async (tid, user, text, photo) => impl().replyTask(tid, user, text, photo),

  // history + settings
  historyFor: async user => impl().historyFor(user),
  settings: async () => impl().settings(),
  saveSettings: async (p, actor) => impl().saveSettings(p, actor),
  resetDemo: async () => impl().resetDemo(),
};
