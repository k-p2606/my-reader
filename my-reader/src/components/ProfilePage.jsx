import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../db';

const LS_KEY = 'readingGoal';
const CURRENT_YEAR = new Date().getFullYear();

function getYearPhrase(finished) {
  if (finished === 0) return 'a quiet year,\nso far.';
  if (finished < 5) return 'a gentle\nbeginning.';
  if (finished < 15) return 'a slow, kind year\nso far.';
  if (finished < 25) return 'building a good\nrhythm.';
  return 'a remarkable\nreading year.';
}

const STAT_DEFS = [
  {
    key: 'finished',
    label: 'books finished',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  {
    key: 'pages',
    label: 'pages read',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    key: 'reading',
    label: 'reading now',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
  {
    key: 'want',
    label: 'want to read',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
      </svg>
    ),
  },
];

function GoalRing({ value, max }) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const r = 34;
  const circ = 2 * Math.PI * r;

  return (
    <div className="relative w-22 h-22 shrink-0">
      <svg width="88" height="88" viewBox="0 0 88 88" className="-rotate-90">
        <circle cx="44" cy="44" r={r} fill="none" stroke="#E2D5C0" strokeWidth="7" />
        {pct > 0 && (
          <circle
            cx="44" cy="44" r={r}
            fill="none"
            stroke="#8B3525"
            strokeWidth="7"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct)}
            strokeLinecap="round"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-semibold text-ink tabular-nums">{Math.round(pct * 100)}%</span>
      </div>
    </div>
  );
}

function CurrentlyReadingCard({ book }) {
  const canTrackPages = book.totalPages != null && book.totalPages > 0;
  const pct = canTrackPages
    ? Math.min(100, Math.round((book.pagesRead / book.totalPages) * 100))
    : book.readerProgress != null
      ? Math.round(book.readerProgress * 100)
      : null;

  return (
    <div className="flex items-center gap-3 bg-warm-white border border-dust rounded-2xl p-3.5">
      <div className="w-10 h-14 shrink-0 rounded-lg overflow-hidden bg-parchment flex items-center justify-center">
        {book.coverUrl ? (
          <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
        ) : (
          <svg className="w-5 h-5 text-faint" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink truncate">{book.title}</p>
        {book.author && <p className="text-xs text-muted truncate">{book.author}</p>}
        {pct !== null ? (
          <div className="mt-1.5 space-y-0.5">
            <div className="h-0.5 w-full bg-dust rounded-full overflow-hidden">
              <div className="h-full bg-rust rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-faint">
              {canTrackPages ? `${book.pagesRead} / ${book.totalPages} pages` : `${pct}%`}
            </p>
          </div>
        ) : (
          <p className="text-xs text-faint mt-1">No progress tracked yet</p>
        )}
      </div>
      {pct !== null && (
        <span className="text-sm font-bold text-ink tabular-nums shrink-0">{pct}%</span>
      )}
    </div>
  );
}

function BookSpine({ book }) {
  return (
    <div
      title={`${book.title}${book.author ? ` — ${book.author}` : ''}`}
      className="w-11 h-16 rounded overflow-hidden bg-parchment shadow-sm shrink-0 transition-transform hover:-translate-y-1 hover:shadow-md"
    >
      {book.coverUrl ? (
        <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-dust">
          <svg className="w-4 h-4 text-faint" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
          </svg>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const [goal, setGoalState] = useState(() => {
    const n = parseInt(localStorage.getItem(LS_KEY), 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  });

  function handleGoalChange(raw) {
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n > 0) {
      setGoalState(n);
      localStorage.setItem(LS_KEY, String(n));
    } else {
      setGoalState(0);
      localStorage.removeItem(LS_KEY);
    }
  }

  const books = useLiveQuery(() => db.trackedBooks.toArray(), []) ?? [];

  const stats = {
    finished: books.filter(b => b.status === 'finished').length,
    pages:    books.reduce((sum, b) => sum + (b.pagesRead ?? 0), 0),
    reading:  books.filter(b => b.status === 'reading').length,
    want:     books.filter(b => b.status === 'want').length,
  };

  const currentlyReading = books.filter(b => b.status === 'reading').slice(0, 3);

  const finishedThisYear = books.filter(
    b => b.status === 'finished' &&
         b.dateFinished &&
         new Date(b.dateFinished).getFullYear() === CURRENT_YEAR
  );

  const yearStart = new Date(CURRENT_YEAR, 0, 1);
  const dayOfYear = Math.floor((new Date() - yearStart) / (1000 * 60 * 60 * 24)) + 1;

  const phrase = getYearPhrase(finishedThisYear.length);

  return (
    <div className="space-y-12">
      {/* Hero */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted">/ your reading year</p>
          <h1 className="font-serif italic font-semibold text-4xl md:text-[3.25rem] text-ink leading-[1.1] mt-2 whitespace-pre-line">
            {phrase}
          </h1>
        </div>
        <p className="text-xs text-faint text-right shrink-0 mt-1 leading-relaxed hidden sm:block">
          jan 1 — today<br />
          <span className="font-semibold text-muted">{dayOfYear} days</span>
        </p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-dust rounded-2xl overflow-hidden border border-dust shadow-sm">
        {STAT_DEFS.map(({ key, label, icon }) => (
          <div key={key} className="bg-warm-white px-4 py-6 flex flex-col items-center gap-2">
            <span className="text-faint">{icon}</span>
            <span className="text-3xl font-bold text-ink tabular-nums leading-none">
              {stats[key].toLocaleString()}
            </span>
            <span className="text-[11px] text-faint text-center leading-snug">{label}</span>
          </div>
        ))}
      </div>

      {/* Currently reading */}
      {currentlyReading.length > 0 && (
        <section className="space-y-4">
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted">/ currently reading</p>
          <ul className="flex flex-col gap-2.5">
            {currentlyReading.map(book => (
              <li key={book.id}>
                <CurrentlyReadingCard book={book} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Reading goal */}
      <section className="space-y-4">
        <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted">/ reading goal</p>
        <div className="bg-warm-white border border-dust rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-5">
            <GoalRing value={finishedThisYear.length} max={goal} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted mb-1">
                {CURRENT_YEAR} goal
              </p>
              {goal > 0 ? (
                <>
                  <p className="text-ink">
                    <span className="text-2xl font-bold tabular-nums">{finishedThisYear.length}</span>
                    <span className="text-muted"> of {goal} books</span>
                  </p>
                  {finishedThisYear.length >= goal ? (
                    <p className="text-xs text-rust font-semibold mt-1">Goal reached!</p>
                  ) : (
                    <p className="text-xs text-faint mt-1">
                      {goal - finishedThisYear.length} to go
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-faint">No goal set yet</p>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <input
                type="number"
                min={1}
                value={goal || ''}
                onChange={e => handleGoalChange(e.target.value)}
                placeholder="–"
                className="w-14 text-sm text-center border border-dust bg-cream rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-rust placeholder-faint text-ink"
              />
              <span className="text-xs text-faint">books</span>
            </div>
          </div>

          {goal > 0 && (
            <div className="mt-4 space-y-1.5">
              <div className="h-1.5 w-full bg-dust rounded-full overflow-hidden">
                <div
                  className="h-full bg-rust rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round((finishedThisYear.length / goal) * 100))}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Year shelf */}
      <section className="space-y-4">
        <div className="flex items-baseline gap-2">
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted">/ finished in {CURRENT_YEAR}</p>
          {finishedThisYear.length > 0 && (
            <span className="text-xs text-faint">{finishedThisYear.length}</span>
          )}
        </div>

        {finishedThisYear.length === 0 ? (
          <p className="text-sm text-faint italic">
            Finish your first book of {CURRENT_YEAR} to see it here.
          </p>
        ) : (
          <div className="bg-parchment/60 border border-dust rounded-2xl px-5 pt-5 pb-4 flex flex-wrap gap-2.5 items-end">
            {finishedThisYear.map(book => (
              <BookSpine key={book.id} book={book} />
            ))}
            <div className="w-full h-px bg-dust mt-1" />
          </div>
        )}
      </section>
    </div>
  );
}
