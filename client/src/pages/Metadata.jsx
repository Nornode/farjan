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
  const { data, error, loading, refetch } = useFerryData(selectedSlug);

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
        {/* Install instructions */}
        {isInstalled ? (
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">Appen är redan installerad på din enhet.</p>
        ) : isIos ? (
          <p className="text-sm text-gray-600 dark:text-slate-300 mb-4">
            Installera appen: tryck på{' '}
            <span className="font-semibold">Dela</span> i Safari och välj{' '}
            <span className="font-semibold">"Lägg till på hemskärmen"</span>.
          </p>
        ) : (
          <div className="flex items-center gap-3 mb-4">
            <p className="text-sm text-gray-600 dark:text-slate-300">Lägg till appen på hemskärmen för snabbare åtkomst.</p>
            <button
              onClick={onInstall}
              className="shrink-0 px-3 py-1.5 rounded-full bg-ferry-navy dark:bg-slate-700 text-white text-xs font-semibold hover:bg-ferry-blue dark:hover:bg-slate-600 transition-colors"
            >
              Installera
            </button>
          </div>
        )}

        {/* Data accuracy notice */}
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 px-3 py-3">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1">
            Planerade avgångar
          </p>
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            Tjänsten visar den officiella tidtabellen från Finferries — inte realtidsdata.
            Faktiska avgångstider kan avvika, särskilt under rusningstid på högt belastade linjer.
          </p>
        </div>
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

      <div className="mt-4 flex justify-end">
        <button
          onClick={refetch}
          className="text-xs bg-ferry-navy dark:bg-slate-700 text-white px-3 py-1.5 rounded hover:bg-ferry-blue dark:hover:bg-slate-600 transition-colors"
        >
          Uppdatera
        </button>
      </div>
    </div>
    </>
  );
}
