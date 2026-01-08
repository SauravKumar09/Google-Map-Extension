# Render Deployment Setup Guide

## 🔴 Problem: API Key Not Configured

If you see this error:
```
You must use an API key to authenticate each request to Google Maps Platform APIs
```

**This means:** The `GOOGLE_MAPS_API_KEY` environment variable is not set in Render.

---

## ✅ Solution: Add Environment Variables in Render

### Step 1: Go to Your Render Dashboard

1. Log in to [render.com](https://render.com)
2. Click on your **Web Service** (your deployed app)
3. Go to **"Environment"** tab (in the left sidebar)

### Step 2: Add Environment Variables

Click **"Add Environment Variable"** and add these **THREE** variables:

#### Variable 1: PORT
- **Key:** `PORT`
- **Value:** `10000` (Render uses port 10000, or leave empty for auto)
- Click **"Save Changes"**

#### Variable 2: GOOGLE_MAPS_API_KEY ⚠️ CRITICAL
- **Key:** `GOOGLE_MAPS_API_KEY`
- **Value:** `your_actual_google_maps_api_key_here`
  - Replace with your real API key from Google Cloud Console
  - Get it from: https://console.cloud.google.com/
- Click **"Save Changes"**

#### Variable 3: NODE_ENV
- **Key:** `NODE_ENV`
- **Value:** `production`
- Click **"Save Changes"**

### Step 3: Redeploy

After adding environment variables:

1. Go to **"Manual Deploy"** tab
2. Click **"Clear build cache & deploy"** (optional but recommended)
3. Or Render will auto-redeploy when you save environment variables

### Step 4: Wait for Deployment

- Wait 1-2 minutes for deployment to complete
- Check the **"Logs"** tab to see if deployment succeeded

---

## 🔍 How to Get Your Google Maps API Key

### Step 1: Go to Google Cloud Console
1. Visit: https://console.cloud.google.com/
2. Sign in with your Google account

### Step 2: Create or Select Project
1. Click project dropdown at top
2. Click **"New Project"** or select existing
3. Enter project name (e.g., "Maps Places API")
4. Click **"Create"**

### Step 3: Enable APIs
1. Go to **"APIs & Services"** → **"Library"**
2. Search for **"Places API"**
3. Click **"Enable"**
4. Also enable **"Maps JavaScript API"** (optional but recommended)

### Step 4: Create API Key
1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"API Key"**
3. Copy the API key (starts with `AIza...`)

### Step 5: Restrict API Key (Recommended)
1. Click on the API key you just created
2. Under **"API restrictions"**, select **"Restrict key"**
3. Check **"Places API"** and **"Maps JavaScript API"**
4. Under **"Application restrictions"**, you can restrict by:
   - HTTP referrers (for web apps)
   - IP addresses (for server-side)
5. Click **"Save"**

### Step 6: Add to Render
1. Copy your API key
2. Go to Render → Your Service → Environment
3. Add `GOOGLE_MAPS_API_KEY` with your key
4. Save and redeploy

---

## ✅ Verification Steps

### Check 1: Environment Variables
1. Go to Render → Your Service → Environment
2. Verify you see:
   - ✅ `GOOGLE_MAPS_API_KEY` (with your key)
   - ✅ `PORT` (optional, Render auto-assigns)
   - ✅ `NODE_ENV=production`

### Check 2: Application Logs
1. Go to Render → Your Service → Logs
2. Look for:
   ```
   Server running on port 10000
   ```
   (or whatever port Render assigned)

### Check 3: Test the Application
1. Visit your Render URL
2. Try searching for a place
3. Should work without API key errors

---

## 🐛 Troubleshooting

### Problem: Still Getting API Key Error

**Solution 1: Verify Environment Variable**
- Go to Render → Environment
- Make sure `GOOGLE_MAPS_API_KEY` is exactly spelled (case-sensitive)
- Make sure there are no extra spaces
- Make sure the value is your actual API key

**Solution 2: Check API Key is Valid**
- Go to Google Cloud Console
- Verify the API key is active
- Check if APIs are enabled (Places API)

**Solution 3: Redeploy After Adding Variables**
- After adding environment variables, Render should auto-redeploy
- If not, go to "Manual Deploy" → "Deploy latest commit"

**Solution 4: Check Application Logs**
- Go to Render → Logs
- Look for any error messages
- Check if server started successfully

### Problem: "API key not configured" Error

This means the environment variable isn't being read. Check:

1. **Variable Name:** Must be exactly `GOOGLE_MAPS_API_KEY` (case-sensitive)
2. **Variable Value:** Must be your actual API key (no quotes)
3. **Redeploy:** After adding, wait for redeployment

### Problem: API Key Works But Gets Quota Errors

**Solution:**
- Check your Google Cloud billing
- Verify API quotas in Google Cloud Console
- Make sure billing is enabled for the project

---

## 📋 Quick Checklist

Before testing your app:

- [ ] Google Maps API key created in Google Cloud Console
- [ ] Places API enabled in Google Cloud Console
- [ ] API key added to Render environment variables
- [ ] Variable name: `GOOGLE_MAPS_API_KEY` (exact spelling)
- [ ] Variable value: Your actual API key (no quotes)
- [ ] Application redeployed after adding variables
- [ ] Checked logs for "Server running" message
- [ ] Tested search functionality

---

## 🎯 Expected Behavior After Fix

1. **Visit your Render URL**
2. **Enter a search** (e.g., "restaurants in Delhi")
3. **Click "Search Places"**
4. **Should see results** without API key errors ✅

---

## 📞 Still Having Issues?

1. **Check Render Logs:**
   - Go to Render → Your Service → Logs
   - Look for error messages

2. **Check Google Cloud Console:**
   - Verify API key is active
   - Check if APIs are enabled
   - Verify billing is set up

3. **Verify Environment Variables:**
   - Double-check spelling
   - Make sure no extra spaces
   - Verify the API key value is correct

---

**After adding the environment variable and redeploying, your app should work!** 🚀

