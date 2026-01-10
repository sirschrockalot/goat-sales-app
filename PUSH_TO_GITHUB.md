# Push to GitHub Instructions

## Step 1: Create Repository on GitHub
1. Go to https://github.com/new
2. Repository name: `goat-sales-app`
3. Description: "Sales Goat Training App - AI-powered sales coaching with gamification"
4. Choose Private or Public
5. **DO NOT** initialize with README, .gitignore, or license
6. Click "Create repository"

## Step 2: Push Your Code

After creating the repository, run these commands (replace YOUR_USERNAME with your GitHub username):

```bash
cd /Users/joelschrock/Development/cloned_repos/newApp/goat-sales-app

# Add the remote (replace YOUR_USERNAME and REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/goat-sales-app.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

## Alternative: Using SSH (if you have SSH keys set up)

```bash
git remote add origin git@github.com:YOUR_USERNAME/goat-sales-app.git
git branch -M main
git push -u origin main
```

## What's Included in This Repository

- Complete Next.js application with TypeScript
- Supabase database migrations
- All API routes and components
- Chrome Extension for Shadow Mode
- Documentation in `/docs` folder
- Environment variable examples

## Next Steps After Pushing

1. Add environment variables to GitHub Secrets (if using GitHub Actions)
2. Set up Vercel deployment
3. Configure Supabase project
4. Add team members as collaborators
