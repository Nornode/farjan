import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';
import { useFerryData } from '../hooks/useFerryData.js';
import { useFerrySelector } from '../hooks/useFerrySelector.js';

function formatLocalTime(isoString, timezone = 'Europe/Helsinki') {
  if (!isoString) return '–';
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(isoString));
}

function Section({ title, children }) {
  return (
    <section className="mb-5">
      <h2 className="text-xs font-bold uppercase tracking-widest text-ferry-blue dark:text-blue-300 mb-2 border-b border-ferry-border dark:border-slate-700 pb-1">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex flex-wrap gap-x-3 text-sm py-0.5">
      <span className="text-gray-500 dark:text-slate-400 min-w-[130px]">{label}</span>
      <span className="font-medium break-all text-ferry-navy dark:text-slate-100">{value ?? '–'}</span>
    </div>
  );
}

function DeparturePills({ departures }) {
  if (!departures?.length) {
    return <p className="text-sm text-gray-400 dark:text-slate-500">Inga avgångar</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {departures.map((dep, i) => (
        <span
          key={`${dep}-${i}`}
          className="text-xs border border-ferry-border dark:border-slate-600 text-ferry-navy dark:text-slate-300 rounded px-1.5 py-0.5 font-mono"
        >
          {dep}
        </span>
      ))}
    </div>
  );
}

export default function Metadata({ selectedSlug, selectedFerry, isIos, onInstall, isInstalled }) {
  const { ferrySlug } = useParams();
  const { selectedFerry: selectedFerryFromHook } = useFerrySelector();
  const { data, error, loading, isRefreshing, refetch } = useFerryData(selectedSlug);
  const [notification, setNotification] = useState(null);

  async function handleRefresh() {
    setNotification({ type: 'loading', message: 'Hämtar senaste tidtabell från Finferries…' });
    try {
      await refetch(true);
      setNotification({ type: 'success', message: 'Tidtabellen och pauserna har uppdaterats!' });
      setTimeout(() => setNotification(null), 4000);
    } catch {
      setNotification({ type: 'error', message: 'Kunde inte uppdatera tidtabellen. Försök igen senare.' });
      setTimeout(() => setNotification(null), 5000);
    }
  }

  // Use ferry from hook if available, fallback to prop
  const ferry = selectedFerryFromHook || selectedFerry;
  const ferryName = ferry?.name ?? 'Okänd färja';
  const ferryId = ferrySlug || 'skaldo';
  const title = `${ferryName} – Info`;
  const description = `Detaljerad information om ${ferryName} färjans tidtabell och avgångar via Finferries.`;
  const canonicalUrl = `https://farjan.lagus.net/${ferryId}/metadata`;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-ferry-blue dark:text-blue-300 animate-pulse text-sm">Laddar…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <p className="text-red-500 text-sm">{error ?? 'Ingen data tillgänglig'}</p>
      </div>
    );
  }

  const { metadata, timetables } = data;
  const islandLocation = timetables?.island?.location ?? 'Ö';
  const mainlandLocation = timetables?.mainland?.location ?? 'Fastland';

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonicalUrl} />
      </Helmet>
      <div className="flex-1 overflow-y-auto px-4 py-4 max-w-lg mx-auto w-full">

      <Section title="Om tjänsten">
        {isInstalled ? (
          <p className="text-sm text-gray-500 dark:text-slate-400">Appen är redan installerad på din enhet.</p>
        ) : isIos ? (
          <p className="text-sm text-gray-600 dark:text-slate-300">
            Installera appen: tryck på{' '}
            <span className="font-semibold">Dela</span> i Safari och välj{' '}
            <span className="font-semibold">"Lägg till på hemskärmen"</span>.
          </p>
        ) : (
          <div className="flex items-center gap-3">
            <p className="text-sm text-gray-600 dark:text-slate-300">Lägg till appen på hemskärmen för snabbare åtkomst.</p>
            <button
              onClick={onInstall}
              className="shrink-0 px-3 py-1.5 rounded-full bg-ferry-navy dark:bg-slate-700 text-white text-xs font-semibold hover:bg-ferry-blue dark:hover:bg-slate-600 transition-colors"
            >
              Installera
            </button>
          </div>
        )}
      </Section>

      <Section title="Färja">
        <Row label="Namn" value={ferryName} />
        <Row label="Slug" value={selectedSlug ?? '–'} />
        <div className="flex flex-wrap gap-x-3 text-sm py-0.5">
          <span className="text-gray-500 dark:text-slate-400 min-w-[130px]">Tidtabell-URL</span>
          {metadata?.timetableUrl ? (
            <a
              href={metadata.timetableUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium break-all text-ferry-blue dark:text-blue-300 hover:underline"
            >
              {metadata.timetableUrl}
            </a>
          ) : (
            <span className="font-medium text-ferry-navy dark:text-slate-100">–</span>
          )}
        </div>
      </Section>

      <Section title="Skrapning">
        <Row label="Status" value={metadata?.scraperStatus === 'success' ? 'OK' : 'Fel'} />
        <Row label="Skrapad (Helsingfors)" value={formatLocalTime(metadata?.lastScrapedAt)} />
        <Row label="Skrapad (UTC)" value={metadata?.lastScrapedAt?.replace('T', ' ').replace('Z', ' UTC')} />
        <Row label="Begärd" value={formatLocalTime(metadata?.requestedAt)} />
        {metadata?.errorMessage && (
          <Row label="Felmeddelande" value={metadata.errorMessage} />
        )}
      </Section>

      <Section title="Tidtabell">
        <Row label="Giltig fr.o.m." value={metadata?.validityFrom ?? '–'} />
        <Row label="Tidszon" value={metadata?.timezone} />
        <Row label={`Avgångar (${islandLocation})`} value={`${timetables?.island?.departures?.length ?? 0} st`} />
        <Row label={`Avgångar (${mainlandLocation})`} value={`${timetables?.mainland?.departures?.length ?? 0} st`} />
      </Section>

      <Section title="Uppehåll (Tauot / Pauser)">
        {metadata?.breaks?.length ? (
          <ul className="space-y-1">
            {metadata.breaks.map((b, i) => (
              <li key={`${b.start}-${b.end}`} className="text-sm">
                <span className="inline-block bg-ferry-light dark:bg-slate-700 text-ferry-navy dark:text-slate-100 rounded px-2 py-0.5">
                  {b.start}–{b.end}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400 dark:text-slate-500">Inga uppehåll registrerade</p>
        )}
      </Section>

      <Section title={`Avgångar – ${islandLocation}`}>
        <DeparturePills departures={timetables?.island?.departures} />
      </Section>

      <Section title={`Avgångar – ${mainlandLocation}`}>
        <DeparturePills departures={timetables?.mainland?.departures} />
      </Section>

      {/* Data accuracy notice */}
      <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 px-3 py-3 mb-4">
        <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1">
          Planerade avgångar
        </p>
        <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
          Tjänsten visar den officiella tidtabellen från Finferries — inte realtidsdata.
          Faktiska avgångstider kan avvika, särskilt under rusningstid på högt belastade linjer.
        </p>
      </div>

      {/* Notification status message */}
      {notification && (
        <div
          role="status"
          aria-live="polite"
          className={`mb-4 px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-all duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
              : notification.type === 'error'
              ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/50'
              : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'loading' && (
              <svg className="animate-spin h-3.5 w-3.5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
            )}
            {notification.type === 'success' && <span>✓</span>}
            {notification.type === 'error' && <span>✕</span>}
            <span>{notification.message}</span>
          </div>
          {notification.type !== 'loading' && (
            <button
              onClick={() => setNotification(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-2 text-sm leading-none"
              aria-label="Stäng"
            >
              ×
            </button>
          )}
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="text-xs bg-ferry-navy dark:bg-slate-700 text-white px-3 py-1.5 rounded hover:bg-ferry-blue dark:hover:bg-slate-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-sm"
        >
          {isRefreshing ? (
            <>
              <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span>Uppdaterar…</span>
            </>
          ) : (
            <>
              <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
              </svg>
              <span>Uppdatera</span>
            </>
          )}
        </button>
      </div>
    </div>
    </>
  );
}
