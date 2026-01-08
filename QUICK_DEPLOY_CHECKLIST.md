# ⚡ Quick Deployment Checklist for Hostinger

## 🎯 The Problem
Your logs show `npm install` succeeded, but the server never starts. That's why deployment fails.

## ✅ SOLUTION: Follow These Exact Steps

### 1. Upload ZIP
- [ ] Upload `leadsextension-upload.zip`

### 2. Framework Settings
- [ ] Framework: **Express**
- [ ] Node version: **18.x**
- [ ] Root directory: **`./`**

### 3. ⚠️ BUILD SETTINGS (MOST CRITICAL!)
Click **"Change"** next to "Build and output settings":

- [ ] **Build command:** `npm install` (or leave empty)
- [ ] **Start command:** `npm start` ⚠️ **MUST BE EXACTLY THIS**
- [ ] **Output directory:** `./`

### 4. Environment Variables
Click **"Add"** and add these (NO QUOTES, NO SPACES):

- [ ] `PORT` = `3000`
- [ ] `GOOGLE_MAPS_API_KEY` = `your_actual_key_here`
- [ ] `NODE_ENV` = `production`

### 5. Deploy
- [ ] Click **"Deploy"** button
- [ ] Wait 1-2 minutes

### 6. Check Success
Look for in logs:
```
Server running on port 3000
```

Status should be: **"Running"** ✅

---

## ❌ Common Mistakes

1. **Missing Start Command** → Set to `npm start`
2. **Wrong Root Directory** → Must be `./`
3. **Missing Environment Variables** → Add all 3
4. **Quotes in Env Vars** → No quotes!

---

## 🔍 If Still Fails

1. Go to **"Settings and redeploy"**
2. Double-check **Start command** = `npm start`
3. Verify all environment variables
4. Redeploy

---

**The #1 issue is missing or wrong Start command!** Make sure it's exactly `npm start`.

