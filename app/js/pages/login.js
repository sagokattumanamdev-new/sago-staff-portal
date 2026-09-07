// ============================================================
// LOGIN page — email/password + Google Sign-In button.
// ============================================================
import { DB } from '../db/adapter.js?v=073';
import { CONFIG } from '../config.js?v=073';
import { esc, toast, icon } from '../ui.js?v=073';
import { promptInstall, isStandalone } from '../pwa.js?v=073';

const G_SVG = `<svg class="ic" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.4 3.8l3.7 2.9c2.3-2.1 3.7-5.1 3.7-8.6z"/><path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.2 1.2-3.2 0-5.9-2.1-6.8-5.1L1.3 17.2C3.3 21.2 7.3 24 12 24z"/><path fill="#FBBC05" d="M5.2 14.3c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.3 6.8C.5 8.4 0 10.1 0 12s.5 3.6 1.3 5.2l3.9-2.9z"/><path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.3 0 3.3 2.8 1.3 6.8l3.9 2.9c.9-2.9 3.6-5 6.8-5z"/></svg>`;

export async function renderLogin(root) {
  const showInstall = !isStandalone();
  root.innerHTML = `
  <div class="login-wrap">
    <div class="login-card">
      <div class="brand">
        <img src="./assets/logo-hd.png" alt="SaGo logo" />
        <h1>${esc(CONFIG.appName)}</h1>
        <p>${esc(CONFIG.tagline)}</p>
      </div>

      ${showInstall ? `
      <button class="login-install-btn" id="loginInstallBtn" type="button">
        ${icon('download')} <span>Install SaGo Staff App</span>
      </button>` : ''}

      <form id="loginForm" autocomplete="off">
        <div class="field"><label>LOGIN ID / EMAIL</label>
          <input class="inp" id="email" type="text" placeholder="e.g. sago@sago.com or ragul@sagostaff" required /></div>
        <div class="field"><label>PASSWORD</label>
          <input class="inp" id="pass" type="password" placeholder="••••••••" required /></div>
        <div style="height:14px"></div>
        <button class="btn btn-primary" id="signBtn" type="submit">Sign in</button>
      </form>

      <div class="divider">OR</div>
      <button class="btn btn-google" id="googleBtn">${G_SVG}<span>Continue with Google</span></button>

      <div class="login-note" style="margin-top:18px">Authorized SaGo staff only.</div>
    </div>
  </div>`;

  root.querySelector('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = root.querySelector('#signBtn');
    btn.disabled = true; btn.textContent = 'Signing in…';
    const r = await DB.signInPassword(root.querySelector('#email').value, root.querySelector('#pass').value);
    btn.disabled = false; btn.textContent = 'Sign in';
    if (r.error) return toast(r.error);
    location.hash = '#/dashboard';
  });
  root.querySelector('#googleBtn').addEventListener('click', async () => {
    const r = await DB.signInGoogle();
    if (r?.error) toast(r.error);
  });
  root.querySelector('#loginInstallBtn')?.addEventListener('click', () => {
    promptInstall();
  });
}
