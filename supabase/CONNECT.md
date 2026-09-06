# Connect Supabase — step-by-step (5 minutes, free)

The app works TODAY in **demo mode** (data stays on one device).
Do this once and it becomes **live for everyone's phone**:

## 1. Create the project
1. Go to **https://supabase.com** → *Start your project* → sign in with GitHub or Google
2. **New project** → name: `sago` → database password: keep it safe → region: **Mumbai** (closest to TN) → Create
3. Wait ~2 minutes while it provisions

## 2. Copy the keys
- In your project: **Project Settings (⚙️) → API**
- Copy **Project URL** and **anon public** key

## 3. Paste them
Open `app/js/config.js` and fill:
```js
supabase: {
  url: 'https://xxxx.supabase.co',
  anonKey: 'eyJ...'
}
```
The app now shows **🟢 LIVE** on the login screen.

## 4. Tell me
I'll run the database setup (tables, row-level security, history triggers)
and switch the data layer from demo → cloud. File `schema.sql` will live here.

## 5. Google Sign-In (last step)
- Google Cloud Console → OAuth client → add to Supabase **Authentication → Providers → Google**
- I'll guide you screen-by-screen when we reach it.

---
*Why Supabase: free tier is generous, dashboard is easy, and Google sign-in is built in.*
