// ============================================================
// BOOT + tiny hash router with auth guard
// ============================================================
import { DB } from './db/adapter.js?v=073';
import { renderLogin } from './pages/login.js?v=073';
import { renderDashboard } from './pages/dash.js?v=073';
import { initPWA } from './pwa.js?v=073';

initPWA();

const root = document.getElementById('app');
let splashHidden = false;

function hideSplash() {
  if (splashHidden) return;
  splashHidden = true;
  const s = document.getElementById('splash');
  if (!s) return;
  s.classList.add('done');
  setTimeout(() => s.remove(), 400);
}

import { toast } from './ui.js?v=073';

async function route() {
  const user = await DB.currentUser();
  if (!user || user.unauthorized) {
    if (user?.unauthorized) {
      toast(`Access Denied: ${user.email} is not authorized. Please contact your Admin.`);
    }
    if (location.hash !== '#/login') location.hash = '#/login';
    await renderLogin(root);
  } else {
    if (location.hash === '#/login' || !location.hash) location.hash = '#/dashboard';
    await renderDashboard(root, user);
  }
  hideSplash();
}

window.addEventListener('hashchange', route);
route();
