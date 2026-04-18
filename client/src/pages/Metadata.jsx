import { useFerryData } from '../hooks/useFerryData.js';

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
      {departures.map((dep) => (
        <span
          key={dep}
          className="text-xs border border-ferry-border dark:border-slate-600 text-ferry-navy dark:text-slate-300 rounded px-1.5 py-0.5 font-mono"
        >
          {dep}
        </span>
      ))}
    </div>
  );
}

export default function Metadata({ selectedSlug, selectedFerry }) {
  const { data, error, loading, refetch } = useFerryData(selectedSlug);

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
  const ferryName = selectedFerry?.name ?? 'Okänd färja';
  const islandLocation = timetables?.island?.location ?? 'Ö';
  const mainlandLocation = timetables?.mainland?.location ?? 'Fastland';

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 max-w-lg mx-auto w-full">

      <Section title="Färja">
        <Row label="Namn" value={ferryName} />
        <Row label="Slug" value={selectedSlug ?? '–'} />
        <Row label="Tidtabell-URL" value={metadata?.timetableUrl} />
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
              <li key={i} className="text-sm">
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
  );
}
