import { useState, useEffect, useCallback } from 'react';

const TOKEN_KEY = 'analytics_token';

// ── Simple inline bar chart using CSS flex ──────────────────────────────────
function BarChart({ data }) {
  if (!data || Object.keys(data).length === 0) {
    return <p className="text-sm text-gray-400">Ingen data</p>;
  }

  const entries = Object.entries(data);
  const maxVal = Math.max(...entries.map(([, v]) => v.page_views + v.ferry_views), 1);

  return (
    <div className="overflow-x-auto">
      <div className="flex items-end gap-0.5 h-24 min-w-max">
        {entries.map(([day, v]) => {
          const total = v.page_views + v.ferry_views;
          const heightPct = Math.round((total / maxVal) * 100);
          return (
            <div key={day} className="flex flex-col items-center gap-0.5 group relative" style={{ width: 16 }}>
              <div
                className="w-3 bg-ferry-blue dark:bg-blue-400 rounded-t transition-all"
                style={{ height: `${heightPct}%`, minHeight: total > 0 ? 2 : 0 }}
                title={`${day}: ${v.page_views} page views, ${v.ferry_views} ferry views`}
              />
            </div>
          );
        })}
      </div>
      {/* x-axis: show first, middle, and last label only */}
      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <span>{entries[0]?.[0]}</span>
        <span>{entries[Math.floor(entries.length / 2)]?.[0]}</span>
        <span>{entries[entries.length - 1]?.[0]}</span>
      </div>
    </div>
  );
}

function Card({ label, value }) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-ferry-border dark:border-slate-700 rounded-lg p-4 flex flex-col gap-1">
      <span className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
      <span className="text-2xl font-bold text-ferry-navy dark:text-white">{value ?? '–'}</span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="mb-6">
      <h2 className="text-xs font-bold uppercase tracking-widest text-ferry-blue dark:text-blue-300 mb-3 border-b border-ferry-border dark:border-slate-700 pb-1">
        {title}
      </h2>
      {children}
    </section>
  );
}

function DataTable({ rows, columns }) {
  if (!rows?.length) return <p className="text-sm text-gray-400 dark:text-slate-500">Ingen data</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ferry-border dark:border-slate-700">
            {columns.map((col) => (
              <th key={col.key} className="text-left py-1.5 pr-4 text-xs text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wide">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-ferry-border/40 dark:border-slate-700/50 hover:bg-ferry-bg dark:hover:bg-slate-800/60">
              {columns.map((col) => (
                <td key={col.key} className="py-1.5 pr-4 text-ferry-navy dark:text-slate-200 break-all">
                  {row[col.key] ?? '–'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Login form ───────────────────────────────────────────────────────────────
function LoginForm({ onLogin, error }) {
  const [input, setInput] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (input.trim()) onLogin(input.trim());
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-ferry-bg dark:bg-slate-900">
      <form
        onSubmit={submit}
        className="bg-white dark:bg-slate-800 border border-ferry-border dark:border-slate-700 rounded-xl shadow-md p-8 w-full max-w-sm flex flex-col gap-4"
      >
        <h1 className="text-lg font-bold text-ferry-navy dark:text-white">Analytics</h1>
        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Token"
          autoFocus
          className="border border-ferry-border dark:border-slate-600 rounded px-3 py-2 text-sm bg-ferry-bg dark:bg-slate-700 text-ferry-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-ferry-blue"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          type="submit"
          className="bg-ferry-navy dark:bg-slate-700 text-white text-sm font-semibold px-4 py-2 rounded hover:bg-ferry-blue dark:hover:bg-slate-600 transition-colors"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────
export default function Analytics() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) ?? '');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loginError, setLoginError] = useState(null);

  const fetchData = useCallback(async (tkn) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analytics', {
        headers: { Authorization: `Bearer ${tkn}` },
      });
      if (res.status === 401) {
        sessionStorage.removeItem(TOKEN_KEY);
        setToken('');
        setLoginError('Invalid token. Please try again.');
        return;
      }
      if (res.status === 503) {
        setError('Analytics is disabled on this server (ANALYTICS_TOKEN not configured).');
        return;
      }
      if (!res.ok) {
        setError(`Server error: ${res.status}`);
        return;
      }
      setData(await res.json());
    } catch (err) {
      setError(`Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) fetchData(token);
  }, [token, fetchData]);

  const handleLogin = (tkn) => {
    sessionStorage.setItem(TOKEN_KEY, tkn);
    setLoginError(null);
    setToken(tkn);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken('');
    setData(null);
    setLoginError(null);
  };

  if (!token) {
    return <LoginForm onLogin={handleLogin} error={loginError} />;
  }

  return (
    <div className="min-h-screen bg-ferry-bg dark:bg-slate-900 text-ferry-navy dark:text-white">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-ferry-navy dark:text-white">Analytics</h1>
          <div className="flex gap-2">
            <button
              onClick={() => fetchData(token)}
              disabled={loading}
              className="text-xs bg-ferry-navy dark:bg-slate-700 text-white px-3 py-1.5 rounded hover:bg-ferry-blue dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading…' : 'Refresh'}
            </button>
            <button
              onClick={handleLogout}
              className="text-xs border border-ferry-border dark:border-slate-600 text-ferry-navy dark:text-slate-300 px-3 py-1.5 rounded hover:bg-ferry-light dark:hover:bg-slate-700 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {loading && !data && (
          <div className="flex items-center justify-center py-16">
            <p className="text-ferry-blue dark:text-blue-300 animate-pulse text-sm">Loading analytics…</p>
          </div>
        )}

        {data && (
          <>
            {/* Summary cards */}
            <Section title="Summary">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
                <Card label="Page views" value={data.summary.total_page_views.toLocaleString()} />
                <Card label="Ferry views" value={data.summary.total_ferry_views.toLocaleString()} />
                <Card label="Unique visitors" value={data.summary.total_unique_visitors.toLocaleString()} />
                <Card label="Top ferry" value={data.summary.most_popular_ferry} />
              </div>
            </Section>

            {/* Daily bar chart */}
            <Section title="Daily views (last 30 days)">
              <BarChart data={data.views_per_day} />
              <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-2">
                Bars represent total page + ferry views per day (Helsinki time).
              </p>
            </Section>

            {/* Top ferries */}
            <Section title="Top ferries">
              <DataTable
                rows={data.top_ferries}
                columns={[
                  { key: 'slug', label: 'Ferry slug' },
                  { key: 'count', label: 'Views' },
                ]}
              />
            </Section>

            {/* Top user-agents */}
            <Section title="Top user-agents">
              <DataTable
                rows={data.top_user_agents}
                columns={[
                  { key: 'ua', label: 'User-agent' },
                  { key: 'count', label: 'Count' },
                ]}
              />
            </Section>
          </>
        )}
      </div>
    </div>
  );
}
