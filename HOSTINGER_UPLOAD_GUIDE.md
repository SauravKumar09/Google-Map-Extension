# Hostinger Upload Guide

## Option 1: Upload Files (Manual)

### Files to Upload

Upload **ALL** files and folders from your project **EXCEPT**:

#### ❌ DO NOT Upload:
- `node_modules/` folder (will be installed on server)
- `.env` file (contains sensitive API keys - create on server)
- `.git/` folder (if exists)
- `*.log` files
- `backup-*.tar.gz` files
- `.DS_Store` (Mac system file)
- `Thumbs.db` (Windows system file)

#### ✅ DO Upload:
```
LeadsExtension/
├── public/
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   ├── google-maps.png
│   └── Google my business data.xlsx
├── scripts/
│   └── check-port.js
├── server.js
├── package.json
├── package-lock.json
├── .gitignore
├── DEPLOYMENT.md
├── deploy.sh
└── nginx-config.conf
```

### Steps for File Upload:

1. **Create a ZIP file** with all the files (excluding the files listed above):
   ```bash
   # On Mac/Linux, from project directory:
   zip -r leadsextension.zip . -x "node_modules/*" ".env" ".git/*" "*.log" ".DS_Store"
   ```

2. **Upload via Hostinger**:
   - Click "Upload your files" option
   - Upload the `leadsextension.zip` file
   - Extract it on the server

3. **After Upload**:
   - Create `.env` file on server with your API key
   - Run `npm install` to install dependencies
   - Start the application

---

## Option 2: Git Repository (Recommended) ⭐

This is the **recommended** method as it's easier to update later.

### Steps:

1. **Create a Git Repository** (if not already):
   ```bash
   # Initialize git (if not done)
   git init
   
   # Add all files
   git add .
   
   # Commit
   git commit -m "Initial commit"
   ```

2. **Push to GitHub/GitLab/Bitbucket**:
   - Create a repository on GitHub
   - Push your code:
   ```bash
   git remote add origin https://github.com/yourusername/leadsextension.git
   git branch -M main
   git push -u origin main
   ```

3. **Connect to Hostinger**:
   - Click "Import Git repository" option
   - Click "Connect with GitHub"
   - Authorize Hostinger
   - Select your repository
   - Hostinger will automatically deploy

### Benefits of Git Method:
- ✅ Easy updates (just push to Git)
- ✅ Version control
- ✅ Automatic deployments
- ✅ No manual file uploads needed

---

## Important: Environment Variables

**Regardless of which method you choose**, you MUST create a `.env` file on the server:

```env
GOOGLE_MAPS_API_KEY=your_actual_google_maps_api_key_here
PORT=3000
NODE_ENV=production
```

### How to add .env on Hostinger:

1. After deployment, access your server via SSH or File Manager
2. Navigate to your project directory
3. Create `.env` file:
   ```bash
   nano .env
   ```
4. Paste your environment variables
5. Save and restart the application

---

## Quick Checklist:

- [ ] All project files uploaded (except node_modules, .env, .git)
- [ ] `.env` file created on server with API key
- [ ] `npm install` run on server
- [ ] Application started (PM2 or Hostinger's process manager)
- [ ] Port 3000 accessible (or configured port)
- [ ] Domain/URL configured (if using custom domain)

---

## After Upload - Next Steps:

1. **Install Dependencies**:
   ```bash
   npm install --production
   ```

2. **Create .env file**:
   ```bash
   nano .env
   # Add: GOOGLE_MAPS_API_KEY=your_key
   ```

3. **Start Application**:
   - If Hostinger has a process manager, use it
   - Or use PM2: `pm2 start server.js --name leadsextension`

4. **Configure Domain** (if needed):
   - Point your domain to Hostinger's nameservers
   - Configure in Hostinger's control panel

---

## Need Help?

- Check Hostinger's documentation for Node.js deployment
- Review `DEPLOYMENT.md` for detailed server setup
- Check application logs if issues occur

