# Login Cookie Issue - No Cookies After Login

## Problem
After logging in, no authentication cookies are being set, causing the middleware to redirect back to `/login`.

## Root Cause
The 308 (permanent) redirect was being cached by the browser, preventing access even after login. Additionally, cookies may not be set due to:
1. Domain mismatch
2. SameSite cookie settings
3. Secure cookie requirements on HTTPS

## Solution Applied

### 1. Changed All Redirects to 307 (Temporary)
- Changed all `308` redirects to `307` in middleware
- Added `Cache-Control: no-store` headers to prevent redirect caching
- This allows the browser to retry after login

### 2. Clear Browser Cache
**IMPORTANT**: You must clear your browser cache because the 308 redirect was cached:

1. **Chrome/Edge**:
   - Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
   - Select "Cached images and files"
   - Time range: "All time"
   - Click "Clear data"

2. **Or use Incognito/Private Window**:
   - This bypasses cache entirely
   - `Ctrl+Shift+N` (Windows) or `Cmd+Shift+N` (Mac)

3. **Or Hard Refresh**:
   - `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)

### 3. Verify Login Flow

1. **Clear cache** (see above)
2. **Visit**: `https://goat-sales-app-82e296b21c05.herokuapp.com/login`
3. **Log in** with your credentials
4. **Check cookies** in DevTools:
   - Press `F12` → Application → Cookies
   - Look for: `sb-cwnvhhzzcjzhcaozazji-auth-token`
   - Should contain JSON with `access_token`

### 4. If Cookies Still Not Set

Check Supabase configuration:

```bash
# Verify environment variables
heroku config:get NEXT_PUBLIC_SUPABASE_URL -a goat-sales-app
heroku config:get NEXT_PUBLIC_SUPABASE_ANON_KEY -a goat-sales-app
```

Both should be set and point to your Supabase project.

### 5. Check Browser Console

After login attempt, check browser console (F12) for:
- Cookie errors
- CORS errors
- Network errors

## Expected Behavior After Fix

1. Visit `/admin/dashboard` → Redirects to `/login` (307, not cached)
2. Log in → Cookies are set
3. Visit `/admin/dashboard` again → Should work!

## Testing

```bash
# Test login endpoint
curl -X POST https://goat-sales-app-82e296b21c05.herokuapp.com/api/auth/callback \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}'
```

## Still Having Issues?

1. **Check Heroku logs**:
   ```bash
   heroku logs --tail -a goat-sales-app | grep -i "middleware\|cookie\|auth"
   ```

2. **Verify Supabase Auth is enabled**:
   - Go to Supabase Dashboard → Authentication
   - Ensure email/password is enabled

3. **Check cookie domain**:
   - Cookies should be set for: `goat-sales-app-82e296b21c05.herokuapp.com`
   - Not for: `herokuapp.com` (too broad)

4. **Try different browser**:
   - Sometimes browser extensions block cookies

## Summary

**Key Fix**: Changed 308 → 307 redirects and added cache-control headers.

**Action Required**: Clear browser cache or use incognito window, then try logging in again.
