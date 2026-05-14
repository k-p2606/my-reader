import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../db';

const LS_KEY = 'readingGoal';

const STAT_DEFS = [
  {
    key:   'finished',
    label: 'Books finished',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  {
    key:   'pages',
    label: 'Pages read',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    key:   'reading',
    label: 'Reading now',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
  {
    key:   'want',
    label: 'Want to read',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
      </svg>
    ),
  },
];

const CURRENT_YEAR = new Date().getFullYear();

function CurrentlyReadingCard({ book }) {
  const canTrackPages = book.totalPages != null && book.totalPages > 0;
  const pct = canTrackPages
    ? Math.min(100, Math.round((book.pagesRead / book.totalPages) * 100))
    : book.readerProgress != null
      ? Math.round(book.readerProgress * 100)
      : null;

  return (
    <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
      <div className="w-10 h-14 shrink-0 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
        {book.coverUrl ? (
          <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
        ) : (
          <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
          </svg>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{book.title}</p>
        {book.author && <p className="text-xs text-gray-500 truncate">{book.author}</p>}

        {pct !== null ? (
          <div className="mt-1.5 space-y-0.5">
            <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gray-800 rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">
              {canTrackPages ? `${book.pagesRead} / ${book.totalPages} pages` : `${pct}%`}
            </p>
          </div>
        ) : (
          <p className="text-xs text-gray-400 mt-1">No progress tracked yet</p>
        )}
      </div>

      {pct !== null && (
        <span className="text-sm font-bold text-gray-900 tabular-nums shrink-0">{pct}%</span>
      )}
    </div>
  );
}

function BookSpine({ book }) {
  return (
    <div
      title={`${book.title}${book.author ? ` — ${book.author}` : ''}`}
      className="w-12 h-18 rounded-sm overflow-hidden bg-gray-200 shadow-sm shrink-0 transition-transform hover:-translate-y-1 hover:shadow-md"
    >
      {book.coverUrl ? (
        <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-200">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
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

  return (
    <div className="space-y-8">
      <h1 className="text-lg font-semibold text-gray-900">Profile</h1>

      {/* Currently reading */}
      {currentlyReading.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900">Currently reading</h2>
          <ul className="flex flex-col gap-2">
            {currentlyReading.map(book => (
              <li key={book.id}>
                <CurrentlyReadingCard book={book} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Stat strip — gap-px + bg-gray-100 creates hairline dividers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-100 rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
        {STAT_DEFS.map(({ key, label, icon }) => (
          <div key={key} className="bg-white px-4 py-6 flex flex-col items-center gap-2">
            <span className="text-gray-300">{icon}</span>
            <span className="text-3xl font-bold text-gray-900 tabular-nums leading-none">
              {stats[key].toLocaleString()}
            </span>
            <span className="text-xs text-gray-400 text-center leading-snug">{label}</span>
          </div>
        ))}
      </div>

      {/* Year shelf */}
      <section className="space-y-3">
        <div className="flex items-baseline gap-2">
          <h2 className="text-base font-semibold text-gray-900">Finished in {CURRENT_YEAR}</h2>
          {finishedThisYear.length > 0 && (
            <span className="text-xs text-gray-400">{finishedThisYear.length}</span>
          )}
        </div>

        {finishedThisYear.length === 0 ? (
          <p className="text-sm text-gray-400">
            Finish your first book of {CURRENT_YEAR} to see it here.
          </p>
        ) : (
          <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 pt-4 pb-3 flex flex-wrap gap-2 items-end">
            {finishedThisYear.map(book => (
              <BookSpine key={book.id} book={book} />
            ))}
            <div className="w-full h-px bg-gray-200 mt-1" />
          </div>
        )}
      </section>

      {/* Reading goal */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-gray-900">Reading goal</h2>

        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-gray-700 tabular-nums">
              {goal > 0 ? (
                <>
                  <span className="text-2xl font-bold text-gray-900">{finishedThisYear.length}</span>
                  <span className="text-gray-400"> of {goal} books</span>
                </>
              ) : (
                <span className="text-gray-400">No goal set yet</span>
              )}
            </p>
            <div className="flex items-center gap-1.5 shrink-0">
              <input
                type="number"
                min={1}
                value={goal || ''}
                onChange={e => handleGoalChange(e.target.value)}
                placeholder="–"
                className="w-14 text-sm text-center border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder-gray-300"
              />
              <span className="text-xs text-gray-400">books in {CURRENT_YEAR}</span>
            </div>
          </div>

          {goal > 0 && (() => {
            const pct = Math.min(100, Math.round((finishedThisYear.length / goal) * 100));
            const done = finishedThisYear.length >= goal;
            return (
              <div className="space-y-1.5">
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${done ? 'bg-green-500' : 'bg-gray-900'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400">
                  {pct}%{done && ' · Goal reached!'}
                </p>
              </div>
            );
          })()}
        </div>
      </section>
    </div>
  );
}
