# Middleware Cookie Debugging Guide

## Issue
Middleware is not finding authentication cookies, causing redirects to `/login` even when user is logged in.

## Root Cause
Supabase stores authentication in cookies with the pattern `sb-<project-ref>-auth-token`. The middleware needs to:
1. Extract the project ref from `NEXT_PUBLIC_SUPABASE_URL`
2. Look for the cookie with that exact name
3. Parse the JSON-encoded session data
4. Extract the `access_token` from the session

## Cookie Format
Supabase stores session data as a JSON string in the cookie:
```json
{
  "access_token": "eyJhbGci...",
  "refresh_token": "...",
  "expires_at": 1234567890,
  ...
}
```

## Debugging Steps

### 1. Check What Cookies Are Available
After deployment, check Heroku logs:
```bash
heroku logs --tail -a goat-sales-app | grep -i "middleware\|cookie"
```

Look for:
- `"Middleware: No access token found. Available cookies: [...]"`
- `"Middleware: Looking for cookie: sb-..."`

### 2. Verify Cookie Name
The cookie name is built from your Supabase URL:
```bash
heroku config:get NEXT_PUBLIC_SUPABASE_URL -a goat-sales-app
```

If URL is `https://cwnvhhzzcjzhcaozazji.supabase.co`, then:
- Project ref: `cwnvhhzzcjzhcaozazji`
- Cookie name: `sb-cwnvhhzzcjzhcaozazji-auth-token`

### 3. Check Browser Cookies
1. Open DevTools (F12) → Application → Cookies
2. Look for cookies starting with `sb-`
3. Verify the cookie name matches the expected pattern
4. Check if the cookie value is a JSON string

### 4. Test Direct Navigation
Try navigating directly to the dashboard:
```
https://goat-sales-app-82e296b21c05.herokuapp.com/admin/dashboard
```

Check the response:
- If it redirects to `/login` → Middleware can't find cookies
- If it shows the dashboard → Cookies are working

### 5. Check Cookie Domain/Path
Cookies must be set for the correct domain:
- Domain: `goat-sales-app-82e296b21c05.herokuapp.com` (or `.herokuapp.com`)
- Path: `/` (root)
- Secure: `true` (for HTTPS)
- SameSite: `lax` or `none`

## Common Issues

### Issue 1: Cookie Not Set After Login
**Symptom**: No `sb-*` cookies in browser after logging in.

**Solution**: 
- Check Supabase client configuration in `src/lib/supabase.ts`
- Ensure `persistSession: true` is set
- Check browser console for cookie errors

### Issue 2: Cookie Name Mismatch
**Symptom**: Cookies exist but middleware can't find them.

**Solution**:
- Verify `NEXT_PUBLIC_SUPABASE_URL` matches your Supabase project
- Check that project ref extraction is correct
- Look at middleware logs to see what cookie name it's looking for

### Issue 3: Cookie Value Format
**Symptom**: Cookie found but `access_token` extraction fails.

**Solution**:
- Cookie value should be URL-encoded JSON
- Use `decodeURIComponent()` before parsing
- Check for `access_token` or `accessToken` in the parsed object

## Testing

### Test Cookie Reading
```bash
# Check what cookies middleware sees
heroku logs --tail -a goat-sales-app | grep "Available cookies"
```

### Test Authentication
```bash
# Try accessing dashboard (should show cookies in logs)
curl -v "https://goat-sales-app-82e296b21c05.herokuapp.com/admin/dashboard" \
  -H "Cookie: sb-cwnvhhzzcjzhcaozazji-auth-token=..."
```

## Fix Applied

The middleware now:
1. Uses the same cookie reading logic as `getUserFromRequest` (which works in API routes)
2. Tries multiple cookie name patterns
3. Falls back to regex matching if direct lookup fails
4. Logs all available cookies when access token is not found

This should make cookie reading more robust and provide better debugging information.
