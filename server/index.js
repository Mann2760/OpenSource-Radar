import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyDifficulty } from './difficulty.js';
dotenv.config();
const app = express();
const PORT = Number(process.env.PORT || 8787);
app.use(cors());
app.use(express.json({ limit: '100kb' }));
const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'OpenSource-Radar/1.0' };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
const cache = new Map();
const repoLanguageCache = new Map();
const CACHE_MS = 60_000;
const REPO_CACHE_MS = 6 * 60 * 60_000;
async function getRepoLanguage(repositoryUrl) {
  if (!repositoryUrl) return null;
  const cached = repoLanguageCache.get(repositoryUrl);
  if (cached && Date.now() - cached.at < REPO_CACHE_MS) return cached.language;
  try {
    const response = await fetch(repositoryUrl, { headers, signal: AbortSignal.timeout(7000) });
    if (!response.ok) return null;
    const data = await response.json();
    const language = typeof data.language === 'string' ? data.language : null;
    repoLanguageCache.set(repositoryUrl, { at: Date.now(), language });
    return language;
  } catch { return null; }
}
app.get('/api/health', (_req, res) => res.json({ ok: true, authenticated: Boolean(process.env.GITHUB_TOKEN) }));
app.get('/api/issues', async (req, res) => {
  const q = String(req.query.q || 'is:open is:issue').trim();
  const page = Math.max(1, Math.min(100, Number.parseInt(req.query.page || '1', 10) || 1));
  const perPage = Math.max(1, Math.min(30, Number.parseInt(req.query.per_page || '12', 10) || 12));
  if (q.length > 240) return res.status(400).json({ error: 'Search query is too long. Keep it under 240 characters.' });
  const key = `${q}|${page}|${perPage}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return res.json({ ...hit.data, cached: true });
  try {
    const url = new URL('https://api.github.com/search/issues');
    url.searchParams.set('q', q.includes('is:issue') ? q : `${q} is:issue`);
    url.searchParams.set('sort', 'updated'); url.searchParams.set('order', 'desc');
    url.searchParams.set('page', String(page)); url.searchParams.set('per_page', String(perPage));
    const upstream = await fetch(url, { headers, signal: AbortSignal.timeout(12000) });
    const remaining = upstream.headers.get('x-ratelimit-remaining');
    const reset = upstream.headers.get('x-ratelimit-reset');
    if (!upstream.ok) {
      const body = await upstream.json().catch(() => ({}));
      if (upstream.status === 403 || upstream.status === 429) return res.status(429).json({ error: body.message || 'GitHub API rate limit reached.', rateLimitRemaining: remaining, rateLimitReset: reset, hint: 'Wait for the reset or configure GITHUB_TOKEN in .env.' });
      return res.status(upstream.status).json({ error: body.message || `GitHub returned HTTP ${upstream.status}.` });
    }
    const body = await upstream.json();
    const rawItems = body.items || [];
    // Repository language is not included in Search Issues results. Enrich this page using a 6-hour cache.
    const languages = await Promise.all(rawItems.map(issue => getRepoLanguage(issue.repository_url)));
    const data = { total_count: body.total_count || 0, incomplete_results: Boolean(body.incomplete_results), page, per_page: perPage, rateLimitRemaining: remaining, rateLimitReset: reset, items: rawItems.map((issue, index) => ({
      id: issue.id, number: issue.number, title: issue.title, html_url: issue.html_url,
      repository_url: issue.repository_url, repository: issue.repository_url?.split('/').slice(-2).join('/') || 'unknown',
      user: issue.user?.login || 'unknown', user_avatar: issue.user?.avatar_url || '', created_at: issue.created_at, updated_at: issue.updated_at,
      comments: issue.comments || 0, labels: (issue.labels || []).map(l => l.name), body: (issue.body || '').slice(0, 1400),
      state: issue.state, is_pull_request: Boolean(issue.pull_request), language: languages[index] || null, difficulty: classifyDifficulty(issue)
    })) };
    cache.set(key, { at: Date.now(), data });
    return res.json(data);
  } catch (error) {
    const timedOut = error.name === 'TimeoutError' || error.name === 'AbortError';
    return res.status(502).json({ error: timedOut ? 'GitHub took too long to respond. Try again.' : 'Could not reach GitHub. Check your connection and try again.' });
  }
});
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../public');
// Local production runs serve built assets from public/. On Vercel, files in
// public/ are served by its CDN; Express remains responsible for /api routes.
app.use(express.static(publicDir));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  return res.sendFile(path.join(publicDir, 'index.html'), err => {
    if (err) res.status(404).send('Build the client first with npm run build.');
  });
});

export default app;

// Avoid starting a second listener when Vercel imports this module.
const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  app.listen(PORT, () => console.log(`OpenSource Radar API listening on http://localhost:${PORT}`));
}
