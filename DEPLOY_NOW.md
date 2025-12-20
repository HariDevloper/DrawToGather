# ✅ READY TO DEPLOY!

Your DrawTogether app is committed and ready for Vercel deployment!

---

## 🚀 NEXT STEPS - DO THIS NOW:

### 1. Create GitHub Repository (5 minutes)

1. Go to **[github.com](https://github.com)**
2. Click the **"+"** icon (top right) → **"New repository"**
3. Repository name: `drawtogather`
4. Make it **Public** (or Private if you prefer)
5. **DO NOT** check "Initialize with README"
6. Click **"Create repository"**

### 2. Push Your Code to GitHub

Copy these commands and run them in your terminal:

```bash
cd "c:\Users\MAHESH DAVID\Music\drawtogather"

# Replace YOUR_USERNAME with your GitHub username
git remote add origin https://github.com/YOUR_USERNAME/drawtogather.git

git branch -M main

git push -u origin main
```

**Example:** If your GitHub username is `maheshdavid`, use:
```bash
git remote add origin https://github.com/maheshdavid/drawtogather.git
```

### 3. Deploy to Vercel (10 minutes)

1. Go to **[vercel.com](https://vercel.com)**
2. Click **"Sign Up"** → Use GitHub
3. Click **"Add New..."** → **"Project"**
4. Find and select `drawtogather`
5. Click **"Import"**

**Configure:**
- Framework: `Other`
- Root Directory: `./` (leave as is)
- Build Command: (leave empty)
- Output Directory: (leave empty)

**Add Environment Variables:**

Click **"Environment Variables"** and add these ONE BY ONE:

| Variable | Value |
|----------|-------|
| `MONGODB_URI` | `mongodb+srv://HARIKRISHNAN:YOUR_PASSWORD@hari.aflkjtc.mongodb.net/drawtogather?retryWrites=true&w=majority` |
| `JWT_SECRET` | `drawtogather-secret-2024-production` |
| `GOOGLE_CLIENT_ID` | (Get from your current `.env` file) |
| `VITE_GOOGLE_CLIENT_ID` | (Same as GOOGLE_CLIENT_ID) |
| `NODE_ENV` | `production` |

**IMPORTANT:** Replace `YOUR_PASSWORD` in MONGODB_URI with your actual MongoDB password!

6. Click **"Deploy"**
7. Wait 2-5 minutes
8. **COPY YOUR URL!** (e.g., `https://drawtogather.vercel.app`)

---

## 🔐 Configure MongoDB Atlas

1. Go to **[cloud.mongodb.com](https://cloud.mongodb.com)**
2. Select your cluster
3. Click **"Network Access"** (left sidebar)
4. Click **"Add IP Address"**
5. Click **"Allow Access from Anywhere"** (0.0.0.0/0)
6. Click **"Confirm"**

---

## 🔑 Update Google OAuth

1. Go to **[console.cloud.google.com](https://console.cloud.google.com)**
2. Navigate to **APIs & Services** → **Credentials**
3. Click your OAuth 2.0 Client ID

**Add these to Authorized JavaScript origins:**
- `https://drawtogather.vercel.app` (your Vercel URL)

**Add these to Authorized redirect URIs:**
- `https://drawtogather.vercel.app`
- `https://drawtogather.vercel.app/api/auth/google/callback`

4. Click **"Save"**

---

## 🎯 Add Final Environment Variable

After deployment:

1. Go to Vercel Dashboard → Your Project → **Settings** → **Environment Variables**
2. Add:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://drawtogather.vercel.app` (your Vercel URL)
3. Go to **Deployments** → Click ⋯ → **Redeploy**

---

## ✅ TEST YOUR APP!

Visit: `https://drawtogather.vercel.app`

Test:
- [ ] Google login works
- [ ] Profile creation works
- [ ] Room creation works (credits deducted)
- [ ] Drawing works
- [ ] Real-time features work
- [ ] Multiplayer works

---

## 📺 PropellerAds Setup (After Testing)

1. Go to **[propellerads.com](https://propellerads.com)**
2. Sign up as **Publisher**
3. Add website: `https://drawtogather.vercel.app`
4. Wait for approval (1-3 days)
5. Get Zone ID
6. Add to Vercel environment variables:
   - `VITE_PROPELLER_ZONE_ID` = Your Zone ID
   - `VITE_AD_TEST_MODE` = `false`
7. Redeploy

---

## 📝 Your Credentials Checklist

Make sure you have:
- [x] MongoDB connection string
- [ ] MongoDB password (to replace `<db_password>`)
- [ ] Google Client ID (from your `.env` file)
- [ ] GitHub account
- [ ] Vercel account

---

## 🆘 Need Help?

**If deployment fails:**
1. Check Vercel build logs
2. Verify all environment variables are correct
3. Make sure MongoDB allows 0.0.0.0/0 access
4. Check Google OAuth settings

**Common Issues:**
- **Build fails**: Check package.json files are correct
- **Can't connect to DB**: Check MongoDB password and network access
- **Google login fails**: Check OAuth origins and redirect URIs
- **Real-time doesn't work**: Socket.io may have limitations on Vercel serverless

---

## 🎉 SUMMARY

✅ Code is committed to Git
✅ Ready to push to GitHub
✅ Vercel configuration created
✅ Environment variables documented

**YOU'RE READY! Follow the steps above and your app will be live in 20 minutes!**

---

**Your MongoDB Connection:**
```
mongodb+srv://HARIKRISHNAN:<password>@hari.aflkjtc.mongodb.net/drawtogather
```

**Remember to:**
1. Replace `<password>` with your actual password
2. Replace `YOUR_USERNAME` with your GitHub username
3. Copy your Vercel URL after deployment
4. Update Google OAuth with your Vercel URL

**LET'S GO! 🚀**
