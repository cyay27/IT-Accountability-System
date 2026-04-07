# Vercel Deployment Guide

This guide deploys both:
- Frontend (Vite React app)
- API routes under /api (Vercel Functions)

## 1) Prerequisites

- Node.js 20+
- A Vercel account
- Access to your Firebase project
- Firebase Admin service account JSON

## 2) Required Environment Variables

Set these in Vercel Project Settings > Environment Variables.

### Frontend variables (Vite)

- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_STORAGE_BUCKET
- VITE_FIREBASE_MESSAGING_SENDER_ID
- VITE_FIREBASE_APP_ID
- VITE_FIREBASE_ADMIN_UID
- VITE_API_BASE_URL

Set VITE_API_BASE_URL to:
- https://<your-vercel-domain>/api

### Server variables (Vercel Functions)

- FIREBASE_SERVICE_ACCOUNT_JSON
- FIREBASE_ADMIN_UID

Notes:
- FIREBASE_ADMIN_UID should match VITE_FIREBASE_ADMIN_UID.
- FIREBASE_SERVICE_ACCOUNT_JSON must be the full JSON object from your Firebase service account key.

## 3) Get Firebase Service Account JSON

1. Open Firebase Console.
2. Go to Project Settings > Service accounts.
3. Click Generate new private key.
4. Copy the full JSON content.
5. Use that full JSON as FIREBASE_SERVICE_ACCOUNT_JSON in Vercel.

## 4) Deploy with Vercel CLI

Run from project root:

1. Install dependencies
   npm install

2. Login to Vercel
   npx vercel login

3. Link project (first time)
   npx vercel

4. Deploy production
   npx vercel --prod

## 5) Set Variables via CLI (optional)

If you prefer CLI instead of dashboard:

- npx vercel env add VITE_FIREBASE_API_KEY production
- npx vercel env add VITE_FIREBASE_AUTH_DOMAIN production
- npx vercel env add VITE_FIREBASE_PROJECT_ID production
- npx vercel env add VITE_FIREBASE_STORAGE_BUCKET production
- npx vercel env add VITE_FIREBASE_MESSAGING_SENDER_ID production
- npx vercel env add VITE_FIREBASE_APP_ID production
- npx vercel env add VITE_FIREBASE_ADMIN_UID production
- npx vercel env add VITE_API_BASE_URL production
- npx vercel env add FIREBASE_SERVICE_ACCOUNT_JSON production
- npx vercel env add FIREBASE_ADMIN_UID production

After adding or changing variables, redeploy:
- npx vercel --prod

## 6) Verify Deployment

Check these URLs on your Vercel domain:
- /api/health
- /api/debug (requires authenticated admin token)

Expected:
- /api/health returns ok true
- App header API badge should show API Online after login

## 7) Common Issues

1. API Offline in app
- Check VITE_API_BASE_URL points to your Vercel domain /api.
- Ensure production variables are set (not only preview/development).

2. firebase-admin-not-configured
- FIREBASE_SERVICE_ACCOUNT_JSON is missing or invalid JSON.

3. unauthorized or forbidden
- You are not logged in as the configured admin user.
- FIREBASE_ADMIN_UID does not match your Firebase Auth admin UID.

4. Build succeeds but API fails
- Confirm files exist under api/ and deployment target is Vercel, not Firebase Functions.
