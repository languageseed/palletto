# Deployment Guide for GitHub Pages

## 🚀 Quick Start

Your Palletto app is configured to deploy to:
**https://languageseed.github.io/palletto/**

## 📋 One-Time Setup

### Step 1: Enable GitHub Pages

1. Go to your repo: https://github.com/languageseed/palletto
2. Click **Settings** → **Pages** (left sidebar)
3. Under **Build and deployment**:
   - **Source**: Select "GitHub Actions"
4. Save

That's it! The workflow is already configured.

### Step 2: Push Your Code

```bash
# Initialize git (if not already)
cd /Users/ben/Documents/palletto
git init

# Add GitHub remote
git remote add origin https://github.com/languageseed/palletto.git

# Add all files
git add .

# Commit
git commit -m "Initial Palletto deployment"

# Push to main branch (triggers automatic deployment)
git push -u origin main
```

## ✨ Automatic Deployment

Once pushed, GitHub Actions will automatically:

1. ✅ Install dependencies
2. ✅ Build the production bundle
3. ✅ Deploy to GitHub Pages
4. ✅ Your site will be live at: **https://languageseed.github.io/palletto/**

## 📊 Monitor Deployment

- Go to **Actions** tab in your repo
- Watch the deployment progress
- Typically takes 2-3 minutes

## 🔄 Future Updates

Every time you push to `main`:
```bash
git add .
git commit -m "Update feature X"
git push
```

The site will automatically rebuild and redeploy! 🎉

## 🎯 Custom Domain (Optional)

Want to use your own domain?

1. Go to **Settings** → **Pages**
2. Enter your custom domain (e.g., `palletto.yourdomain.com`)
3. Add DNS records as shown
4. Update `vite.config.js`:
   ```javascript
   base: '/'  // Change from '/palletto/' to '/'
   ```

## 🐛 Troubleshooting

If deployment fails:
- Check the **Actions** tab for error logs
- Ensure `npm ci` works locally
- Verify `npm run build` creates a `dist` folder

## 📦 What Gets Deployed

- `dist/index.html` - Main HTML
- `dist/assets/` - Bundled JS/CSS
- All optimized and minified
- No source files or node_modules

## 🎨 Live Preview

After deployment, your site includes:
- ✅ 3-column layout (thumbnails, palettes, micro-palette)
- ✅ 11 palette variations per image
- ✅ 256-color micro palette
- ✅ OKLCH color extraction
- ✅ IBM Plex Serif typography
- ✅ Neutral monochrome UI
- ✅ 14 colors per palette (default)

