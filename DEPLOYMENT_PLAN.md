# Railway Deployment Plan

To run this app on **Railway**, we need to switch from saving data in a local file (`data.json`) to a real database (**Postgres**), because Railway resets the file system every time you update the site.

## 1. Updates Required
- [ ] Install `pg` (PostgreSQL driver)
- [ ] Refactor `src/lib/db.ts` to use Postgres when `DATABASE_URL` is configured.
- [ ] Create database tables on startup.

## 2. Railway Setup Steps
1.  **Create New Project** on Railway.
2.  **Add Database**: Select "Provision PostgreSQL".
3.  **Add Service**: Link your GitHub repo to Railway.
4.  **Connect**: Railway automatically injects `DATABASE_URL` into your app.

## 3. Migration Strategy
We will modify `db.ts` to support **both** modes:
- **Development**: Can still function, but using a real DB is recommended.
- **Production (Railway)**: Uses Postgres automatically.

## 4. Verification
- We will test the DB connection locally (if you have Postgres) or rely on Railway logs.
