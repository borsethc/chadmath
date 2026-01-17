# How to Deploy "Math Mastery" to the Web

The easiest way to deploy your Next.js application is to use **Vercel** (the creators of Next.js). It is free for personal projects and very easy to set up.

## Prerequisites

I have already initialized a local Git repository for you.

## Option 1: Deploy via GitHub (Recommended)

This method ensures your site updates automatically whenever you push code changes.

1. **Create a GitHub Repository**:
   - Go to [GitHub.com/new](https://github.com/new).
   - Name your repository (e.g., `math-mastery`).
   - Do **not** initialize with README, .gitignore, or License (we already have them).
   - Click **Create repository**.

2. **Push your code**:
   - Copy the commands under specifically **"…or push an existing repository from the command line"**.
   - They will look like this (run these in your terminal):
     ```bash
     git remote add origin https://github.com/YOUR_USERNAME/math-mastery.git
     git branch -M main
     git push -u origin main
     ```

3. **Connect to Vercel**:
   - Go to [Vercel.com](https://vercel.com) and sign up/login.
   - Click **Add New...** -> **Project**.
   - Select **Continue with GitHub**.
   - Start typing `math-mastery` and click **Import**.
   - Click **Deploy**.

## Option 2: Deploy using Vercel CLI (Fastest for testing)

If you don't want to use GitHub right now, you can deploy directly from your command line.

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Run Deploy**:
   ```bash
   vercel
   ```
   - Follow the prompts (Select `y` to setup, use default settings).
   - It will give you a `Production` URL immediately.

3. **Redeploying**:
   - Whenever you make changes, run `vercel --prod` to update the site.

## Notes
- **Database**: Your app currently writes to a local JSON file (`data.json`) via `src/app/actions.ts`.
  - **Important**: On Vercel (serverless), **you cannot persist data to a local JSON file**. The file system is read-only or ephemeral.
  - Changes made by users will **reset** whenever the server restarts (which is often).
  - To fix this for a real website, you need a real database (like Vercel Postgres, Supabase, or MongoDB).
