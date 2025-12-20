# Render Backend Troubleshooting Guide

## Current Issues
- ❌ 500 errors on `/api/rooms/public` (MongoDB connection issue)
- ❌ 401 errors on `/api/auth/google` (Google OAuth verification failing)
- ✅ Socket connection working (user connects: t45j_aqA-yyCi8dgAAAD)

## Root Causes & Solutions

### 1. MongoDB Atlas Network Access ⚠️ MOST LIKELY ISSUE

**Problem:** Render's IP address is not whitelisted in MongoDB Atlas.

**Solution:**
1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Select your cluster → **Network Access** (left sidebar)
3. Click **"Add IP Address"**
4. Choose **"Allow Access from Anywhere"** (0.0.0.0/0)
   - OR add Render's specific IP ranges (less secure but more restrictive)
5. Click **Confirm**
6. Wait 1-2 minutes for changes to propagate

### 2. Render Environment Variables Missing

**Problem:** Critical environment variables are not set on Render.

**Solution:**
1. Go to your Render dashboard
2. Select your backend service
3. Go to **Environment** tab
4. Verify these variables are set:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
   JWT_SECRET=your-secret-key
   GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   PORT=5000 (or whatever Render assigns)
   NODE_ENV=production
   ```
5. Click **Save Changes**
6. Render will auto-redeploy

### 3. Google OAuth Configuration

**Problem:** Google Client ID doesn't match or authorized origins are missing.

**Solution:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project → **APIs & Services** → **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Under **Authorized JavaScript origins**, add:
   ```
   https://your-vercel-app.vercel.app
   https://your-render-backend.onrender.com
   ```
5. Under **Authorized redirect URIs**, add:
   ```
   https://your-vercel-app.vercel.app
   ```
6. Click **Save**

### 4. CORS Configuration

**Problem:** Cross-origin requests are being blocked.

**Solution:** Update `server/index.js` CORS settings:
```javascript
const io = new Server(server, {
    cors: {
        origin: [
            "https://your-vercel-app.vercel.app",
            "http://localhost:5173"
        ],
        methods: ["GET", "POST"],
        credentials: true
    }
});

app.use(cors({
    origin: [
        "https://your-vercel-app.vercel.app",
        "http://localhost:5173"
    ],
    credentials: true
}));
```

### 5. Check Render Logs

**How to check:**
1. Go to Render dashboard
2. Select your backend service
3. Click **Logs** tab
4. Look for errors like:
   - `MongoDB connection error`
   - `Google Auth Error`
   - `ECONNREFUSED`
   - `MongoServerError`

### 6. Verify MongoDB Connection String

**Common issues:**
- ❌ Username/password contains special characters (needs URL encoding)
- ❌ Wrong database name
- ❌ Missing `retryWrites=true&w=majority` parameters

**Correct format:**
```
mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
```

**If password has special characters:**
```javascript
// Encode password: p@ssw0rd! → p%40ssw0rd%21
```

## Quick Diagnostic Steps

### Step 1: Check if Render backend is running
Visit: `https://your-render-backend.onrender.com/api/rooms/public`
- If you see JSON or error message → Backend is running
- If timeout → Backend is down

### Step 2: Check MongoDB Atlas
1. MongoDB Atlas → Clusters → Click "Connect"
2. Choose "Connect your application"
3. Copy the connection string
4. Verify it matches your `MONGODB_URI` on Render

### Step 3: Test Google OAuth
1. Open browser console on your Vercel app
2. Try to sign in with Google
3. Check Network tab for the exact error response
4. Look for the token being sent in the request payload

## Priority Actions (Do These First!)

1. ✅ **Whitelist Render IP in MongoDB Atlas** (0.0.0.0/0)
2. ✅ **Verify MONGODB_URI on Render** (check for typos)
3. ✅ **Check Render logs** for specific error messages
4. ✅ **Add Vercel URL to Google OAuth authorized origins**

## After Fixing

1. Redeploy Render backend (if you changed code)
2. Clear browser cache
3. Test with a fresh incognito window
4. Check Render logs for "Connected to MongoDB" message
