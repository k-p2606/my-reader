import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { searchBooks } from '../api/openLibrary';
import db from '../db';

const STATUS_LABELS = { want: 'Want to read', reading: 'Reading', finished: 'Finished', dnf: 'DNF' };
const STATUS_COLORS = {
  want:     'bg-gray-100 text-gray-500',
  reading:  'bg-blue-50 text-blue-600',
  finished: 'bg-green-50 text-green-600',
  dnf:      'bg-red-50 text-red-400',
};

function CoverThumb({ url, title, large }) {
  return (
    <div className={`${large ? 'w-16 h-22' : 'w-10 h-14'} shrink-0 rounded overflow-hidden bg-gray-100 flex items-center justify-center`}>
      {url ? (
        <img src={url} alt={title} className="w-full h-full object-cover" />
      ) : (
        <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
        </svg>
      )}
    </div>
  );
}

function LinkedPanel({ book, tracked, onUnlink }) {
  const canTrack = tracked.totalPages > 0;
  const pct = canTrack
    ? Math.min(100, Math.round((tracked.pagesRead / tracked.totalPages) * 100))
    : tracked.readerProgress != null
      ? Math.round(tracked.readerProgress * 100)
      : null;

  return (
    <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
      <div className="flex gap-4">
        <CoverThumb url={tracked.coverUrl} title={tracked.title} large />
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="text-sm font-semibold text-gray-900 leading-snug">{tracked.title}</p>
          {tracked.author && <p className="text-xs text-gray-500 mt-0.5">{tracked.author}</p>}
          <span className={`mt-2 inline-block text-xs font-semibold rounded-full px-2.5 py-1 ${STATUS_COLORS[tracked.status] ?? 'bg-gray-100 text-gray-400'}`}>
            {STATUS_LABELS[tracked.status] ?? tracked.status}
          </span>
          {canTrack && (
            <p className="text-xs text-gray-400 mt-1">
              {tracked.pagesRead} / {tracked.totalPages} pages
            </p>
          )}
        </div>
      </div>

      {pct !== null && (
        <div className="space-y-1">
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gray-900 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-gray-400">{pct}%</p>
        </div>
      )}

      {tracked.rating > 0 && (
        <p className="text-lg tracking-widest">
          {'★'.repeat(tracked.rating)}<span className="text-gray-200">{'★'.repeat(5 - tracked.rating)}</span>
        </p>
      )}

      {tracked.notes ? (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Notes</p>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{tracked.notes}</p>
        </div>
      ) : null}

      <div className="pt-2 border-t border-gray-100">
        <button
          onClick={onUnlink}
          className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
        >
          Unlink this record
        </button>
      </div>
    </div>
  );
}

function SearchPanel({ book, onClose }) {
  const [query,   setQuery]   = useState(book.title);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [linking, setLinking] = useState(null);

  const allTracked = useLiveQuery(() => db.trackedBooks.toArray(), []) ?? [];
  const localMatches = allTracked.filter(t => {
    const a = t.title.toLowerCase();
    const b = book.title.toLowerCase();
    return a === b || a.includes(b.slice(0, 25)) || b.includes(a.slice(0, 25));
  });

  useEffect(() => { doSearch(book.title); }, []);

  async function doSearch(q) {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    try {
      setResults(await searchBooks(q.trim()));
    } catch {
      setError('Search failed. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  async function linkToExisting(trackedId) {
    await db.books.update(book.id, { trackedBookId: trackedId });
    onClose();
  }

  async function linkToOL(olBook) {
    setLinking(olBook.olKey);
    try {
      let tracked = await db.trackedBooks.where('olKey').equals(olBook.olKey).first();
      if (!tracked) {
        const id = await db.trackedBooks.add({
          olKey:       olBook.olKey,
          title:       olBook.title,
          author:      olBook.author,
          coverUrl:    olBook.coverUrl,
          totalPages:  olBook.totalPages,
          pagesRead:   0,
          status:      'reading',
          rating:      null,
          notes:       '',
          dateAdded:   new Date().toISOString(),
          dateFinished: null,
        });
        await db.books.update(book.id, { trackedBookId: id });
      } else {
        await db.books.update(book.id, { trackedBookId: tracked.id });
      }
    } finally {
      setLinking(null);
      onClose();
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
      {localMatches.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Already in your tracker</p>
          <ul className="flex flex-col gap-2">
            {localMatches.map(t => (
              <li key={t.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                <CoverThumb url={t.coverUrl} title={t.title} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{t.title}</p>
                  <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${STATUS_COLORS[t.status]}`}>
                    {STATUS_LABELS[t.status]}
                  </span>
                </div>
                <button
                  onClick={() => linkToExisting(t.id)}
                  className="shrink-0 text-xs font-semibold text-white bg-gray-900 hover:bg-gray-700 rounded-lg px-2.5 py-1.5 transition-colors"
                >
                  Link
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Open Library</p>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch(query)}
            placeholder="Search…"
            className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder-gray-400"
          />
          <button
            onClick={() => doSearch(query)}
            disabled={loading}
            className="text-sm font-semibold text-white bg-gray-900 hover:bg-gray-700 rounded-lg px-3 py-2 transition-colors disabled:opacity-50"
          >
            {loading ? '…' : 'Go'}
          </button>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        {results.length > 0 && (
          <ul className="flex flex-col gap-2">
            {results.map(r => (
              <li key={r.olKey} className="flex items-center gap-3 border border-gray-100 rounded-xl p-3">
                <CoverThumb url={r.coverThumb} title={r.title} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{r.title}</p>
                  <p className="text-xs text-gray-500 truncate">{r.author}</p>
                  {r.totalPages && <p className="text-xs text-gray-400">{r.totalPages} pages</p>}
                </div>
                <button
                  onClick={() => linkToOL(r)}
                  disabled={linking === r.olKey}
                  className="shrink-0 text-xs font-semibold text-white bg-gray-900 hover:bg-gray-700 rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-50"
                >
                  {linking === r.olKey ? '…' : '+ Link'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function TrackLinkModal({ book, linkedTracked, onClose }) {
  async function handleUnlink() {
    await db.books.update(book.id, { trackedBookId: null });
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-sm font-semibold text-gray-900">
            {linkedTracked ? 'Tracking' : 'Track this book'}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {linkedTracked
          ? <LinkedPanel book={book} tracked={linkedTracked} onUnlink={handleUnlink} />
          : <SearchPanel book={book} onClose={onClose} />
        }
      </div>
    </>
  );
}
