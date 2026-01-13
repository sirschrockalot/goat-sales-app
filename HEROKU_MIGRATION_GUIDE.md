# Heroku Migration Guide

This guide helps you migrate from Vercel to Heroku.

## ✅ Completed Steps

1. **Vercel Project Deleted**: The Vercel project has been removed
2. **Heroku Configuration Created**: `Procfile` and `app.json` are ready

## 📋 Pre-Migration Checklist

- [ ] Heroku account created
- [ ] Heroku CLI installed (`heroku --version`)
- [ ] Logged into Heroku CLI (`heroku login`)
- [ ] Git repository ready (Heroku uses Git for deployment)

## 🚀 Step-by-Step Migration

### Step 1: Create Heroku App

```bash
# Create a new Heroku app
heroku create goat-sales-app

# Or use a custom name
heroku create your-app-name
```

### Step 2: Set Environment Variables

Copy all environment variables from Vercel to Heroku. You can set them individually or in bulk:

```bash
# Set environment variables one by one
heroku config:set NODE_ENV=production
heroku config:set NEXT_PUBLIC_SUPABASE_URL=your-url
heroku config:set NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
heroku config:set SUPABASE_SERVICE_ROLE_KEY=your-key
heroku config:set SUPABASE_SANDBOX_URL=your-sandbox-url
heroku config:set SANDBOX_SUPABASE_SERVICE_ROLE_KEY=your-key
heroku config:set SANDBOX_SUPABASE_ANON_KEY=your-key
heroku config:set OPENAI_API_KEY=your-key
heroku config:set NEXT_PUBLIC_VAPI_API_KEY=your-key
heroku config:set VAPI_SECRET_KEY=your-key
heroku config:set ELEVEN_LABS_API_KEY=your-key
heroku config:set DEEPGRAM_API_KEY=your-key
heroku config:set CRON_SECRET=your-cron-secret
```

**Or set from a file:**

```bash
# Export from Vercel (if you have them)
# Then import to Heroku
heroku config:set $(cat .env.production | xargs)
```

### Step 3: Set App URL (After First Deploy)

After the first deployment, set:

```bash
heroku config:set NEXT_PUBLIC_APP_URL=https://your-app-name.herokuapp.com
```

### Step 4: Deploy to Heroku

```bash
# Add Heroku remote (if not already added)
heroku git:remote -a goat-sales-app

# Deploy
git push heroku main

# Or if your default branch is master
git push heroku master
```

### Step 5: Set Up Cron Jobs (Heroku Scheduler)

Vercel cron jobs need to be migrated to Heroku Scheduler:

1. **Install Heroku Scheduler Addon:**
   ```bash
   heroku addons:create scheduler:standard
   ```

2. **Open Scheduler Dashboard:**
   ```bash
   heroku addons:open scheduler
   ```

3. **Add Scheduled Jobs:**

   **Training Job** (every 30 minutes):
   - Command: `curl -X POST https://your-app.herokuapp.com/api/cron/train -H "Authorization: Bearer $CRON_SECRET" -H "Content-Type: application/json" -d '{"batchSize": 5}'`
   - Frequency: `Every 30 minutes`

   **Daily Recap** (daily at 8 AM UTC):
   - Command: `curl -X GET https://your-app.herokuapp.com/api/cron/daily-recap -H "Authorization: Bearer $CRON_SECRET"`
   - Frequency: `Daily at 08:00 UTC`

   **Alternative: Use Heroku Scheduler with Node.js script:**
   
   Create `scripts/heroku-cron-train.js`:
   ```javascript
   const https = require('https');
   const url = new URL(`${process.env.NEXT_PUBLIC_APP_URL}/api/cron/train`);
   
   const options = {
     hostname: url.hostname,
     path: url.pathname + url.search,
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${process.env.CRON_SECRET}`,
       'Content-Type': 'application/json'
     }
   };
   
   const req = https.request(options, (res) => {
     console.log(`Status: ${res.statusCode}`);
     res.on('data', (d) => process.stdout.write(d));
   });
   
   req.on('error', (e) => console.error(e));
   req.write(JSON.stringify({ batchSize: 5 }));
   req.end();
   ```
   
   Then in Scheduler: `node scripts/heroku-cron-train.js`

### Step 6: Verify Deployment

```bash
# Check app status
heroku ps

# View logs
heroku logs --tail

# Open app in browser
heroku open
```

## 🔄 Key Differences: Vercel vs Heroku

### Cron Jobs
- **Vercel**: Built-in cron jobs via `vercel.json`
- **Heroku**: Requires Heroku Scheduler addon (free tier available)

### Environment Variables
- **Vercel**: Set via dashboard or CLI, available immediately
- **Heroku**: Set via CLI or dashboard, requires app restart

### Deployment
- **Vercel**: Automatic on Git push
- **Heroku**: Automatic on Git push to `heroku` remote

### Build Process
- **Vercel**: Automatic Next.js optimization
- **Heroku**: Uses `Procfile` and `package.json` scripts

### Scaling
- **Vercel**: Automatic, serverless
- **Heroku**: Manual dyno scaling

## 📝 Files to Remove/Update

### Remove Vercel-Specific Files (Optional)

```bash
# Remove Vercel configuration
rm -rf .vercel
rm vercel.json

# Or keep them if you want to maintain Vercel as backup
```

### Update Documentation

Update any references to Vercel URLs in:
- `README.md`
- Documentation files
- Environment variable examples

## 🛠️ Troubleshooting

### Build Fails

```bash
# Check build logs
heroku logs --tail

# Common issues:
# - Missing environment variables
# - Node version mismatch (check package.json engines)
# - Build timeout (increase build timeout in app.json)
```

### Cron Jobs Not Running

1. Verify Heroku Scheduler addon is installed
2. Check scheduler dashboard for job status
3. Test manually: `heroku run node scripts/heroku-cron-train.js`

### Environment Variables Not Working

```bash
# List all config vars
heroku config

# Get specific var
heroku config:get CRON_SECRET

# Restart app after setting vars
heroku restart
```

## 📚 Additional Resources

- [Heroku Node.js Support](https://devcenter.heroku.com/articles/nodejs-support)
- [Heroku Scheduler](https://devcenter.heroku.com/articles/scheduler)
- [Next.js on Heroku](https://nextjs.org/docs/deployment#heroku)

## ✅ Post-Migration Checklist

- [ ] App deployed successfully
- [ ] All environment variables set
- [ ] Heroku Scheduler jobs configured
- [ ] Cron jobs running correctly
- [ ] App URL updated in environment variables
- [ ] Test training endpoint manually
- [ ] Verify admin dashboard access
- [ ] Check logs for errors

## 🎯 Next Steps

1. Deploy to Heroku using the steps above
2. Set up Heroku Scheduler for cron jobs
3. Test all functionality
4. Update any external webhooks/URLs pointing to Vercel
5. Monitor Heroku logs for the first few days

---

**Note**: Heroku free tier has been discontinued. You'll need a paid plan (starting at $7/month for Eco dyno).
