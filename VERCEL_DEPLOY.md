# 🚀 Deploy to Vercel - Complete Guide

Deploy your entire DrawTogether app (frontend + backend) to Vercel in one go!

---

## Step 1: Push to GitHub

```bash
cd "c:\Users\MAHESH DAVID\Music\drawtogather"

# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Ready for Vercel deployment"

# Create a new repository on GitHub (go to github.com and create "drawtogather")
# Then run:
git remote add origin https://github.com/YOUR_USERNAME/drawtogather.git
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy to Vercel

### 2.1 Sign Up & Import

1. Go to **[vercel.com](https://vercel.com)**
2. Click **"Sign Up"** and use your GitHub account
3. Click **"Add New..."** → **"Project"**
4. Select your `drawtogather` repository
5. Click **"Import"**

### 2.2 Configure Project

Vercel will auto-detect your setup. Just verify:

- **Framework Preset**: `Other` (we have custom config)
- **Root Directory**: `./` (leave as root)
- **Build Command**: Leave empty (handled by vercel.json)
- **Output Directory**: Leave empty (handled by vercel.json)

### 2.3 Add Environment Variables

Click **"Environment Variables"** and add these:

| Variable Name | Value |
|---------------|-------|
| `MONGODB_URI` | `mongodb+srv://HARIKRISHNAN:YOUR_PASSWORD@hari.aflkjtc.mongodb.net/drawtogather?retryWrites=true&w=majority` |
| `JWT_SECRET` | `drawtogather-secret-2024-production` |
| `GOOGLE_CLIENT_ID` | Your Google Client ID |
| `VITE_GOOGLE_CLIENT_ID` | Your Google Client ID (same as above) |
| `NODE_ENV` | `production` |

**Important:** Replace `YOUR_PASSWORD` with your actual MongoDB password!

### 2.4 Deploy!

1. Click **"Deploy"**
2. Wait 2-5 minutes
3. **Copy your URL** (e.g., `https://drawtogather.vercel.app`)

---

## Step 3: Configure MongoDB Atlas

### Allow Vercel to Access Database

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Select your cluster
3. Click **"Network Access"** (left sidebar)
4. Click **"Add IP Address"**
5. Click **"Allow Access from Anywhere"** (0.0.0.0/0)
6. Click **"Confirm"**

---

## Step 4: Update Google OAuth

### Add Vercel URL to Google Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Click on your OAuth 2.0 Client ID

**Authorized JavaScript origins** - Add:
- `https://drawtogather.vercel.app` (your Vercel URL)

**Authorized redirect URIs** - Add:
- `https://drawtogather.vercel.app`
- `https://drawtogather.vercel.app/api/auth/google/callback`

4. Click **"Save"**

---

## Step 5: Update API URL in Code

We need to make sure the frontend uses the correct API URL in production.

The code is already set up to use environment variables, but we need to add one more:

1. Go to Vercel Dashboard → Your Project → **Settings** → **Environment Variables**
2. Add:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://drawtogather.vercel.app` (your Vercel URL - same as frontend)

3. Go to **Deployments** tab
4. Click ⋯ on the latest deployment → **Redeploy**

---

## Step 6: Test Your App!

1. Visit your Vercel URL: `https://drawtogather.vercel.app`
2. Click **"Sign in with Google"**
3. Complete profile setup
4. Create a room (test credit deduction)
5. Test drawing
6. Open in another browser/incognito and test multiplayer

---

## Step 7: Set Up PropellerAds

Now that your app is live, register with PropellerAds!

### 7.1 Sign Up

1. Go to **[propellerads.com](https://propellerads.com)**
2. Click **"Sign Up"** → Choose **"Publisher"**
3. Fill in your details

### 7.2 Add Your Website

1. Go to **"Websites"** → **"Add Website"**
2. Enter: `https://drawtogather.vercel.app`
3. Category: **"Games"** or **"Entertainment"**
4. Submit for approval (1-3 days)

### 7.3 After Approval

1. Create an **Ad Zone** (Interstitial or Push)
2. Copy your **Zone ID**
3. Add to Vercel:
   - Go to Settings → Environment Variables
   - Add `VITE_PROPELLER_ZONE_ID` = Your Zone ID
   - Add `VITE_AD_TEST_MODE` = `false`
4. Redeploy

---

## 🎉 You're Live!

Your app is now deployed at: `https://drawtogather.vercel.app`

### What Works:
✅ Frontend (React app)
✅ Backend API (Express)
✅ Real-time drawing (Socket.io)
✅ Google OAuth
✅ MongoDB Atlas
✅ Credit system

### Next Steps:
1. Test all features thoroughly
2. Wait for PropellerAds approval
3. Implement daily rewards system
4. Share with friends!

---

## ⚠️ Important Notes

### Vercel Serverless Limitations

**Socket.io Considerations:**
- Vercel uses serverless functions
- WebSocket connections may have limitations
- If real-time features don't work perfectly, you might need to use Vercel's Edge Functions or deploy backend separately to Render

**If Socket.io doesn't work:**
1. The drawing will still work (HTTP fallback)
2. Real-time cursor sync might be delayed
3. Consider deploying backend to Render for full WebSocket support

### Free Tier:
- ✅ Unlimited bandwidth
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ No cold starts for frontend
- ⚠️ Serverless functions have 10-second timeout

---

## 🐛 Troubleshooting

### Deployment Failed

**Check Build Logs:**
1. Vercel Dashboard → Your Project → Deployments
2. Click on failed deployment → View Build Logs

**Common Issues:**
- Missing dependencies → Check package.json
- Build errors → Test `npm run build` locally first

### Can't Connect to Database

**Check:**
- MongoDB Atlas allows 0.0.0.0/0 access
- `MONGODB_URI` has correct password
- Database user has read/write permissions

### Google Login Not Working

**Check:**
- Vercel URL is in Google OAuth origins
- `VITE_GOOGLE_CLIENT_ID` is set correctly
- Redirect URIs include your Vercel URL

### Real-time Features Not Working

**Socket.io on Vercel:**
- May have limitations with serverless
- Check browser console for WebSocket errors
- Consider deploying backend to Render if needed

---

## 📊 Monitor Your App

### Vercel Analytics

1. Go to Vercel Dashboard → Your Project → **Analytics**
2. See visitor stats, performance metrics

### Check Logs

1. Go to **Deployments** → Click deployment → **Functions**
2. View serverless function logs

---

## 🔄 Making Updates

After deployment, to update your app:

```bash
# Make your changes
git add .
git commit -m "Your update message"
git push

# Vercel auto-deploys on push!
```

---

**Congratulations! Your DrawTogether app is live! 🎨**

Share your URL and start drawing with friends!
