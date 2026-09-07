// ============================================================
// PWA Installation & Service Worker Manager
// Supports Android (Chrome), Desktop (Chrome/Edge), and iOS (Safari)
// ============================================================
import { openSheet, toast, icon } from './ui.js?v=073';

let deferredPrompt = null;
const listeners = new Set();

export function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://')
  );
}

export function isIOS() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function onInstallAvailabilityChange(callback) {
  listeners.add(callback);
  callback(Boolean(deferredPrompt || isIOS()), isStandalone());
  return () => listeners.delete(callback);
}

function notifyListeners() {
  const available = Boolean(deferredPrompt || isIOS());
  const standalone = isStandalone();
  for (const cb of listeners) {
    try { cb(available, standalone); } catch (e) {}
  }
}

// Register service worker and capture install event
export function initPWA() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.warn('Service worker registration failed:', err);
    });
  }

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    notifyListeners();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    toast('🎉 SaGo Staff Portal installed successfully!');
    notifyListeners();
  });
}

// Main install trigger
export async function promptInstall() {
  if (isStandalone()) {
    toast('App is already installed and running in standalone mode.');
    return;
  }

  if (deferredPrompt) {
    try {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        toast('Installing SaGo Staff Portal…');
      }
      deferredPrompt = null;
      notifyListeners();
      return;
    } catch (err) {
      console.warn('Install prompt error:', err);
    }
  }

  // Fallback for iOS / Safari / Manual instructions
  if (isIOS()) {
    showIOSInstallSheet();
  } else {
    showManualInstallSheet();
  }
}

function showIOSInstallSheet() {
  openSheet(`
    <div style="text-align:center;padding:6px 0">
      <div style="font-size:38px;margin-bottom:6px">📲</div>
      <h3 style="margin:0 0 6px">Install SaGo App on iPhone / iPad</h3>
      <p class="muted small" style="margin:0 0 16px">Install the app for 1-tap access and full-screen experience</p>
    </div>

    <div class="card" style="background:#F3F7F5;border:1.5px solid var(--green);margin:0 0 16px;display:flex;flex-direction:column;gap:12px;font-size:13px">
      <div style="display:flex;align-items:center;gap:12px">
        <span style="width:26px;height:26px;border-radius:50%;background:var(--green);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;flex:none">1</span>
        <div>Tap the <b>Share</b> button <span style="display:inline-block;padding:2px 6px;background:#fff;border-radius:6px;border:1px solid #ccc;font-weight:700">⎋ Share</span> at the bottom of Safari.</div>
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        <span style="width:26px;height:26px;border-radius:50%;background:var(--green);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;flex:none">2</span>
        <div>Scroll down and tap <span style="display:inline-block;padding:2px 6px;background:#fff;border-radius:6px;border:1px solid #ccc;font-weight:700">➕ Add to Home Screen</span>.</div>
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        <span style="width:26px;height:26px;border-radius:50%;background:var(--green);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;flex:none">3</span>
        <div>Tap <b>Add</b> in the top right corner. That's it!</div>
      </div>
    </div>

    <button class="btn btn-primary" onclick="this.closest('.overlay').remove()">Got it</button>
  `);
}

function showManualInstallSheet() {
  openSheet(`
    <div style="text-align:center;padding:6px 0">
      <div style="font-size:38px;margin-bottom:6px">📲</div>
      <h3 style="margin:0 0 6px">Install SaGo App</h3>
      <p class="muted small" style="margin:0 0 16px">Add SaGo Staff Portal directly to your device home screen</p>
    </div>

    <div class="card" style="background:#F3F7F5;border:1.5px solid var(--green);margin:0 0 16px;display:flex;flex-direction:column;gap:12px;font-size:13px">
      <div style="display:flex;align-items:center;gap:12px">
        <span style="width:26px;height:26px;border-radius:50%;background:var(--green);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;flex:none">1</span>
        <div>Tap the browser menu <span style="display:inline-block;padding:2px 6px;background:#fff;border-radius:6px;border:1px solid #ccc;font-weight:700">⋮ (three dots)</span> or address bar.</div>
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        <span style="width:26px;height:26px;border-radius:50%;background:var(--green);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;flex:none">2</span>
        <div>Select <b>Install App</b> or <b>Add to Home Screen</b>.</div>
      </div>
    </div>

    <button class="btn btn-primary" onclick="this.closest('.overlay').remove()">Got it</button>
  `);
}

export function createInstallButtonHTML(className = 'hdr-install-btn', label = 'Install App') {
  if (isStandalone()) return '';
  return `
    <button class="${className}" id="installAppBtn" title="Install SaGo App on your device">
      ${icon('download')}
      <span>${label}</span>
    </button>
  `;
}

export function bindInstallButton(root) {
  const btn = root.querySelector('#installAppBtn');
  if (btn) {
    btn.addEventListener('click', () => promptInstall());
  }
}
