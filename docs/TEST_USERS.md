# 🧪 Test Users Reference

This document lists all test users created by the seed script for local development and testing.

## 🔐 Login Credentials

**All test users use the same password:** `testpassword123`

**Login URL:** http://localhost:3000/login

---

## 👥 User List

### 1. Sarah Johnson (Admin)
- **Email:** `sarah.johnson@test.com`
- **Password:** `testpassword123`
- **Role:** Admin
- **Gauntlet Level:** 5
- **Experience Points:** 2,500
- **Training Path:** Acquisitions
- **Onboarding:** Completed ✅

**Use Cases:**
- Testing admin dashboard features
- User management (invite, revoke)
- Training analytics reports
- Admin-only routes

---

### 2. Mike Chen (User)
- **Email:** `mike.chen@test.com`
- **Password:** `testpassword123`
- **Role:** User
- **Gauntlet Level:** 4
- **Experience Points:** 1,800
- **Training Path:** Acquisitions
- **Onboarding:** Completed ✅

**Use Cases:**
- Testing user-facing features
- Acquisitions gauntlet training
- Call history and debrief
- Leaderboard visibility

---

### 3. Emma Rodriguez (User)
- **Email:** `emma.rodriguez@test.com`
- **Password:** `testpassword123`
- **Role:** User
- **Gauntlet Level:** 5
- **Experience Points:** 3,200
- **Training Path:** Dispositions
- **Onboarding:** Completed ✅

**Use Cases:**
- Testing Dispositions training path
- High-level user experience
- Dispo-specific script segments
- Advanced gauntlet levels

---

### 4. David Kim (User)
- **Email:** `david.kim@test.com`
- **Password:** `testpassword123`
- **Role:** User
- **Gauntlet Level:** 2
- **Experience Points:** 950
- **Training Path:** Acquisitions
- **Onboarding:** Completed ✅

**Use Cases:**
- Testing beginner user experience
- Lower-level gauntlet progression
- Onboarding flow (if reset)
- Early-stage training features

---

### 5. Lisa Thompson (User)
- **Email:** `lisa.thompson@test.com`
- **Password:** `testpassword123`
- **Role:** User
- **Gauntlet Level:** 5
- **Experience Points:** 4,200
- **Training Path:** Dispositions
- **Onboarding:** Completed ✅

**Use Cases:**
- Testing top performer experience
- Maximum XP scenarios
- Dispositions advanced features
- Leaderboard top positions

---

## 📊 User Statistics Summary

| User | Level | XP | Path | Admin | Use Case |
|------|-------|----|----|-------|----------|
| Sarah Johnson | 5 | 2,500 | Acquisitions | ✅ | Admin testing |
| Mike Chen | 4 | 1,800 | Acquisitions | ❌ | Mid-level user |
| Emma Rodriguez | 5 | 3,200 | Dispositions | ❌ | Dispo expert |
| David Kim | 2 | 950 | Acquisitions | ❌ | Beginner |
| Lisa Thompson | 5 | 4,200 | Dispositions | ❌ | Top performer |

---

## 🎯 Testing Scenarios

### Admin Testing
- **User:** `sarah.johnson@test.com`
- **Features to Test:**
  - Admin dashboard access
  - User invitation system
  - Training analytics reports
  - User management (revoke access)
  - Cron job endpoints

### Acquisitions Path Testing
- **Users:** `mike.chen@test.com`, `david.kim@test.com`
- **Features to Test:**
  - Acquisitions gauntlet levels
  - Script adherence tracking
  - Call grading for acquisitions
  - Logic gates (5 gates)

### Dispositions Path Testing
- **Users:** `emma.rodriguez@test.com`, `lisa.thompson@test.com`
- **Features to Test:**
  - Dispositions gauntlet levels
  - Dispo script segments
  - Dispo-specific AI personas
  - Dispo call grading

### Beginner Experience
- **User:** `david.kim@test.com`
- **Features to Test:**
  - Onboarding flow
  - Lower gauntlet levels
  - XP progression
  - Badge unlocking

### Advanced User Experience
- **Users:** `emma.rodriguez@test.com`, `lisa.thompson@test.com`
- **Features to Test:**
  - High-level gauntlet challenges
  - Leaderboard rankings
  - Advanced analytics
  - Top performer features

---

## 🔄 Resetting Test Users

To reset all test users and data:

```bash
npm run db:reset
```

This will:
1. Drop all tables
2. Reapply all migrations
3. Recreate all test users
4. Reseed all data

---

## 📝 Notes

- All users have completed onboarding
- All users have associated call records (created during seeding)
- Users are distributed across both training paths (Acquisitions and Dispositions)
- XP and levels vary to test different user states
- One admin user (Sarah) for testing admin features

---

## 🚨 Security Reminder

**⚠️ These credentials are for LOCAL DEVELOPMENT ONLY**

- Never use these credentials in production
- Never commit `.env.production` with real credentials
- Change all passwords before deploying to production
- Use strong, unique passwords for production users

---

## 📚 Related Documentation

- [Local Development Setup](./LOCAL_DEVELOPMENT.md)
- [Deployment Checklist](../DEPLOYMENT_CHECKLIST.md)
- [Security Audit](./SECURITY_AUDIT.md)
