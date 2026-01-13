# Admin Dashboard Access Troubleshooting

## 307 Redirect Issue

If you're seeing a `307 Temporary Redirect` when accessing `/admin/dashboard`, the middleware is blocking access. Here's how to diagnose and fix it.

## Common Causes

### 1. Not Logged In

**Symptom**: Redirects to `/login`

**Solution**:
1. Visit: `https://goat-sales-app-82e296b21c05.herokuapp.com/login`
2. Log in with your credentials
3. Try accessing the dashboard again

### 2. Not Marked as Admin

**Symptom**: Redirects to `/` (home page)

**Check Admin Status**:
```bash
npx tsx scripts/check-user-status.ts
```

**Fix**: If `is_admin` is `false`, run:
```bash
npx tsx scripts/verify-and-promote-user.ts
```

This will:
- Verify your email
- Set `is_admin = true`
- Set `onboarding_completed = true`

### 3. Authentication Cookie Issues

**Symptom**: Middleware can't find access token

**Check**:
1. Open browser DevTools → Application → Cookies
2. Look for cookies starting with `sb-` (Supabase auth cookies)
3. Should see: `sb-<project-ref>-auth-token`

**Fix**:
- Clear cookies and log in again
- Or check if Supabase URL is correct in Heroku config

## Diagnostic Steps

### Step 1: Check Your Admin Status

```bash
npx tsx scripts/check-user-status.ts
```

Expected output:
```
✅ User found: joel.schrock@presidentialdigs.com
✅ is_admin: true
✅ onboarding_completed: true
```

### Step 2: Check Middleware Logs

```bash
heroku logs --tail -a goat-sales-app | grep -i middleware
```

Look for:
- `"Middleware: No access token found"` → Not logged in
- `"Middleware: User is not admin"` → Admin flag is false
- `"Middleware: Admin access granted"` → Should work!

### Step 3: Verify Authentication

1. Visit the app: `https://goat-sales-app-82e296b21c05.herokuapp.com/`
2. Check if you're logged in (should see your name/profile)
3. If not logged in, go to `/login` and sign in

### Step 4: Check Environment Variables

```bash
heroku config:get NEXT_PUBLIC_SUPABASE_URL -a goat-sales-app
heroku config:get NEXT_PUBLIC_SUPABASE_ANON_KEY -a goat-sales-app
```

Both should be set and point to your Supabase project.

## Quick Fixes

### Fix 1: Promote User to Admin

```bash
npx tsx scripts/verify-and-promote-user.ts
```

### Fix 2: Clear Browser Cookies

1. Open DevTools (F12)
2. Application → Cookies
3. Delete all cookies for the domain
4. Refresh and log in again

### Fix 3: Check Supabase Profile

In Supabase Dashboard:
1. Go to Table Editor → `profiles`
2. Find your user by email
3. Verify `is_admin = true`
4. If false, update it manually

## Understanding the Redirect

The middleware checks:
1. ✅ Is there an access token? (cookie or header)
2. ✅ Is the token valid? (Supabase auth check)
3. ✅ Does the user have a profile?
4. ✅ Is `is_admin = true`?

If any step fails, it redirects:
- No token → `/login` (308 redirect)
- Not admin → `/` (308 redirect)
- Auth error → `/login` (308 redirect)

## Testing Admin Access

After fixing, test with:

```bash
# Check status
npx tsx scripts/check-user-status.ts

# Try accessing dashboard
curl -I https://goat-sales-app-82e296b21c05.herokuapp.com/admin/dashboard
```

Should return `200 OK` (not 307/308).

## Still Having Issues?

1. **Check Heroku logs**:
   ```bash
   heroku logs --tail -a goat-sales-app | grep -E "middleware|admin|auth" -i
   ```

2. **Verify Supabase connection**:
   - Check if Supabase project is accessible
   - Verify environment variables are correct

3. **Test authentication**:
   - Try logging out and back in
   - Clear browser cache and cookies

4. **Check RLS policies**:
   - In Supabase, verify `profiles` table RLS allows reading
   - Service role should bypass RLS

## Summary

**Most Common Fix**:
```bash
npx tsx scripts/verify-and-promote-user.ts
```

This will ensure your user is:
- ✅ Email verified
- ✅ Marked as admin
- ✅ Onboarding completed

Then log out and log back in, and the dashboard should work!
