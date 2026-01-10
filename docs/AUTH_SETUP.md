# Authentication & Admin Invitation Setup Guide

This guide explains how to set up secure authentication and admin-only invitation system for the Sales Goat App.

## Overview

The app uses **Supabase Auth** for user authentication with automatic profile creation via database triggers. Admins can invite team members through a secure invitation system.

## Database Setup

### 1. Run the Profile Trigger Migration

The migration `20240101000012_create_profile_trigger.sql` creates:
- A trigger function that automatically creates a profile when a user confirms their email
- Two triggers:
  - `on_auth_user_created`: Fires when a new user is created (if email is already confirmed)
  - `on_auth_user_email_confirmed`: Fires when a user confirms their email

**To apply:**
```bash
# In Supabase Dashboard → SQL Editor, or via CLI:
supabase migration up
```

### 2. Verify Profile Table Structure

Ensure your `profiles` table has:
- `id UUID PRIMARY KEY REFERENCES auth.users(id)`
- `is_admin BOOLEAN DEFAULT FALSE`
- `email TEXT`
- `name TEXT`
- Other fields: `gauntlet_level`, `gauntlet_progress`, `xp`, etc.

## Authentication Flow

### User Sign Up
1. User visits `/login` and clicks "Sign up"
2. Enters email and password (min 6 characters)
3. Supabase sends confirmation email
4. User clicks confirmation link
5. Database trigger automatically creates profile in `profiles` table
6. User is redirected to home page

### User Sign In
1. User visits `/login` and enters credentials
2. Supabase validates credentials
3. Session is established
4. User is redirected to home page
5. `AuthContext` fetches profile data including `is_admin` status

### Protected Routes
- `/admin/*`: Requires authentication AND `is_admin: true`
- `/api/admin/*`: Requires authentication AND `is_admin: true`
- Home page (`/`): Requires authentication (redirects to `/login` if not authenticated)

## Admin Invitation System

### How It Works

1. **Admin Access**: Only users with `is_admin: true` in the `profiles` table can access:
   - `/admin/dashboard`
   - `/api/admin/invite`

2. **Invitation Process**:
   - Admin goes to `/admin/dashboard`
   - Scrolls to "Invite Team Member" section
   - Enters email address
   - Clicks "Invite"
   - System sends invitation email via Supabase `inviteUserByEmail()`
   - Invited user receives email with sign-up link

3. **Security**:
   - API route `/api/admin/invite` checks:
     - User is authenticated (valid Supabase session)
     - User has `is_admin: true` in profiles table
   - Returns 403 Forbidden if not admin
   - Logs all invitation attempts for audit trail

### Setting Up Your First Admin

Since the system requires an admin to invite others, you need to manually set the first admin:

**Option 1: Via Supabase Dashboard**
```sql
-- Replace 'user-email@example.com' with your email
UPDATE profiles 
SET is_admin = TRUE 
WHERE email = 'user-email@example.com';
```

**Option 2: Via Supabase SQL Editor**
1. Go to Supabase Dashboard → SQL Editor
2. Run:
```sql
-- Find your user ID first
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Then update the profile
UPDATE profiles 
SET is_admin = TRUE 
WHERE id = 'your-user-id-here';
```

## User Context Updates

All API routes now use authenticated `user.id` instead of mock IDs:

- **Call Recordings**: `user_id` is set from authenticated session
- **Rebuttal Sharing**: Uses authenticated user (no need to pass userId)
- **Gauntlet Evaluation**: Uses authenticated user
- **XP Awarding**: Uses authenticated user
- **Badge Unlocking**: Uses authenticated user

## Middleware Protection

The `src/middleware.ts` file protects:

1. **Admin Routes** (`/admin/*`):
   - Checks for valid Supabase session
   - Verifies `is_admin: true`
   - Redirects to `/login` if not authenticated
   - Redirects to `/` if authenticated but not admin

2. **Admin API Routes** (`/api/admin/*`):
   - Same checks as admin routes
   - Returns 401/403 JSON responses instead of redirects

3. **Cron Routes** (`/api/cron/*`):
   - Protected with `CRON_SECRET` Bearer token

## Testing the System

### 1. Test User Sign Up
```bash
# Visit http://localhost:3000/login
# Click "Sign up"
# Enter email and password
# Check email for confirmation link
# Click link to confirm
# Should redirect to home page
```

### 2. Test Admin Access
```bash
# 1. Set yourself as admin (see "Setting Up Your First Admin")
# 2. Log in
# 3. Visit /admin/dashboard
# 4. Should see "Invite Team Member" section
```

### 3. Test Invitation
```bash
# 1. As admin, go to /admin/dashboard
# 2. Enter a test email in "Invite Team Member"
# 3. Click "Invite"
# 4. Check email for invitation
# 5. Click invitation link
# 6. Complete sign-up
# 7. New user should be created with is_admin: false
```

### 4. Test Protected Routes
```bash
# Try accessing /admin/dashboard without being logged in
# Should redirect to /login

# Try accessing /admin/dashboard as non-admin
# Should redirect to home page
```

## Troubleshooting

### "Profile not found" errors
- **Cause**: Database trigger didn't fire or user confirmed email before trigger was set up
- **Fix**: Manually create profile:
```sql
INSERT INTO profiles (id, email, name, is_admin)
VALUES (
  'user-id-from-auth.users',
  'user@example.com',
  'User Name',
  FALSE
);
```

### "Unauthorized" errors on API routes
- **Cause**: Session expired or invalid
- **Fix**: Sign out and sign back in

### Invitation emails not sending
- **Cause**: Supabase email settings not configured
- **Fix**: 
  1. Go to Supabase Dashboard → Authentication → Settings
  2. Configure SMTP settings or use Supabase's built-in email service
  3. Verify email templates are set up

### Admin badge not showing
- **Cause**: `is_admin` not set in database
- **Fix**: Update profile manually (see "Setting Up Your First Admin")

## Security Notes

1. ✅ **Session Management**: All sessions managed by Supabase Auth
2. ✅ **Admin Checks**: Double-checked in both middleware and API routes
3. ✅ **User Isolation**: Users can only see their own calls/data (RLS policies)
4. ✅ **Audit Logging**: All admin actions (invitations) are logged
5. ✅ **Protected Routes**: Middleware enforces authentication before page load

## Next Steps

1. Set up your first admin user
2. Configure Supabase email settings for invitations
3. Test the full authentication flow
4. Invite your team members
5. Monitor logs for any security issues
