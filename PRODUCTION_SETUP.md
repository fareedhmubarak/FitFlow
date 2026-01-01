# Production Database Setup Guide

## 🎯 Quick Setup

### Step 1: Get Production Database Credentials

1. Go to your Supabase Production Dashboard:
   - **URL**: https://supabase.com/dashboard/project/dbtdarmxvgbxeinwcxka
   - Navigate to: **Settings** → **API**

2. Copy the following:
   - **Project URL**: `https://dbtdarmxvgbxeinwcxka.supabase.co`
   - **anon/public key**: (The `anon` key, not the `service_role` key)

### Step 2: Create `.env` File

Create a `.env` file in the root directory with:

```env
VITE_SUPABASE_URL=https://dbtdarmxvgbxeinwcxka.supabase.co
VITE_SUPABASE_ANON_KEY=<paste_your_anon_key_here>
```

**⚠️ Important**: 
- The `.env` file is already in `.gitignore` (won't be committed)
- Never commit your actual keys to git
- Use the `anon` key, NOT the `service_role` key

### Step 3: Restart Development Server

After creating/updating `.env`:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

The app will now connect to the **production database**.

---

## 🔍 Verification Checklist

Before running with production, verify:

### ✅ Database Schema
- [ ] All required tables exist in production
- [ ] RLS policies are enabled
- [ ] Database functions are created
- [ ] Triggers are set up

### ✅ Authentication
- [ ] Auth is configured in Supabase
- [ ] Email providers are set up (if using email auth)
- [ ] Redirect URLs are configured

### ✅ Storage Buckets
- [ ] `images` or `member-photos` bucket exists
- [ ] Storage policies allow uploads
- [ ] CORS is configured

### ✅ Test Connection
- [ ] App loads without errors
- [ ] Can log in with production credentials
- [ ] Can view data from production database

---

## 🚨 Important Considerations

### 1. **Data Safety**
- ⚠️ **You're working with LIVE production data**
- Any changes will affect real users
- Consider using a test gym account first

### 2. **Development Mode Logging**
The app has API call logging enabled in development mode:
- Location: `src/lib/supabase.ts`
- Logs go to `gym_api_logs` table
- This will create logs in production database

### 3. **Caching**
- React Query caches data locally
- Clear cache if you see stale data
- Hard refresh browser (Ctrl+Shift+R)

### 4. **Multi-Tenant Isolation**
- All queries filter by `gym_id`
- Make sure you're logged in with correct gym account
- RLS policies enforce data isolation

---

## 🔄 Switching Back to Dev

To switch back to development database:

1. Update `.env`:
```env
VITE_SUPABASE_URL=https://qvszzwfvkvjxpkkiilyv.supabase.co
VITE_SUPABASE_ANON_KEY=<dev_anon_key>
```

2. Restart dev server

---

## 🛠️ Common Issues

### Issue: "Missing Supabase environment variables"
**Solution**: Make sure `.env` file exists in root directory and has both variables

### Issue: "Failed to fetch" or CORS errors
**Solution**: 
- Check Supabase dashboard → Settings → API → CORS settings
- Verify the URL in `.env` matches your project URL

### Issue: "Row Level Security policy violation"
**Solution**:
- Check RLS policies in Supabase dashboard
- Verify you're logged in with correct user
- Check `gym_users` table has your user linked to a gym

### Issue: Can't upload photos
**Solution**:
- Verify storage bucket exists
- Check storage policies allow uploads
- Verify bucket name matches code (`images` or `member-photos`)

---

## 📋 Pre-Production Checklist

Before making changes to production:

- [ ] Backup production data (if needed)
- [ ] Test changes in dev environment first
- [ ] Verify database schema matches expectations
- [ ] Check RLS policies are correct
- [ ] Test authentication flow
- [ ] Test critical paths (add member, record payment)
- [ ] Verify storage buckets are accessible
- [ ] Check error logging is working

---

## 🔐 Security Notes

1. **Never commit `.env` file** - Already in `.gitignore`
2. **Use `anon` key for client-side** - Never use `service_role` key in frontend
3. **RLS is your friend** - All queries are filtered by `gym_id`
4. **Audit logging** - Consider enabling for production changes

---

## 📞 Next Steps

After connecting to production:

1. **Test login** with production credentials
2. **Verify data** appears correctly
3. **Test critical operations**:
   - View dashboard
   - View members list
   - Add a test member (if safe)
   - Record a test payment (if safe)
4. **Check console** for any errors
5. **Review database** in Supabase dashboard

---

*Need help? Check the main `PROJECT_OVERVIEW.md` for architecture details.*


