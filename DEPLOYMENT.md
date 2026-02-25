# Deployment Guide for FloatDate

This guide walks you through deploying FloatDate to Vercel with Supabase.

## Prerequisites

- GitHub repository pushed and ready
- Vercel account (sign up at [vercel.com](https://vercel.com))
- Supabase account (sign up at [supabase.com](https://supabase.com))
- Gmail account with App Password enabled

---

## Step 1: Set up Supabase Database

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in:
   - **Name**: `floatdate` (or your preferred name)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to your users
4. Wait for project to be created (~2 minutes)

5. Once ready, go to **Project Settings → Database**
6. Under **Connection string**, copy the **URI**:
   - **For Vercel (recommended)**: Use **Transaction mode** (port 6543)
     - It looks like: `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`
   - **Alternative**: Session mode (port 5432) also works
     - It looks like: `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres`
   - Replace `[password]` with the password you set
   - **Important**: Do NOT use the direct connection URL (`db.[ref].supabase.co`) - it won't work from Vercel

**Save this connection string** - you'll need it for the next steps.

---

## Step 2: Run Database Migration and Seed

From your local machine, run:

```bash
DATABASE_URL="your-supabase-connection-string" npx tsx scripts/deploy-setup.ts
```

Or manually:

```bash
# Set the connection string
export DATABASE_URL="your-supabase-connection-string"

# Push schema
npx prisma db push

# Seed questions
npx tsx prisma/seed.ts
```

This will:
- Create all database tables
- Seed the 60 compatibility questions

---

## Step 3: Import Repository to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"**
3. Select your GitHub repository (`Not-decided-yet` or your repo name)
4. Configure:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (default)
   - **Build Command**: `next build` (default)
   - **Output Directory**: `.next` (default)
5. **Don't deploy yet** - we need to add environment variables first

---

## Step 4: Configure Environment Variables

In your Vercel project dashboard, go to **Settings → Environment Variables** and add:

### Required Variables

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | Your Supabase connection string | From Step 1 |
| `JWT_SECRET` | `46a6e34556009ff178fc74ce736d68eebad286f109548a5c429c05f6c46e8da7` | Generated secret |
| `CRON_SECRET` | `c7354e1dd20cb716af84a922e9767466fd482a3f49d230ad12ffca2edd652d6e` | Generated secret |
| `EMAIL_USER` | Your Gmail address | e.g., `yourname@gmail.com` |
| `EMAIL_PASS` | Gmail App Password | See Gmail setup below |
| `EMAILS_ENABLED` | `true` | Literal string `true` |
| `NEXT_PUBLIC_APP_URL` | Your Vercel URL | e.g., `https://floatdate.vercel.app` |
| `VERIFY_EMAIL_HOST` | `mail.privateemail.com` | PrivateMail SMTP host |
| `VERIFY_EMAIL_PORT` | `465` | PrivateMail SMTP port (SSL) |
| `VERIFY_EMAIL_USER` | `verify@floatdate.com` | PrivateMail email address |
| `VERIFY_EMAIL_PASS` | Your PrivateMail password | Password for verify@floatdate.com |

### Optional Variables

| Variable | Value | Notes |
|----------|-------|-------|
| `EMAIL_FROM_NAME` | `FloatDate Team` | Display name for emails |
| `EMAIL_FROM` | Same as `EMAIL_USER` | Sender email address |

### Setting up Gmail App Password

1. Go to [myaccount.google.com](https://myaccount.google.com)
2. Click **Security** → **2-Step Verification** (enable if not already)
3. Scroll to **App passwords**
4. Generate a new app password for "Mail"
5. Copy the 16-character password and use it as `EMAIL_PASS`

**Important**: Use the App Password, not your regular Gmail password.

---

## Step 5: Deploy

1. After adding all environment variables, go to **Deployments** tab
2. Click **"Redeploy"** on the latest deployment, or push a new commit
3. Wait for build to complete (~2-3 minutes)

---

## Step 6: Verify Deployment

1. **Check the app loads**: Visit your Vercel URL
2. **Test signup**: Create a test account
3. **Test email verification**: Check your email for verification link
4. **Test login**: Log in with your test account
5. **Check cron job**: Go to **Settings → Cron Jobs** and verify `/api/admin/run-matching` appears

---

## Testing the Matching Algorithm

Once deployed, you can manually trigger the matching algorithm:

```bash
curl -X POST https://your-app.vercel.app/api/admin/run-matching \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Replace:
- `your-app.vercel.app` with your actual Vercel URL
- `YOUR_CRON_SECRET` with the `CRON_SECRET` value you set

---

## Troubleshooting

### Build fails with "PrismaClient not found"
- ✅ Fixed: `postinstall` script and `tsconfig.json` exclude are in place

### Database connection errors

**Error: `Can't reach database server at db.[ref].supabase.co` (P1001)**
- This means you're using the **direct connection URL**, which is firewalled and won't work from Vercel
- **Fix**: Update `DATABASE_URL` in Vercel to use the **pooler URL** instead:
  - Go to Supabase Dashboard → Project Settings → Database → Connection string
  - Copy the **Transaction mode** URI (port 6543) or **Session mode** URI (port 5432)
  - Update `DATABASE_URL` in Vercel with this pooler URL
  - Redeploy your app

**Other database connection issues:**
- Verify `DATABASE_URL` is correct in Vercel (should use pooler, not direct connection)
- Check Supabase project is active (not paused)
- Ensure connection string uses pooler (port 5432 or 6543), not direct connection (port 5432 with `db.[ref].supabase.co` hostname)

### Email not sending
- Verify `EMAIL_USER` and `EMAIL_PASS` are correct (for match emails via Gmail)
- Verify `VERIFY_EMAIL_*` variables are correct (for verification/reset emails via PrivateMail)
- Ensure `EMAILS_ENABLED` is set to `true` (not `"true"` or `True`)
- Check Gmail App Password is valid (regenerate if needed)
- Check PrivateMail password is correct for verify@floatdate.com

### Cron job not running
- Weekly cron (`0 0 * * 1`) requires Vercel **Pro plan**
- On Hobby plan, you can still trigger manually via `curl`
- Check cron appears in **Settings → Cron Jobs**

---

## Environment Variables Summary

Copy-paste ready list for Vercel:

```
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
JWT_SECRET=46a6e34556009ff178fc74ce736d68eebad286f109548a5c429c05f6c46e8da7
CRON_SECRET=c7354e1dd20cb716af84a922e9767466fd482a3f49d230ad12ffca2edd652d6e
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
EMAILS_ENABLED=true
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
EMAIL_FROM_NAME=FloatDate Team
EMAIL_FROM=your-email@gmail.com
VERIFY_EMAIL_HOST=mail.privateemail.com
VERIFY_EMAIL_PORT=465
VERIFY_EMAIL_USER=verify@floatdate.com
VERIFY_EMAIL_PASS=your-privatemail-password
```

---

## Next Steps After Deployment

1. Monitor logs in Vercel dashboard
2. Test the full user flow: signup → verify → login → questions → opt-in
3. Add test users and trigger matching manually
4. Set up monitoring/alerting if needed

---

**Need help?** Check the Vercel and Supabase documentation, or review the build logs in the Vercel dashboard.
