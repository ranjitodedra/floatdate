This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


-------------------------------------------------------------

Email Verification, No-Match Emails & Match Score
Implementing email verification on signup, a "no match this week" email, adding compatibility score to match emails, and adding missing environment variables.

User Review Required
IMPORTANT

Schema change required — adding 3 new fields (emailVerified, verifyToken, verifyTokenExpiry) to the 
User
 model requires a Prisma migration. This is non-destructive (all existing users will default to emailVerified = false).

WARNING

Existing users will have emailVerified = false after migration. You may want to manually set verified users to true in the DB, or auto-verify existing users in the migration.

Proposed Changes
Database Schema
[MODIFY] 
schema.prisma
Add 3 fields to the 
User
 model:

diff
+  emailVerified      Boolean      @default(false)
+  verifyToken        String?      @unique
+  verifyTokenExpiry   DateTime?
Email Verification Flow
[MODIFY] 
send-match-email.ts
Add sendVerificationEmail(to, name, token) — sends a styled email with a verification link
Add sendNoMatchEmail(to, name) — sends a "no match this week, stay tuned" email
[MODIFY] 
signup/route.ts
Generate a random verification token (crypto.randomUUID)
Store token + expiry (24h) in DB
Send verification email via Resend
Do NOT create a session — redirect to verify-email page instead
[NEW] 
route.ts
GET /api/auth/verify?token=xxx — verifies the token, sets emailVerified = true, clears the token, creates session, redirects to /questions
[NEW] 
page.tsx
Simple page: "Check your inbox! We sent a verification link to your email."
Option to resend the verification email
[MODIFY] 
login/route.ts
Block login if emailVerified === false, return error "Please verify your email first"
No-Match & Score in Emails
[MODIFY] 
run-matching/route.ts
After matching, identify unmatched opted-in users and send each a no-match email
Pass similarityScore through to email sending
[MODIFY] 
send-match-email.ts
Add similarityScore parameter to 
sendMatchEmail()
 and display as percentage (e.g., "87% Compatible")
Add sendNoMatchEmail() function
Environment Variables
[MODIFY] 
.env
Add missing variables:

JWT_SECRET="<random-32-char-string>"
CRON_SECRET="<random-secret-for-cron>"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
JWT_SECRET — used by 
auth.ts
 and 
middleware.ts
 (currently falls back to hardcoded dev secret)
CRON_SECRET — needed by run-matching endpoint to authorize cron calls
NEXT_PUBLIC_APP_URL — needed to construct verification link URLs
.env
 is fine for local development. For production (Vercel), set these in the Vercel dashboard instead. No .env.local is needed.

Verification Plan
Manual Verification
Sign up → should receive verification email at the @mylaurier.ca address
Click verification link → should redirect to /questions
Try logging in without verifying → should get "verify your email" error
Trigger matching with unmatched users → should receive "no match" email
Match email should show compatibility score percentage


Take our psychology-backed compatibility quiz once. Then opt in weekly by Tuesday 9pm to get a match with a note on why we think you'll click

# Fresh Antigravity
```bash
Remove-Item -Path "$env:LocalAppData\antigravity" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$env:AppData\antigravity" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$env:TEMP\antigravity*" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$env:USERPROFILE\.antigravity" -Recurse -Force -ErrorAction SilentlyContinue
```

# Run the matching script
```bash
npm run trigger-matching
```

how to take backup of data
```bash
npm run db:dump -- floatdate_backup_may_29_2025.dump
```