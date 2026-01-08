# Complete Step-by-Step Guide: Deploy to Hostinger

## ⚠️ Understanding the Error

The logs you see are **ONLY install logs** - the server is NOT starting. That's why deployment fails.

**What you see:**
```
added 86 packages ✅ (This is GOOD)
```

**What's MISSING:**
```
Server running on port 3000 ❌ (This should appear but doesn't)
```

---

## 📋 Complete Deployment Steps

### Step 1: Prepare Your Files

✅ **Verify you have the latest ZIP:**
- File: `leadsextension-upload.zip`
- Location: `/Users/apple/Documents/LeadsExtension/leadsextension-upload.zip`
- Size: ~57-60KB

---

### Step 2: Go to Hostinger Web Apps

1. Log in to Hostinger control panel
2. Navigate to **"Web Apps"** or **"Node.js Apps"**
3. Click **"Create New App"** or **"Deploy"**

---

### Step 3: Upload Your ZIP File

1. Click **"Upload your files"** option
2. Click **"Choose File"** or drag and drop
3. Select: `leadsextension-upload.zip`
4. Wait for upload to complete

---

### Step 4: Configure Framework Settings

After upload, you'll see configuration options:

#### 4.1 Framework Preset
- **Select:** `Express` ✅

#### 4.2 Node Version
- **Select:** `18.x` ✅ (or `20.x` if available)

#### 4.3 Root Directory
- **Set to:** `./` ✅ (this is critical!)

---

### Step 5: Configure Build and Output Settings ⚠️ CRITICAL

Click **"Change"** next to **"Build and output settings"**

**Configure exactly as follows:**

1. **Build command:**
   ```
   npm install
   ```
   OR leave it **empty** (Hostinger may auto-detect)

2. **Start command:** ⚠️ **THIS IS THE MOST IMPORTANT!**
   ```
   npm start
   ```
   **MUST be exactly:** `npm start`
   - ❌ NOT: `node server.js`
   - ❌ NOT: `npm run start`
   - ✅ YES: `npm start`

3. **Output directory:**
   ```
   ./
   ```
   OR leave as default

4. Click **"Save"** or **"Apply"**

---

### Step 6: Add Environment Variables ⚠️ CRITICAL

Click **"Add"** next to **"Environment variables"**

Add these **THREE** variables (one at a time):

#### Variable 1:
- **Key:** `PORT`
- **Value:** `3000`
- (No quotes, no spaces)

#### Variable 2:
- **Key:** `GOOGLE_MAPS_API_KEY`
- **Value:** `your_actual_google_maps_api_key_here`
- Replace `your_actual_google_maps_api_key_here` with your real API key
- (No quotes, no spaces)

#### Variable 3:
- **Key:** `NODE_ENV`
- **Value:** `production`
- (No quotes, no spaces)

**Important:**
- ❌ Do NOT use quotes: `"3000"` ❌
- ❌ Do NOT add spaces: `PORT = 3000` ❌
- ✅ Correct: `PORT` = `3000` ✅

---

### Step 7: Review All Settings

Before deploying, verify:

- [ ] File uploaded: `leadsextension-upload.zip`
- [ ] Framework: `Express`
- [ ] Node version: `18.x` or `20.x`
- [ ] Root directory: `./`
- [ ] **Start command: `npm start`** ⚠️
- [ ] Environment variables added (PORT, GOOGLE_MAPS_API_KEY, NODE_ENV)

---

### Step 8: Deploy

1. Click the purple **"Deploy"** button
2. Wait 1-2 minutes for deployment
3. Watch the build logs

---

### Step 9: Check Build Logs

**✅ SUCCESS looks like this:**
```
added 86 packages, and audited 87 packages in 1s
Server running on port 3000
```

**Status will show:** `State: Running` ✅

**❌ FAILURE looks like this:**
```
added 86 packages, and audited 87 packages in 1s
[No "Server running" message]
```

**Status will show:** `State: Build failed` ❌

---

### Step 10: Test Your Application

If deployment succeeds:

1. Visit your temporary domain:
   ```
   https://greenyellow-gull-139219.hostingersite.com/
   ```

2. You should see:
   ```
   API is running
   ```

3. Visit the full app:
   ```
   https://greenyellow-gull-139219.hostingersite.com/index.html
   ```

---

## 🔧 Troubleshooting

### Problem: Build Still Fails After Following Steps

#### Solution 1: Verify Start Command
- Go to **"Settings and redeploy"**
- Check **"Build and output settings"**
- **Start command MUST be:** `npm start`
- Save and redeploy

#### Solution 2: Check Environment Variables
- Go to **"Settings"**
- Check **"Environment variables"**
- Verify:
  - `PORT` = `3000` (no quotes)
  - `GOOGLE_MAPS_API_KEY` = your actual key (no quotes)
  - `NODE_ENV` = `production` (no quotes)

#### Solution 3: Check ZIP Structure
- Extract your ZIP locally
- Files should be at **root level**, not in a subfolder:
  ```
  ✅ CORRECT:
  leadsextension-upload.zip
   ├── server.js
   ├── package.json
   ├── public/
  
  ❌ WRONG:
  leadsextension-upload.zip
   └── leadsextension/
        ├── server.js
        ├── package.json
  ```

#### Solution 4: Verify package.json
- Your `package.json` should have:
  ```json
  {
    "main": "server.js",
    "scripts": {
      "start": "node server.js"
    }
  }
  ```

#### Solution 5: Check Server Binding
- Your `server.js` should have:
  ```javascript
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
  ```

---

### Problem: "Cannot find module" Error

**Solution:**
- Make sure **Build command** is set to: `npm install`
- Or leave it empty if Hostinger auto-detects

---

### Problem: "Port already in use"

**Solution:**
- Make sure `PORT=3000` is set in environment variables
- Hostinger usually handles port assignment automatically

---

### Problem: Application Crashes After Deployment

**Solution:**
1. Check application logs in Hostinger dashboard
2. Verify `GOOGLE_MAPS_API_KEY` is correct
3. Check if API key has proper permissions in Google Cloud Console

---

## 📝 Quick Checklist

Before clicking "Deploy", verify:

- [ ] ZIP file uploaded
- [ ] Framework: Express
- [ ] Node version: 18.x
- [ ] Root directory: `./`
- [ ] **Start command: `npm start`** ⚠️ MOST IMPORTANT
- [ ] Build command: `npm install` (or empty)
- [ ] Environment variable: `PORT=3000`
- [ ] Environment variable: `GOOGLE_MAPS_API_KEY=your_key`
- [ ] Environment variable: `NODE_ENV=production`

---

## 🎯 Most Common Mistakes

1. **❌ Missing Start Command**
   - Forgetting to set "Start command" to `npm start`
   - **Fix:** Always set Start command = `npm start`

2. **❌ Wrong ZIP Structure**
   - Files inside a subfolder instead of root
   - **Fix:** Use `create-hostinger-zip.sh` script

3. **❌ Missing Environment Variables**
   - Not adding `GOOGLE_MAPS_API_KEY`
   - **Fix:** Add all 3 environment variables

4. **❌ Wrong Root Directory**
   - Setting root to `/app` or `/src` instead of `./`
   - **Fix:** Always use `./`

5. **❌ Server Not Binding to 0.0.0.0**
   - Server only listening on localhost
   - **Fix:** Already fixed in server.js ✅

---

## 📞 Need More Help?

If deployment still fails:

1. **Check Build Logs:**
   - Look for any error messages
   - Check if "Server running on port X" appears

2. **Verify Files:**
   - Re-download the ZIP
   - Extract and verify structure

3. **Contact Support:**
   - Hostinger support for platform issues
   - Check Hostinger documentation for Node.js apps

---

## ✅ Success Indicators

When deployment succeeds, you'll see:

1. **In Build Logs:**
   ```
   added 86 packages
   Server running on port 3000
   ```

2. **In Status:**
   ```
   State: Running ✅
   ```

3. **When Visiting URL:**
   ```
   https://your-domain.hostingersite.com/
   Shows: "API is running"
   ```

---

**Follow these steps exactly, and your deployment should succeed!** 🚀

