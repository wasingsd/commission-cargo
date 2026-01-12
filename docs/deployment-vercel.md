# Deployment Guide (Vercel + Database)

This project is ready to be deployed to **Vercel** with a **PostgreSQL** database.

## 1. Database Setup

Since this is a Prisma-based application, you need a hosted PostgreSQL database. We recommend:
- **Vercel Postgres**: Integrated directly into Vercel.
- **Neon**: Great for serverless applications.
- **Supabase**: Robust and includes many features.

### Steps:
1. Create a PostgreSQL database on your preferred provider.
2. Get the connection string (e.g., `postgresql://user:password@host:port/dbname?sslmode=require`).
3. If using **Prisma Edge Adapter** (included in this project), ensure your database is compatible with Postgres protocol.

## 2. Vercel Deployment

### A. Via Vercel Dashboard (Recommended)
1. Push your code to a GitHub repository:
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```
2. Go to [Vercel](https://vercel.com/new).
3. Import your repository.
4. **Environment Variables**: Add the following in the Settings -> Environment Variables:
   - `DATABASE_URL`: Your database connection string.
   - `NEXTAUTH_SECRET`: Generate a random string (e.g., `openssl rand -base64 32`).
   - `NEXTAUTH_URL`: `https://your-app-name.vercel.app`.
5. **Build Command**: `npx prisma generate && next build`.
6. Click **Deploy**.

### B. Post-Deployment Database Initialization
Once deployed, run the following locally to initialize your production database:
```bash
# Set your DATABASE_URL to production
export DATABASE_URL="your-production-db-url"

# Push schema
npx prisma db push

# Seed initial data
npx prisma db seed
```

## 3. Environment Variables Summary

| Name | Description | Example |
|------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://...` |
| `NEXTAUTH_SECRET` | Secret for auth tokens | `a-long-random-string` |
| `NEXTAUTH_URL` | App production URL | `https://prcargo.vercel.app` |

---
**Note:** The current project is configured to use the `@prisma/adapter-pg` which works well with Vercel's Edge functions if needed, but it also works with regular Node.js functions.
