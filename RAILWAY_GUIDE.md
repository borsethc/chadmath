cre# Railway Deployment Guide

This guide will help you deploy your Math Mastery app to **Railway.app** with a persistent database.

## Prerequisites
- A GitHub account with this repository pushed to it.
- A Railway account (create at [railway.app](https://railway.app)).

## Deployment Steps

### 1. Create Project
1.  Go to your [Railway Dashboard](https://railway.app/dashboard).
2.  Click **"New Project"** -> **"Deploy from GitHub repo"**.
3.  Select your repository (`math-mastery` or whatever you named it).
4.  Click **"Deploy Now"**.

### 2. Add Database
1.  Once the project is created, you will see a card for your web service.
2.  Right-click (or click "Command + K") and select **"Database"** or click **"New"** button in the canvas.
3.  Select **"PostgreSQL"**.
4.  Wait for the database service to appear and initialize.

### 3. Connect App to Database (CRITICAL STEP)
1.  Railway often does this automatically, but you MUST verify.
2.  Click on your **Database** service card -> **"Variables"** tab.
3.  Note that `DATABASE_URL` exists there.
4.  Now click on your **Web App** service card (the one with your code) -> **"Variables"** tab.
5.  **If `DATABASE_URL` is missing or looks like a hardcoded string**:
    - Delete it if it exists.
    - Click **"New Variable"**.
    - Variable Name: `DATABASE_URL`
    - Variable Value: Type `${{` and a dropdown will appear.
    - Select `PostgreSQL.DATABASE_URL` (or whatever your database service is named).
    - **Verify**: The value should look like a purple box/token, NOT plain text.
    - Click **Add**.

### 4. Wait for Build
1.  The app will rebuild automatically when variables change.
2.  Check the **"Deployments"** tab to see the progress.
3.  Once green, click the generated URL (e.g., `xxx.up.railway.app`) to open your app!

## Troubleshooting
- **"Application Error"**: Check the "Logs" tab in your web service.
- **Data not saving**: Ensure `DATABASE_URL` is set correctly.
- **Login fails**: Check logs for database connection errors.
