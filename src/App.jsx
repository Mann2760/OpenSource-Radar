import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const STATUSES = ['Interested', 'In Progress', 'PR Submitted', 'Completed'];
const STATUS_CLASS = { 'Interested': 'interested', 'In Progress': 'progress', 'PR Submitted': 'submitted', 'Completed': 'completed' };
const STORAGE_KEY = 'opensource-radar-records-v1';
const readRecords = () => { try { const x = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); return x && typeof x === 'object' ? x : {}; } catch { return {}; } };
const dateLabel = value => { if (!value) return 'Unknown'; const d = new Date(value); return Number.isNaN(d.getTime()) ? 'Unknown' : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(d); };
const relative = value => { const t = new Date(value).getTime(); if (!Number.isFinite(t)) return 'date unavailable'; const days = Math.max(0, Math.floor((Date.now() - t) / 86400000)); return days === 0 ? 'updated today' : days === 1 ? 'updated yesterday' : `updated ${days}d ago`; };
const repoOf = issue => issue.repository || issue.repository_url?.split('/').slice(-2).join('/') || 'unknown/repository';
const recordFor = (records, issue) => records[String(issue.id)] || { status: 'Interested', issueUrl: issue.html_url, prUrl: '', note: '' };

function Icon({ name, size = 18 }) {
  const paths = {
    radar: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12 18.4 5.6M12 3v2M21 12h-2"/></>, search: <><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></>, bookmark: <path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4z"/>, grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>, arrow: <><path d="M7 17 17 7M7 7h10v10"/></>, chevron: <path d="m9 18 6-6-6-6"/>, filter: <><path d="M4 6h16M7 12h10M10 18h4"/><circle cx="8" cy="6" r="1"/><circle cx="15" cy="12" r="1"/></>, plus: <path d="M12 5v14M5 12h14"/>, check: <path d="m5 12 4 4L19 6"/>, close: <path d="m6 6 12 12M18 6 6 18"/>, github: <><path d="M9 19c-4.3 1.3-4.3-2.5-6-3m12 6v-3.9a3.4 3.4 0 0 0-.9-2.7c3-.3 6.1-1.5 6.1-6.7a5.2 5.2 0 0 0-1.4-3.6 4.8 4.8 0 0 0-.1-3.6S17.5 1.2 15 3a13 13 0 0 0-7 0C5.5 1.2 3.3 1.5 3.3 1.5a4.8 4.8 0 0 0-.1 3.6A5.2 5.2 0 0 0 1.8 8.7c0 5.2 3.1 6.4 6.1 6.7A3.4 3.4 0 0 0 7 18.1V22"/></>, clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>, book: <><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22z"/><path d="M4 4v18M8 6h8M8 10h7"/></>, external: <><path d="M14 3h7v7M21 3l-9 9"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></>, alert: <><path d="M10.3 3.9 1.8 18.5A1.7 1.7 0 0 0 3.3 21h17.4a1.7 1.7 0 0 0 1.5-2.5L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 4h.01"/></>
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.radar}</svg>;
}

function App() {
  const [tab, setTab] = useState('discover');
  const [records, setRecords] = useState(readRecords);
  const [issues, setIssues] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [incomplete, setIncomplete] = useState(false);
  const [rateRemaining, setRateRemaining] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('is:open is:issue label:"good first issue"');
  const [searchDraft, setSearchDraft] = useState('');
  const [repoFilter, setRepoFilter] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');
  const [labelFilter, setLabelFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('All difficulties');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [form, setForm] = useState({ status: 'Interested', issueUrl: '', prUrl: '', note: '' });
  const abortRef = useRef(null);

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); } catch { setToast('Browser storage is full. Export or remove some records.'); } }, [records]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 2600); return () => clearTimeout(t); }, [toast]);

  const fetchIssues = useCallback(async (nextPage = 1, search = query) => {
    abortRef.current?.abort(); const controller = new AbortController(); abortRef.current = controller;
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ q: search, page: String(nextPage), per_page: '12' });
      const response = await fetch(`/api/issues?${params}`, { signal: controller.signal });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { const e = new Error(data.error || 'Could not load issues.'); e.hint = data.hint; e.rateLimitReset = data.rateLimitReset; throw e; }
      setIssues(Array.isArray(data.items) ? data.items : []); setTotal(Number(data.total_count) || 0); setPage(nextPage); setIncomplete(Boolean(data.incomplete_results)); setRateRemaining(data.rateLimitRemaining ?? null);
    } catch (e) { if (e.name !== 'AbortError') setError(`${e.message}${e.hint ? ` ${e.hint}` : ''}`); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, [query]);
  useEffect(() => { fetchIssues(1, query); return () => abortRef.current?.abort(); }, [fetchIssues, query]);

  const allIssues = useMemo(() => { const m = new Map(); issues.forEach(i => m.set(String(i.id), i)); Object.entries(records).forEach(([id, r]) => { if (r.issue && !m.has(id)) m.set(id, r.issue); }); return [...m.values()]; }, [issues, records]);
  const visibleIssues = useMemo(() => issues.filter(i => {
    const r = recordFor(records, i);
    if (repoFilter && !repoOf(i).toLowerCase().includes(repoFilter.toLowerCase())) return false;
    if (languageFilter && languageFilter !== 'Unknown' && (i.language || 'Unknown') !== languageFilter) return false;
    if (labelFilter && !i.labels.some(l => l.toLowerCase().includes(labelFilter.toLowerCase()))) return false;
    if (difficultyFilter !== 'All difficulties' && i.difficulty !== difficultyFilter) return false;
    if (statusFilter !== 'All statuses' && r.status !== statusFilter) return false;
    return true;
  }), [issues, records, repoFilter, languageFilter, labelFilter, difficultyFilter, statusFilter]);
  const tracked = useMemo(() => Object.entries(records).map(([id, r]) => ({ id, ...r })).filter(r => r.issue), [records]);
  const counts = useMemo(() => STATUSES.reduce((a, s) => ({ ...a, [s]: tracked.filter(r => r.status === s).length }), {}), [tracked]);
  const repoCounts = useMemo(() => { const map = {}; tracked.forEach(r => { const repo = repoOf(r.issue); map[repo] = (map[repo] || 0) + 1; }); return Object.entries(map).sort((a,b) => b[1]-a[1]).slice(0,5); }, [tracked]);
  const savedCount = Object.values(records).filter(r => r.bookmarked).length;
  const openEditor = issue => { const r = recordFor(records, issue); setSelected(issue); setForm({ status: r.status || 'Interested', issueUrl: r.issueUrl || issue.html_url || '', prUrl: r.prUrl || '', note: r.note || '' }); };
  const saveRecord = () => {
    if (!selected) return;
    try { for (const [label, value] of [['Issue URL', form.issueUrl], ['Pull request URL', form.prUrl]]) { if (value && !/^https:\/\/(github\.com|www\.github\.com)\/[\w.-]+\/[\w.-]+(?:\/.*)?$/i.test(value)) { setToast(`${label} must be a valid GitHub repository URL.`); return; } }
      setRecords(prev => ({ ...prev, [String(selected.id)]: { ...(prev[String(selected.id)] || {}), issue: selected, status: form.status, issueUrl: form.issueUrl.trim(), prUrl: form.prUrl.trim(), note: form.note.slice(0, 500), updatedAt: new Date().toISOString() } })); setSelected(null); setToast('Contribution saved');
    } catch { setToast('Could not save this contribution.'); }
  };
  const toggleBookmark = issue => { const id = String(issue.id); setRecords(prev => ({ ...prev, [id]: { ...(prev[id] || {}), issue, status: prev[id]?.status || 'Interested', issueUrl: prev[id]?.issueUrl || issue.html_url, prUrl: prev[id]?.prUrl || '', note: prev[id]?.note || '', bookmarked: !prev[id]?.bookmarked } })); setToast(records[id]?.bookmarked ? 'Removed from saved issues' : 'Issue bookmarked'); };
  const trackedIssues = tracked.filter(r => r.bookmarked || r.status !== 'Interested' || tab === 'saved').map(r => r.issue);
  const displayed = tab === 'saved' ? tracked.filter(r => r.bookmarked).map(r => r.issue) : visibleIssues;
  const languages = [...new Set(issues.map(i => i.language || 'Unknown'))].sort();

  const setQuickStatus = (issue, status) => { setRecords(prev => ({ ...prev, [String(issue.id)]: { ...(prev[String(issue.id)] || {}), issue, issueUrl: prev[String(issue.id)]?.issueUrl || issue.html_url, prUrl: prev[String(issue.id)]?.prUrl || '', note: prev[String(issue.id)]?.note || '', status, updatedAt: new Date().toISOString() } })); setToast(`Moved to ${status}`); };
  const search = e => { e.preventDefault(); const q = searchDraft.trim(); if (!q) { setToast('Enter a GitHub search query first.'); return; } if (q.length > 240) { setToast('Search query must be under 240 characters.'); return; } setQuery(q); setSearchDraft(''); setTab('discover'); setPage(1); };

  return <div className="app-shell">
    <aside className="sidebar"><div className="brand"><div className="brand-mark"><Icon name="radar" size={23}/></div><div><div className="brand-name">open<span>source</span></div><div className="brand-sub">RADAR / CONTRIBUTION INTELLIGENCE</div></div></div>
      <div className="workspace-label">WORKSPACE</div><nav className="nav" aria-label="Main navigation">
        <button className={tab === 'discover' ? 'nav-item active' : 'nav-item'} onClick={() => setTab('discover')}><Icon name="search"/><span>Discover issues</span><span className="nav-count">{total ? total.toLocaleString() : '—'}</span></button>
        <button className={tab === 'saved' ? 'nav-item active' : 'nav-item'} onClick={() => setTab('saved')}><Icon name="bookmark"/><span>Saved for later</span><span className="nav-count">{savedCount}</span></button>
        <button className={tab === 'dashboard' ? 'nav-item active' : 'nav-item'} onClick={() => setTab('dashboard')}><Icon name="grid"/><span>My contributions</span></button>
      </nav>
      <div className="sidebar-bottom"><div className="signal-card"><div className="signal-heading"><span className="signal-dot"/> LIVE SIGNAL</div><p>Public issues, straight from GitHub.</p><small>{rateRemaining === null ? 'Connecting to source…' : `${rateRemaining} API requests remaining`}</small></div><div className="sidebar-foot"><Icon name="github" size={15}/> Powered by GitHub Search API</div></div>
    </aside>
    <main className="main"><header className="topbar"><div className="crumb">OPEN SOURCE <span>/</span> <b>{tab === 'discover' ? 'DISCOVER' : tab === 'saved' ? 'BOOKMARKS' : 'CONTRIBUTIONS'}</b></div><div className="topbar-right"><span className="live-pill"><i/> LIVE DATA</span><div className="avatar">OS</div></div></header>
      <section className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line"/> YOUR NEXT CONTRIBUTION STARTS HERE</div><h1>{tab === 'discover' ? <>Find your next<br/><em>open-source win.</em></> : tab === 'saved' ? <>Your shortlist.<br/><em>Zero noise.</em></> : <>Small commits.<br/><em>Real progress.</em></>}</h1><p className="heading-copy">{tab === 'discover' ? 'A signal-first view of open issues worth your time. Find a fit, make it yours, ship something useful.' : tab === 'saved' ? 'The issues you have bookmarked, ready when you are.' : 'A clear view of what you are exploring, building, and shipping.'}</p></div><div className="heading-stats"><div className="stat-block"><span className="stat-label">ISSUES FOUND</span><strong>{total.toLocaleString()}</strong><small>matching current query</small></div><div className="stat-divider"/><div className="stat-block"><span className="stat-label">YOU'RE TRACKING</span><strong>{tracked.length.toString().padStart(2,'0')}</strong><small>contribution records</small></div></div></section>
      {tab !== 'dashboard' && <section className="search-panel"><form className="search-form" onSubmit={search}><Icon name="search" size={20}/><input aria-label="Search GitHub issues" value={searchDraft} onChange={e => setSearchDraft(e.target.value)} placeholder="Search by issue, repo, language, or GitHub query…"/><kbd>↵</kbd><button type="submit" className="search-submit">Search issues <Icon name="arrow" size={15}/></button></form><div className="search-presets"><span>TRY A SIGNAL</span><button onClick={() => setQuery('is:open is:issue label:"good first issue"')}>Good first issues</button><button onClick={() => setQuery('is:open is:issue label:help-wanted')}>Help wanted</button><button onClick={() => setQuery('is:open is:issue language:python')}>Python</button><button onClick={() => setQuery('is:open is:issue label:bug')}>Bug fixes</button><button className="filter-toggle" onClick={() => setShowFilters(v => !v)}><Icon name="filter" size={15}/> Filters {showFilters ? '−' : '+'}</button></div>
        {showFilters && <div className="filters-grid"><label>Repository<input value={repoFilter} onChange={e => setRepoFilter(e.target.value)} placeholder="owner/repo or partial name"/></label><label>Language<select value={languageFilter} onChange={e => setLanguageFilter(e.target.value)}><option value="">All languages</option>{languages.map(l => <option key={l}>{l}</option>)}</select></label><label>Label contains<input value={labelFilter} onChange={e => setLabelFilter(e.target.value)} placeholder="e.g. documentation"/></label><label>Difficulty<select value={difficultyFilter} onChange={e => setDifficultyFilter(e.target.value)}>{['All difficulties','Beginner','Intermediate','Advanced','Unclassified'].map(x => <option key={x}>{x}</option>)}</select></label><label>Tracking status<select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>{['All statuses', ...STATUSES].map(x => <option key={x}>{x}</option>)}</select></label><button className="clear-filters" onClick={() => { setRepoFilter(''); setLanguageFilter(''); setLabelFilter(''); setDifficultyFilter('All difficulties'); setStatusFilter('All statuses'); }}>Clear filters</button></div>}
      </section>}
      {tab === 'dashboard' ? <Dashboard tracked={tracked} counts={counts} repoCounts={repoCounts} onEdit={openEditor} onStatus={setQuickStatus} onDiscover={() => setTab('discover')}/> : <>
        <div className="results-bar"><div><span className="section-kicker">{tab === 'saved' ? 'YOUR BOOKMARKS' : 'THE RADAR FEED'}</span><h2>{tab === 'saved' ? 'Saved issues' : 'Issues worth a closer look'} <span className="result-count">{tab === 'saved' ? issues.filter(i => records[String(i.id)]?.bookmarked).length : visibleIssues.length}</span></h2></div><div className="results-meta"><span className="sort-indicator"><i/> Sorted by recently updated</span><span className="page-indicator">PAGE {page.toString().padStart(2,'0')}</span></div></div>
        {incomplete && <div className="notice"><Icon name="alert" size={17}/> GitHub marked these results incomplete. Some matching issues may be missing.</div>}
        {error && <div className="error-panel"><div className="error-icon"><Icon name="alert"/></div><div><strong>Couldn’t reach the radar</strong><p>{error}</p><button className="text-button" onClick={() => fetchIssues(page)}>Try again →</button></div></div>}
        {loading && <div className="loading-state"><div className="loader"/><div><strong>Scanning the open-source universe</strong><p>Fetching fresh issues from GitHub…</p></div></div>}
        {!loading && !error && displayed.length === 0 && <div className="empty-state"><div className="empty-icon"><Icon name={tab === 'saved' ? 'bookmark' : 'search'} size={25}/></div><h3>{tab === 'saved' ? 'No bookmarks in this result page' : 'No issues on this signal'}</h3><p>{tab === 'saved' ? 'Bookmark an issue from Discover, or broaden your search query.' : 'Try removing a filter or using a broader GitHub search query.'}</p><button className="outline-button" onClick={() => { setTab('discover'); setQuery('is:open is:issue'); setRepoFilter(''); setLanguageFilter(''); setLabelFilter(''); setDifficultyFilter('All difficulties'); setStatusFilter('All statuses'); }}>Reset to all open issues</button></div>}
        {!loading && !error && displayed.length > 0 && <div className="issue-list">{displayed.map((issue, index) => <IssueRow key={issue.id} issue={issue} record={recordFor(records, issue)} index={index} onBookmark={() => toggleBookmark(issue)} onEdit={() => openEditor(issue)} onStatus={status => setQuickStatus(issue, status)}/>)}</div>}
        {tab !== 'saved' && <div className="pagination"><div>Showing <b>{displayed.length ? ((page-1)*12+1) : 0}–{(page-1)*12+displayed.length}</b> of <b>{Math.min(total, 1000).toLocaleString()}</b> results{total > 1000 ? ' (GitHub search caps results at 1,000)' : ''}</div><div className="page-actions"><button disabled={loading || page <= 1} onClick={() => fetchIssues(page-1)} aria-label="Previous page">←</button><span>{page}</span><button disabled={loading || page*12 >= Math.min(total,1000)} onClick={() => fetchIssues(page+1)} aria-label="Next page">→</button></div></div>}
      </>}
      <footer className="footer"><span>OPENSOURCE RADAR <span className="footer-dot">·</span> BUILT FOR THE BUILDERS</span><span>Difficulty labels are inferred from issue labels, not guesses.</span></footer>
    </main>
    {selected && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setSelected(null); }}><section className="editor-modal" role="dialog" aria-modal="true" aria-labelledby="editor-title"><div className="modal-top"><div><div className="eyebrow">CONTRIBUTION WORKSPACE</div><h2 id="editor-title">Track this issue</h2></div><button className="icon-button" onClick={() => setSelected(null)} aria-label="Close editor"><Icon name="close"/></button></div><div className="modal-issue"><span className="repo-label">{repoOf(selected)}</span><h3>{selected.title}</h3><a href={selected.html_url} target="_blank" rel="noreferrer">Open original issue <Icon name="external" size={14}/></a></div><label className="field-label">Contribution stage<select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></label><label className="field-label">Issue URL<input value={form.issueUrl} onChange={e => setForm(f => ({ ...f, issueUrl: e.target.value }))} placeholder="https://github.com/owner/repo/issues/123"/></label><label className="field-label">Pull request URL <span className="optional">OPTIONAL UNTIL SUBMITTED</span><input value={form.prUrl} onChange={e => setForm(f => ({ ...f, prUrl: e.target.value }))} placeholder="https://github.com/owner/repo/pull/456"/></label><label className="field-label">Personal notes <span className="optional">{form.note.length}/500</span><textarea rows="3" maxLength="500" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="What will you investigate? Any setup notes or next steps…"/></label><div className="modal-actions"><button className="outline-button" onClick={() => setSelected(null)}>Cancel</button><button className="primary-button" onClick={saveRecord}><Icon name="check" size={16}/> Save contribution</button></div></section></div>}
    {toast && <div className="toast" role="status"><Icon name="check" size={16}/>{toast}</div>}
  </div>;
}

function IssueRow({ issue, record, index, onBookmark, onEdit, onStatus }) {
  const [expanded, setExpanded] = useState(false);
  const body = (issue.body || '').replace(/\r/g, '').trim();
  const hasMore = body.length > 180;
  return <article className="issue-row" style={{ '--row-index': index }}><div className="issue-main"><div className="issue-topline"><span className="issue-number">#{issue.number}</span><span className="repo-name">{repoOf(issue)}</span><span className="updated-time"><Icon name="clock" size={13}/>{relative(issue.updated_at)}</span><button className={record.bookmarked ? 'bookmark-button saved' : 'bookmark-button'} onClick={onBookmark} aria-label={record.bookmarked ? 'Remove bookmark' : 'Bookmark issue'} title={record.bookmarked ? 'Remove bookmark' : 'Bookmark issue'}><Icon name="bookmark" size={17}/></button></div><h3 className="issue-title"><a href={issue.html_url} target="_blank" rel="noreferrer">{issue.title}<Icon name="external" size={14}/></a></h3>{body && <div className="issue-description">{expanded ? body : `${body.slice(0, 180)}${hasMore ? '…' : ''}`}{hasMore && <button className="inline-expand" onClick={() => setExpanded(v => !v)}>{expanded ? ' show less' : ' read more'}</button>}</div>}<div className="issue-bottom"><div className="labels">{(issue.labels || []).slice(0,4).map(label => <span className="label-chip" key={label}>{label}</span>)}{(issue.labels || []).length > 4 && <span className="label-chip muted">+{issue.labels.length-4}</span>}</div><div className="issue-metrics"><span><Icon name="book" size={14}/>{issue.comments} comments</span><span className={`difficulty ${issue.difficulty.toLowerCase()}`}>{issue.difficulty}</span></div></div></div><aside className="issue-side"><span className={`status-badge ${STATUS_CLASS[record.status] || 'interested'}`}><i/>{record.status || 'Interested'}</span><button className="track-button" onClick={onEdit}>{record.status && record.status !== 'Interested' ? 'Update tracking' : 'Track issue'} <Icon name="arrow" size={14}/></button><div className="quick-stage"><label htmlFor={`stage-${issue.id}`}>MOVE TO</label><select id={`stage-${issue.id}`} value={record.status || 'Interested'} onChange={e => onStatus(e.target.value)} aria-label={`Move ${issue.title} to status`} >{STATUSES.map(s => <option key={s}>{s}</option>)}</select></div></aside></article>;
}

function Dashboard({ tracked, counts, repoCounts, onEdit, onStatus, onDiscover }) {
  return <section className="dashboard"><div className="dashboard-intro"><div><span className="section-kicker">YOUR CONTRIBUTION JOURNEY</span><h2>Progress, not just tabs.</h2><p>Every issue you track is a small step toward becoming a consistent contributor.</p></div><button className="primary-button" onClick={onDiscover}><Icon name="plus" size={16}/> Find an issue</button></div><div className="stat-cards">{STATUSES.map((s, i) => <div className={`dash-stat ${STATUS_CLASS[s]}`} key={s}><div className="dash-stat-top"><span>{s}</span><span className="dash-index">0{i+1}</span></div><strong>{counts[s] || 0}</strong><div className="dash-bar"><i style={{ width: `${tracked.length ? ((counts[s] || 0)/tracked.length)*100 : 0}%` }}/></div><small>{s === 'Interested' ? 'On your radar' : s === 'In Progress' ? 'Actively being worked on' : s === 'PR Submitted' ? 'Waiting for review' : 'Across the finish line'}</small></div>)}</div><div className="dashboard-columns"><section className="dash-panel repo-panel"><div className="panel-heading"><div><span className="section-kicker">WHERE YOU CONTRIBUTE</span><h3>Repository activity</h3></div><span className="panel-count">{repoCounts.length} repos</span></div>{repoCounts.length ? repoCounts.map(([repo, count]) => <div className="repo-row" key={repo}><div className="repo-monogram">{repo.split('/').slice(-1)[0].slice(0,2).toUpperCase()}</div><div className="repo-row-main"><strong>{repo}</strong><div className="repo-progress"><i style={{ width: `${Math.max(8,count/Math.max(...repoCounts.map(x=>x[1]))*100)}%` }}/></div></div><span className="repo-issue-count">{count} {count === 1 ? 'issue' : 'issues'}</span></div>) : <div className="panel-empty">Your repository activity will appear here when you start tracking issues.</div>}</section><section className="dash-panel recent-panel"><div className="panel-heading"><div><span className="section-kicker">PICK UP WHERE YOU LEFT OFF</span><h3>Recent tracking</h3></div><span className="panel-count">{tracked.length} total</span></div>{tracked.length ? tracked.slice().sort((a,b) => new Date(b.updatedAt || 0)-new Date(a.updatedAt || 0)).slice(0,5).map(r => <div className="recent-row" key={r.id}><div className="recent-marker"><i/></div><div className="recent-content"><strong>{r.issue?.title || 'Untitled issue'}</strong><span>{repoOf(r.issue)} · {dateLabel(r.updatedAt)}</span><div className="recent-actions"><span className={`status-badge ${STATUS_CLASS[r.status] || 'interested'}`}><i/>{r.status}</span><button onClick={() => onEdit(r.issue)}>Edit record ↗</button></div></div></div>) : <div className="panel-empty">No contributions tracked yet. Find an issue that interests you and give it a stage.</div>}</section></div><div className="method-note"><Icon name="alert" size={17}/><div><strong>How difficulty is classified</strong><p>Beginner, Intermediate, and Advanced are only assigned when matching labels exist on the issue. Everything else stays Unclassified. GitHub Search does not reliably provide repository language per issue, so the language filter reflects only data explicitly available from the API.</p></div></div></section>;
}

export default App;
