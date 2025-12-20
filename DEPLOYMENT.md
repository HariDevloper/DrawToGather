# DrawTogether - Deployment Guide

This guide will help you deploy your DrawTogether application to the web using **Vercel** (frontend) and **Render** (backend).

---

## Prerequisites

Before deploying, make sure you have:

1. ✅ **GitHub Account** - To push your code
2. ✅ **Vercel Account** - Sign up at [vercel.com](https://vercel.com) (free)
3. ✅ **Render Account** - Sign up at [render.com](https://render.com) (free)
4. ✅ **MongoDB Atlas** - Your cloud database connection string
5. ✅ **Google OAuth Client ID** - From Google Cloud Console

---

## Step 1: Prepare Your Code for GitHub

### 1.1 Initialize Git Repository (if not already done)

```bash
cd c:\Users\MAHESH DAVID\Music\drawtogather
git init
git add .
git commit -m "Initial commit - DrawTogether app"
```

### 1.2 Create GitHub Repository

1. Go to [github.com](https://github.com) and create a new repository
2. Name it: `drawtogather` (or any name you prefer)
3. **Don't** initialize with README (we already have code)
4. Copy the repository URL

### 1.3 Push Code to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/drawtogather.git
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy Backend to Render

### 2.1 Create New Web Service

1. Go to [render.com/dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Select the `drawtogather` repository

### 2.2 Configure Service

- **Name**: `drawtogather-api` (or your preferred name)
- **Region**: Choose closest to your users
- **Branch**: `main`
- **Root Directory**: `server`
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Instance Type**: `Free`

### 2.3 Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"** and add these:

| Key | Value |
|-----|-------|
| `MONGODB_URI` | Your MongoDB Atlas connection string |
| `JWT_SECRET` | A random secret string (e.g., `your-super-secret-jwt-key-12345`) |
| `GOOGLE_CLIENT_ID` | Your Google OAuth Client ID |
| `NODE_ENV` | `production` |
| `PORT` | `5000` |

**Important:** For `MONGODB_URI`, use your MongoDB Atlas connection string:
```
mongodb+srv://username:password@cluster.mongodb.net/drawtogather?retryWrites=true&w=majority
```

### 2.4 Deploy

1. Click **"Create Web Service"**
2. Wait for deployment (2-5 minutes)
3. Once deployed, copy your backend URL (e.g., `https://drawtogather-api.onrender.com`)

---

## Step 3: Update Google OAuth Settings

### 3.1 Add Authorized Origins

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Under **Authorized JavaScript origins**, add:
   - Your Render backend URL: `https://drawtogather-api.onrender.com`
   - Your future Vercel URL (we'll add this in Step 5)

5. Under **Authorized redirect URIs**, add:
   - `https://drawtogather-api.onrender.com/api/auth/google/callback`

6. Click **Save**

---

## Step 4: Deploy Frontend to Vercel

### 4.1 Create New Project

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository (`drawtogather`)

### 4.2 Configure Project

- **Framework Preset**: `Vite`
- **Root Directory**: `client`
- **Build Command**: `npm run build` (auto-detected)
- **Output Directory**: `dist` (auto-detected)

### 4.3 Add Environment Variables

Click **"Environment Variables"** and add:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | Your Render backend URL (e.g., `https://drawtogather-api.onrender.com`) |
| `VITE_GOOGLE_CLIENT_ID` | Your Google OAuth Client ID |

### 4.4 Deploy

1. Click **"Deploy"**
2. Wait for deployment (1-3 minutes)
3. Once deployed, you'll get your frontend URL (e.g., `https://drawtogather.vercel.app`)

---

## Step 5: Final Configuration

### 5.1 Update Google OAuth (Again)

Go back to Google Cloud Console and add your Vercel URL:

**Authorized JavaScript origins:**
- Add: `https://drawtogather.vercel.app` (your actual Vercel URL)

**Authorized redirect URIs:**
- Add: `https://drawtogather.vercel.app`

### 5.2 Update Backend CORS (if needed)

If you encounter CORS errors, update `server/index.js`:

```javascript
app.use(cors({
    origin: ['https://drawtogather.vercel.app'], // Your Vercel URL
    credentials: true
}));
```

Then commit and push:
```bash
git add .
git commit -m "Update CORS for production"
git push
```

Render will auto-deploy the changes.

---

## Step 6: Test Your Deployment

1. Visit your Vercel URL: `https://drawtogather.vercel.app`
2. Test login with Google
3. Complete profile setup
4. Create a room (test credit deduction)
5. Test drawing and real-time features
6. Invite friends and test multiplayer

---

## Step 7: Set Up PropellerAds

Now that your app is live, you can register with PropellerAds!

### 7.1 Sign Up for PropellerAds

1. Go to [propellerads.com](https://propellerads.com)
2. Sign up as a **Publisher**
3. Add your website: `https://drawtogather.vercel.app`

### 7.2 Get Your Ad Zone ID

1. After approval, create a new ad zone
2. Choose **"Rewarded Video"** or **"Interstitial"** ad format
3. Copy your **Zone ID**

### 7.3 Add Ad Configuration to Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   - `VITE_PROPELLER_ZONE_ID` = Your Zone ID
   - `VITE_AD_TEST_MODE` = `false` (for production)

3. Redeploy: Vercel → Deployments → Click ⋯ → Redeploy

---

## Troubleshooting

### Backend Issues

**Problem:** Backend not starting
- Check Render logs: Dashboard → Your Service → Logs
- Verify all environment variables are set correctly
- Ensure MongoDB Atlas allows connections from anywhere (0.0.0.0/0)

**Problem:** Database connection failed
- Check MongoDB Atlas network access settings
- Verify connection string is correct
- Ensure database user has read/write permissions

### Frontend Issues

**Problem:** Can't connect to backend
- Verify `VITE_API_URL` is set correctly in Vercel
- Check browser console for CORS errors
- Ensure backend is running (visit backend URL directly)

**Problem:** Google login not working
- Verify Google OAuth origins and redirect URIs include both Vercel and Render URLs
- Check that `VITE_GOOGLE_CLIENT_ID` matches your Google Cloud Console

### Socket.io Issues

**Problem:** Real-time features not working
- Render free tier may have WebSocket limitations
- Check browser console for connection errors
- Verify backend URL is correct

---

## Important Notes

### Free Tier Limitations

**Render Free Tier:**
- ⚠️ Service spins down after 15 minutes of inactivity
- ⚠️ First request after spin-down takes 30-60 seconds
- ⚠️ 750 hours/month free (enough for one service)

**Vercel Free Tier:**
- ✅ Unlimited bandwidth
- ✅ Automatic HTTPS
- ✅ Global CDN

### Keeping Backend Alive

To prevent Render from spinning down, you can:
1. Use a service like [cron-job.org](https://cron-job.org) to ping your backend every 10 minutes
2. Upgrade to Render paid plan ($7/month)

---

## Environment Variables Summary

### Backend (Render)
```env
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
NODE_ENV=production
PORT=5000
```

### Frontend (Vercel)
```env
VITE_API_URL=https://drawtogather-api.onrender.com
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_PROPELLER_ZONE_ID=your-zone-id (after PropellerAds approval)
VITE_AD_TEST_MODE=false
```

---

## Next Steps After Deployment

1. ✅ Test all features thoroughly
2. ✅ Set up PropellerAds and integrate ad rewards
3. ✅ Implement daily rewards system
4. ✅ Monitor MongoDB Atlas usage
5. ✅ Set up custom domain (optional)
6. ✅ Add analytics (Google Analytics, etc.)

---

## Custom Domain (Optional)

### Add Custom Domain to Vercel

1. Buy a domain (e.g., from Namecheap, GoDaddy)
2. Vercel Dashboard → Your Project → Settings → Domains
3. Add your domain and follow DNS configuration instructions
4. Update Google OAuth origins with your custom domain

---

## Support

If you encounter issues:
- **Render Docs**: [render.com/docs](https://render.com/docs)
- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **MongoDB Atlas**: [mongodb.com/docs/atlas](https://www.mongodb.com/docs/atlas/)

---

**🎉 Congratulations! Your DrawTogether app is now live on the web!**

Your URLs:
- **Frontend**: `https://drawtogather.vercel.app`
- **Backend**: `https://drawtogather-api.onrender.com`

Share your app with friends and start drawing together! 🎨
