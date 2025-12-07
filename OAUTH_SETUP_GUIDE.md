# 🔐 Social Login OAuth Configuration Guide

This guide explains how to set up Google, Facebook, and Instagram OAuth providers for FitFlow authentication.

## 📋 Prerequisites

1. Access to Supabase Dashboard: https://supabase.com/dashboard
2. Your Supabase Project: **GymDev** (ID: `qvszzwfvkvjxpkkiilyv`)
3. Developer accounts on Google, Facebook

---

## 🌐 Redirect URL (Required for All Providers)

```
https://qvszzwfvkvjxpkkiilyv.supabase.co/auth/v1/callback
```

**Copy this URL** - you'll need it for all OAuth provider configurations.

---

## 1️⃣ Google OAuth Setup

### Step 1: Go to Google Cloud Console
1. Visit: https://console.cloud.google.com/
2. Sign in with your Google account

### Step 2: Create or Select a Project
1. Click the project dropdown at the top
2. Click "New Project" or select existing one
3. Name it "FitFlow" or similar

### Step 3: Enable Google+ API
1. Go to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click "Enable"

### Step 4: Configure OAuth Consent Screen
1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "External" user type
3. Fill in required fields:
   - App name: `FitFlow`
   - User support email: Your email
   - Developer contact: Your email
4. Click "Save and Continue"
5. Add scopes: `email`, `profile`, `openid`
6. Complete the wizard

### Step 5: Create OAuth Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: **Web application**
4. Name: `FitFlow Web`
5. **Authorized JavaScript origins:**
   ```
   http://localhost:5173
   https://your-production-domain.com
   ```
6. **Authorized redirect URIs:**
   ```
   https://qvszzwfvkvjxpkkiilyv.supabase.co/auth/v1/callback
   ```
7. Click "Create"
8. **Copy the Client ID and Client Secret**

### Step 6: Add to Supabase
1. Go to Supabase Dashboard → Your Project
2. Navigate to "Authentication" → "Providers"
3. Find "Google" and enable it
4. Paste:
   - **Client ID**: (from Google)
   - **Client Secret**: (from Google)
5. Save

---

## 2️⃣ Facebook OAuth Setup

### Step 1: Go to Facebook Developers
1. Visit: https://developers.facebook.com/
2. Log in with your Facebook account

### Step 2: Create an App
1. Click "My Apps" → "Create App"
2. Select "Consumer" or "Business"
3. App name: `FitFlow`
4. App contact email: Your email
5. Click "Create App"

### Step 3: Add Facebook Login
1. In your app dashboard, find "Add a Product"
2. Click "Set Up" on "Facebook Login"
3. Choose "Web"

### Step 4: Configure Settings
1. Go to "Facebook Login" → "Settings"
2. **Valid OAuth Redirect URIs:**
   ```
   https://qvszzwfvkvjxpkkiilyv.supabase.co/auth/v1/callback
   ```
3. Enable "Login with Facebook" toggle
4. Save Changes

### Step 5: Get App Credentials
1. Go to "Settings" → "Basic"
2. **Copy the App ID**
3. Click "Show" next to App Secret and **copy it**

### Step 6: Add to Supabase
1. Go to Supabase Dashboard → Your Project
2. Navigate to "Authentication" → "Providers"
3. Find "Facebook" and enable it
4. Paste:
   - **App ID**: (from Facebook)
   - **App Secret**: (from Facebook)
5. Save

---

## 3️⃣ Instagram OAuth Setup

> **Note:** Instagram login uses Facebook OAuth with Instagram permissions. The same Facebook app can be used.

### Step 1: Add Instagram Basic Display
1. In Facebook Developers → Your App
2. Click "Add Product"
3. Find "Instagram Basic Display" → Click "Set Up"

### Step 2: Configure Instagram
1. Go to "Instagram Basic Display" → "Basic Display"
2. Add **OAuth Redirect URI:**
   ```
   https://qvszzwfvkvjxpkkiilyv.supabase.co/auth/v1/callback
   ```
3. Add **Deauthorize Callback URL:** (same URL)
4. Add **Data Deletion Request URL:** (same URL)

### Step 3: Add Instagram Testers
1. Go to "Roles" → "Roles"
2. Add Instagram testers (your Instagram account)
3. Accept the tester invite on Instagram app

> **Important:** Instagram Basic Display is being deprecated. For production, consider using Instagram Graph API through Facebook Login.

---

## 4️⃣ Supabase Email Verification Settings

### Enable Email Verification
1. Go to Supabase Dashboard → Authentication → Settings
2. Under "Email Auth":
   - Enable "Confirm email"
   - Set "Mailer OTP Expiration": 3600 (1 hour)

### Configure Email Templates
1. Go to "Authentication" → "Email Templates"
2. Customize the verification email template
3. Update:
   - Subject: `Verify your FitFlow account`
   - Body: Include your branding

### Set Redirect URLs
1. Go to "Authentication" → "URL Configuration"
2. Set **Site URL:**
   ```
   http://localhost:5173
   ```
3. Set **Redirect URLs:**
   ```
   http://localhost:5173/auth/callback
   http://localhost:5173/auth/verify
   https://your-production-domain.com/auth/callback
   https://your-production-domain.com/auth/verify
   ```

---

## 🧪 Testing the Authentication

### Test Manual Signup
1. Go to http://localhost:5173/signup
2. Fill in: Full Name, Gym Name, Email, Password
3. Click "Sign Up"
4. Check email for verification link
5. Click link → Should redirect to `/auth/verify`
6. Complete gym onboarding

### Test Google Login
1. Go to http://localhost:5173/login
2. Click Google button
3. Select Google account
4. Should redirect to `/auth/callback`
5. If new user → Redirect to `/onboarding`
6. If existing user → Redirect to `/dashboard`

### Test Facebook Login
1. Go to http://localhost:5173/login
2. Click Facebook button
3. Authorize app
4. Should follow same flow as Google

---

## 🔧 Troubleshooting

### "Invalid redirect URI" Error
- Verify the redirect URI matches exactly in both provider console and Supabase
- No trailing slashes
- HTTPS for production

### "OAuth callback error"
- Check browser console for details
- Verify Client ID/Secret are correct
- Ensure provider is enabled in Supabase

### Email not received
- Check spam folder
- Verify email settings in Supabase
- Check Supabase logs for email errors

### "User already registered" Error
- User exists with different auth method
- Link accounts or use existing method

---

## 📱 PWA Considerations

For Progressive Web App deployment:

1. **Add to Manifest:**
```json
{
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait"
}
```

2. **Handle Deep Links:**
- iOS: Universal Links
- Android: App Links

3. **Auth State Persistence:**
- Already handled by Supabase's session management
- Works offline with cached session

---

## ✅ Configuration Checklist

- [ ] Google OAuth credentials created
- [ ] Google provider enabled in Supabase
- [ ] Facebook App created
- [ ] Facebook Login configured
- [ ] Facebook provider enabled in Supabase
- [ ] Email verification enabled
- [ ] Redirect URLs configured
- [ ] Email templates customized
- [ ] Tested all login methods

---

## 📞 Support URLs

- **Google Cloud Console:** https://console.cloud.google.com/
- **Facebook Developers:** https://developers.facebook.com/
- **Supabase Dashboard:** https://supabase.com/dashboard/project/qvszzwfvkvjxpkkiilyv/auth/providers
- **Supabase Auth Docs:** https://supabase.com/docs/guides/auth
