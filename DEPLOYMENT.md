# Deploy OpenSource Radar to Vercel

This project is configured for Vercel. The React/Vite build is written to `public/`, which Vercel serves as static assets through its CDN. The root `index.js` exports the Express app as a Vercel Function, and Express handles `/api/health` and `/api/issues`. Do not use the old Render-only instructions for this version.

## 1. Verify locally first

Use Node.js 20 or newer. From the project root:

```bash
npm install
npm test
npm run build
npm start
```

Open `http://localhost:8787` and check `http://localhost:8787/api/health`. The build writes generated frontend assets to `public/`; that directory is ignored by Git because Vercel regenerates it during deployment.

For the Vite development server and its `/api` proxy, use `npm run dev` instead and open the URL printed by Vite (usually `http://localhost:5173`).

## 2. Push the project to GitHub

1. Create a public, empty repository named `opensource-radar` on GitHub.
2. In this project folder, run:

   ```bash
   git init
   git add .
   git commit -m "Prepare OpenSource Radar for Vercel"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/opensource-radar.git
   git push -u origin main
   ```

3. Replace `YOUR_USERNAME` with your GitHub username. If the folder is already a Git repository, do not run `git init` again; just commit and push the changes.
4. Ensure `.env` and real tokens are not committed. `.env.example` is safe to commit because it contains placeholders only.

## 3. Import into Vercel

1. Sign in to [Vercel](https://vercel.com/).
2. Choose **Add New → Project** and import the `opensource-radar` GitHub repository.
3. In project configuration, keep the **Root Directory** as `./` (the folder containing `package.json`, `index.js`, and `vercel.json`).
4. The repository's `vercel.json` specifies the Express framework and `npm run build`. If Vercel asks for settings, use:
   - Framework Preset: **Express** (or the detected Express setting)
   - Install Command: `npm install`
   - Build Command: `npm run build`
   - Output Directory: leave the default/automatic setting; the build emits assets into `public/` for Vercel's static asset handling
   - Root Directory: `./`
5. Before deploying, open **Environment Variables** and add `GITHUB_TOKEN` if you have a GitHub token. It is optional for a demo, but authenticated API calls generally have a higher rate limit. Add it to **Production**, and Preview/Development too if needed. Do not prefix it with `VITE_`, do not put it in source code, and never commit it.
6. Click **Deploy** and wait for the build to finish.

## 4. Verify the deployed site

Replace `YOUR-APP.vercel.app` with the domain shown in the Vercel dashboard:

- Open `https://YOUR-APP.vercel.app/` and check that the interface loads.
- Open `https://YOUR-APP.vercel.app/api/health`; expect JSON with `"ok": true` and an `authenticated` boolean.
- Search for issues in the interface and confirm results load.
- Test repository/language/label/difficulty filters and pagination.
- Bookmark an issue, refresh, and confirm it remains saved in the same browser.
- Create a contribution, change its status, and save an issue/PR URL and notes.
- Check an empty search and simulate a bad network/API response if practical.
- Inspect Vercel **Deployments → Functions/Logs** if an API call returns an error.

The public site URL is not proof that every feature works. Run the manual cases in `TESTING.md` and record only results you actually observed.

## 5. Update the README

After deployment, replace the placeholders near the top of `README.md` with your actual Vercel URL and GitHub repository URL. Commit and push the change; Vercel will create a new deployment automatically.

## Vercel-specific notes

- Vercel runs the Express app as a serverless Function. It is not a long-running server process; do not depend on `app.listen()` being started by Vercel. `server/index.js` only calls `listen()` when executed directly, and root `index.js` exports the app for Vercel.
- Vercel serves static assets from `public/` through its CDN. Express `express.static()` is used for local production testing but is not the mechanism Vercel relies on for static assets.
- The in-memory API caches may reset between function instances or cold starts. They are best-effort optimizations, not persistent storage.
- Browser `localStorage` is local to each browser/device. There is no account system or server-side database.
- GitHub's Search Issues API limits the searchable window to 1,000 results. Rate limits still apply; a token must be configured privately in Vercel settings if needed.
- Vercel's dashboard and plan limits can change. If the deployment UI differs, consult the current [Express on Vercel documentation](https://vercel.com/docs/frameworks/backend/express).
