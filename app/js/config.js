// ============================================================
// SaGo Staff Portal — central configuration
// To GO LIVE: create a free project at https://supabase.com,
// then paste the Project URL + anon key below. That's it —
// the app switches from demo mode to the real database.
// (Full guide: /supabase/CONNECT.md)
// ============================================================
export const CONFIG = {
  appName: 'SaGo Staff Portal',
  company: 'SaGo',
  tagline: 'For unlocking your Dream House',
  defaultCountryCode: '91',
  departments: ['Construction', 'SaGo Showroom'],
  supabase: {
    url: 'https://yrnbftrhcugmddigiecr.supabase.co',
    anonKey: 'sb_publishable_KX3nUbWVzoXDVqgo8Io4Ng_R_9hkHwQ'
  },
  demoPass: 'sago123'   // demo-mode password for every account
};

export const isSupabaseConfigured = () =>
  Boolean(CONFIG.supabase.url && CONFIG.supabase.anonKey);
