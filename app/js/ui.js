// ============================================================
// UI kit — inline SVG icons (no external files), avatars,
// toast, bottom-sheet modal, formatting helpers.
// ============================================================
import { CONFIG } from './config.js?v=050';

export const esc = s => String(s ?? '').replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- icons (24×24 stroke set, inline = works offline) ----------
const PATHS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  people: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20c.8-3.2 2.9-4.8 5.5-4.8s4.7 1.6 5.5 4.8"/><circle cx="17" cy="9" r="2.4"/><path d="M15.8 15.3c2.3.4 4 1.8 4.7 4.7"/>',
  task: '<rect x="4" y="4.5" width="16" height="16" rx="2.5"/><path d="M9 3.5h6"/><path d="M8.5 12.5l2.3 2.3 4.7-4.6"/>',
  history: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  settings: '<path d="M4 7h9M19 7h1M4 17h3M13 17h7"/><circle cx="16" cy="7" r="2.2"/><circle cx="10" cy="17" r="2.2"/>',
  logout: '<path d="M14 4h5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-5"/><path d="M10 8l-4 4 4 4M6 12h11"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2.5 12h2M19.5 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  cloud: '<path d="M7 19h10a4 4 0 0 0 .7-7.9A5.5 5.5 0 0 0 7 9.6 4.2 4.2 0 0 0 7 19Z"/>',
  wa: '<path d="M12 3a8.6 8.6 0 0 0-7.4 13L3.4 20.6 8 19.3A8.6 8.6 0 1 0 12 3Z"/><path fill="currentColor" stroke="none" d="M9.3 8.3c.2-.5.4-.5.7-.5h.5c.2 0 .4 0 .6.4l.7 1.6c.1.2 0 .5-.1.7l-.5.5c-.1.2-.1.4 0 .6.5.8 1.4 1.6 2.3 2 .2.1.4.1.6-.1l.5-.6c.2-.2.4-.2.6-.1l1.6.8c.4.2.4.4.4.6-.1.8-.7 1.6-1.5 1.7-1.4.2-3-.5-4.3-1.9-1.4-1.4-2.1-2.9-1.9-4.3 0-.3.1-.6.3-.8Z"/>',
  trash: '<path d="M4 7h16M9 7V5h6v2M6.5 7l.8 12.2A2 2 0 0 0 9.3 21.2h5.4a2 2 0 0 0 2-1.9L17.5 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M4.5 12.5l5 5L20 6.5"/>',
  send: '<path d="M21 3 10 14M21 3l-7 18-4-7-7-4 18-7Z"/>',
  chev: '<path d="M9 6l6 6-6 6"/>',
  link: '<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5"/>',
  camera: '<path d="M4 8h3l1.8-2.5h6.4L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13.5" r="3.2"/>',
  dot: '<circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none"/>',
  badgecheck: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.3l2.4 2.4 4.6-4.7"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="16" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  pencil: '<path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z"/><path d="M13.5 6.5l3 3"/>',
  reopen: '<path d="M3.5 12a8.5 8.5 0 1 0 2.5-6L3.5 8"/><path d="M3.5 3.5V8H8"/>',
  pdf: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 13h6M9 17h4"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  printer: '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  table: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>'
};
export const icon = (n, style = '') =>
  `<svg class="ic" ${style ? `style="${style}"` : ''} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${PATHS[n] || ''}</svg>`;

// ---------- avatar ----------
const PALETTE = ['#00A878', '#0E7C86', '#2F6FED', '#B7791F', '#7C5CBF', '#C0566B'];
export function initials(name) {
  const w = String(name).replace(/^(Er\.|Mr\.|Ms\.|Dr\.)\s*/i, '').trim()
    .split(/\s+/).filter(t => /^[A-Za-z]/.test(t) && !/^demo/i.test(t));
  if (!w.length) return '?';
  return (w[0][0] + (w.length > 1 ? w[w.length - 1][0] : (w[0][1] || ''))).toUpperCase();
}
export function avatarHTML(name, size = 36) {
  const i = [...String(name)].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length;
  return `<span class="avatar" style="width:${size}px;height:${size}px;background:${PALETTE[i]};font-size:${Math.round(size * .36)}px">${esc(initials(name))}</span>`;
}

// ---------- badges / pills ----------
const ROLE_STYLE = {
  superadmin: ['#FFF1D6', '#8A6414', 'SUPER ADMIN'],
  admin: ['#E7F7F1', '#006B4D', 'ADMIN'],
  manager: ['#E8F0FE', '#2F6FED', 'MANAGER'],
  employee: ['#EEF1F4', '#5F6B74', 'STAFF'],
};
export const roleBadge = r => {
  const [bg, fg, label] = ROLE_STYLE[r] || ROLE_STYLE.employee;
  return `<span class="role-badge" style="background:${bg};color:${fg}">${label}</span>`;
};
export const statusPill = s =>
  `<span class="status status-${s}">${s.replace('-', ' ')}</span>`;
export const prioPill = p =>
  p === 'urgent' ? '<span class="due due-over">🚩 Urgent</span>' : '';

// ---------- toast + sheet ----------
let toastTimer = null;
export function toast(msg) {
  let el = document.querySelector('.toast');
  if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = msg;
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}
export function openSheet(html) {
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="sheet">${html}</div>`;
  ov.addEventListener('click', e => { if (e.target === ov) close(); });
  document.body.appendChild(ov);
  function close() { ov.remove(); }
  return { el: ov, close };
}

// ---------- format helpers ----------
export const waLink = phone => {
  const d = String(phone || '').replace(/\D/g, '');
  if (!d) return '#';
  return `https://wa.me/${d.length === 10 ? CONFIG.defaultCountryCode + d : d}`;
};
export const todayKey = () => {
  const d = new Date(), p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
export const fmtDateKey = k =>
  new Date(k + 'T00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
export const timeAgo = isoStr => {
  const s = (Date.now() - new Date(isoStr).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  return `${Math.floor(s / 86400)} d ago`;
};
export const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 16 ? 'Good afternoon' : 'Good evening';
};
export const firstName = name =>
  String(name).replace(/^(Er\.|Mr\.|Ms\.|Dr\.)\s*/i, '').trim().split(/\s+/)[0];
export const roleLabel = r => (ROLE_STYLE[r] || ROLE_STYLE.employee)[2];

// ---------- photos: smart adaptive compressor strictly targeting ~100 KB per photo ----------
export const fileToDataURL = (file, targetMaxKB = 100) => new Promise((resolve, reject) => {
  if (!file) return reject(new Error('No file chosen.'));
  if (file.size > 25 * 1024 * 1024) return reject(new Error('Photo is larger than 25 MB.'));

  const img = new Image();
  const url = URL.createObjectURL(file);

  img.onload = () => {
    URL.revokeObjectURL(url);
    let maxDim = 1080;
    let quality = 0.75;
    let dataUrl = '';

    // Smart multi-pass compressor to guarantee crisp visual clarity at ~100 KB
    for (let attempt = 0; attempt < 5; attempt++) {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * scale));
      c.height = Math.max(1, Math.round(img.height * scale));
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, c.width, c.height);

      dataUrl = c.toDataURL('image/jpeg', quality);
      const head = 'data:image/jpeg;base64,'.length;
      const bytes = Math.round((dataUrl.length - head) * 0.75);

      if (bytes <= (targetMaxKB + 15) * 1024 || attempt === 4) {
        break;
      }

      if (bytes > targetMaxKB * 1024 * 1.5) {
        maxDim = Math.round(maxDim * 0.85);
        quality = Math.max(0.55, quality - 0.08);
      } else {
        quality = Math.max(0.55, quality - 0.06);
      }
    }

    resolve(dataUrl);
  };

  img.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error('Could not read image file.'));
  };

  img.src = url;
});

// ---------- due-date badge ----------
export const dueMeta = (due, status) => {
  if (!due || status === 'done') return null;
  if (due === todayKey()) return { text: 'Due today', cls: 'due-today' };
  if (due < todayKey()) return { text: 'Overdue', cls: 'due-over' };
  return { text: 'Due ' + fmtDateKey(due), cls: 'due-ok' };
};
