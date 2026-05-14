# LUKE | SPACE Online Deployment (Vercel)

## 1) Prepare files
This repo is already static-ready:
- `index.html` (main app)
- `agent-intro.html` (agent intro page)
- `listingService.js`
- `supabaseClient.js`
- `config.js`
- `vercel.json`

## 2) Push to GitHub
```bash
git init
git add .
git commit -m "feat: online static build"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

## 3) Import to Vercel
1. Open https://vercel.com/new
2. Import your GitHub repo
3. Framework Preset: `Other`
4. Build Command: leave empty
5. Output Directory: leave empty
6. Deploy

## 4) Set environment variables in Vercel (optional but recommended)
Project Settings -> Environment Variables:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Then Redeploy.

## 5) Access URLs
- Main app: `https://<your-domain>/index`
- Agent intro: `https://<your-domain>/agent-intro`

## 6) Supabase quick check
After setting env vars:
1. Open Studio tab
2. Submit one listing
3. Verify status message shows cloud save success

## 7) Notes
- Without env vars, app still works in local-only mode.
- Never expose `service_role` key in frontend.
