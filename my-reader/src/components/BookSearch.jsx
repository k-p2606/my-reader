import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { searchBooks } from '../api/openLibrary';
import db from '../db';

async function addBookToList(book, listId) {
  await db.transaction('rw', db.trackedBooks, db.listBooks, async () => {
    let tracked = await db.trackedBooks.where('olKey').equals(book.olKey).first();
    let trackedBookId;

    if (!tracked) {
      trackedBookId = await db.trackedBooks.add({
        olKey: book.olKey,
        title: book.title,
        author: book.author,
        coverUrl: book.coverUrl,
        totalPages: book.totalPages,
        pagesRead: 0,
        status: 'want',
        rating: null,
        notes: '',
        dateAdded: new Date().toISOString(),
        dateFinished: null,
      });
    } else {
      trackedBookId = tracked.id;
    }

    const alreadyInList = await db.listBooks
      .where('[listId+trackedBookId]')
      .equals([listId, trackedBookId])
      .first();

    if (!alreadyInList) {
      await db.listBooks.add({ listId, trackedBookId });
    }
  });
}

function ListPicker({ book, lists, onClose }) {
  const [added, setAdded] = useState(null);

  async function handlePick(list) {
    await addBookToList(book, list.id);
    setAdded(list.name);
    setTimeout(onClose, 900);
  }

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 top-full mt-1.5 z-20 bg-warm-white border border-dust rounded-xl shadow-lg overflow-hidden min-w-48">
        {added ? (
          <p className="px-4 py-3 text-xs font-medium text-[#3A6435]">
            Added to "{added}" ✓
          </p>
        ) : (
          <>
            <p className="px-4 pt-3 pb-1.5 text-[10px] font-semibold text-faint uppercase tracking-[0.15em]">
              Add to list
            </p>
            {lists.map(list => (
              <button
                key={list.id}
                onClick={() => handlePick(list)}
                className="w-full text-left px-4 py-2.5 text-sm text-ink hover:bg-parchment transition-colors last:pb-3"
              >
                {list.name}
              </button>
            ))}
          </>
        )}
      </div>
    </>
  );
}

export default function BookSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [openPickerFor, setOpenPickerFor] = useState(null);

  const lists = useLiveQuery(() => db.lists.toArray(), []) ?? [];

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) { setResults([]); return; }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const books = await searchBooks(trimmed);
        setResults(books);
      } catch {
        setError('Search failed. Check your connection and try again.');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search for a book by title or author…"
          autoFocus
          className="w-full px-4 py-3 pr-10 rounded-xl border border-dust bg-warm-white text-sm text-ink placeholder-faint shadow-sm focus:outline-none focus:ring-2 focus:ring-rust focus:border-transparent"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-dust border-t-rust rounded-full animate-spin" />
          </div>
        )}
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-500">{error}</p>
      )}

      {loading && results.length === 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="flex items-center gap-4 bg-warm-white border border-dust rounded-2xl p-3.5">
              <div className="w-10 h-14 shrink-0 rounded-lg bg-dust animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-dust rounded animate-pulse w-3/4" />
                <div className="h-3 bg-dust rounded animate-pulse w-1/2" />
                <div className="h-3 bg-dust rounded animate-pulse w-1/4" />
              </div>
              <div className="w-20 h-7 bg-dust rounded-lg animate-pulse shrink-0" />
            </li>
          ))}
        </ul>
      )}

      {results.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {results.map(book => (
            <li
              key={book.olKey}
              className="flex items-center gap-4 bg-warm-white border border-dust rounded-2xl p-3.5 shadow-sm"
            >
              <div className="w-10 h-14 shrink-0 rounded-lg overflow-hidden bg-parchment flex items-center justify-center">
                {book.coverThumb ? (
                  <img src={book.coverThumb} alt={book.title} className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-5 h-5 text-faint" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                  </svg>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink truncate">{book.title}</p>
                <p className="text-xs text-muted truncate">{book.author}</p>
                <p className="text-xs text-faint mt-0.5">
                  {book.totalPages != null ? `${book.totalPages} pages` : '? pages'}
                </p>
              </div>

              <div className="relative shrink-0">
                <button
                  onClick={() => setOpenPickerFor(k => k === book.olKey ? null : book.olKey)}
                  className="text-xs font-semibold text-warm-white bg-rust hover:bg-rust-hover rounded-lg px-3 py-1.5 transition-colors"
                >
                  + Add to list
                </button>
                {openPickerFor === book.olKey && (
                  <ListPicker
                    book={book}
                    lists={lists}
                    onClose={() => setOpenPickerFor(null)}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loading && query.trim() && results.length === 0 && !error && (
        <p className="mt-4 text-sm text-faint text-center italic">No results for "{query.trim()}"</p>
      )}
    </div>
  );
}
