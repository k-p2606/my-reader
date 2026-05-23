import { useState, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../db';
import BookDetail from './BookDetail';

const DEFAULT_NAMES = new Set(['Want to read', 'Currently reading', 'Finished', 'Did Not Finish']);

const STATUS_LABELS = { want: 'Want to read', reading: 'Reading', finished: 'Finished', dnf: 'DNF' };
const STATUS_COLORS = {
  want:     'bg-parchment text-muted',
  reading:  'bg-rust-soft text-rust',
  finished: 'bg-[#E8F0E6] text-[#3A6435]',
  dnf:      'bg-red-50 text-red-400',
};

const LIST_STATUS_MAP = {
  'Want to read':      'want',
  'Currently reading': 'reading',
  'Finished':          'finished',
  'Did Not Finish':    'dnf',
};

function MoveMenu({ currentListId, lists, onMove, onClose }) {
  const targets = lists.filter(l => l.id !== currentListId);
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 top-full mt-1.5 z-20 bg-warm-white border border-dust rounded-xl shadow-lg overflow-hidden min-w-44">
        <p className="px-4 pt-3 pb-1.5 text-[10px] font-semibold text-faint uppercase tracking-[0.15em]">
          Move to
        </p>
        {targets.map(list => (
          <button
            key={list.id}
            onClick={() => { onMove(list); onClose(); }}
            className="w-full text-left px-4 py-2.5 text-sm text-ink hover:bg-parchment transition-colors last:pb-3"
          >
            {list.name}
          </button>
        ))}
      </div>
    </>
  );
}

function BookRow({ book, lists, onOpen, onMove, onRemove }) {
  const [showMove, setShowMove] = useState(false);

  const canTrackPages = book.totalPages != null && book.totalPages > 0;
  const pct = canTrackPages
    ? Math.min(100, Math.round((book.pagesRead / book.totalPages) * 100))
    : 0;

  return (
    <li
      onClick={onOpen}
      className="flex items-center gap-4 bg-warm-white border border-dust rounded-2xl p-3.5 shadow-sm cursor-pointer hover:shadow-md hover:border-dust-dark transition-all"
    >
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
        <p className="text-xs text-muted truncate">{book.author}</p>
        {canTrackPages ? (
          <div className="mt-1.5 space-y-0.5">
            <div className="h-0.5 w-full bg-dust rounded-full overflow-hidden">
              <div className="h-full bg-rust rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-faint">{book.pagesRead} / {book.totalPages} pages</p>
          </div>
        ) : (
          <p className="text-xs text-faint mt-0.5">? pages</p>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${STATUS_COLORS[book.status] ?? 'bg-parchment text-faint'}`}>
          {STATUS_LABELS[book.status] ?? book.status}
        </span>

        <div className="relative">
          <button
            onClick={e => { e.stopPropagation(); setShowMove(v => !v); }}
            className="p-1.5 rounded-lg text-faint hover:text-muted hover:bg-parchment transition-colors"
            aria-label="Move to list"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
          </button>
          {showMove && (
            <MoveMenu
              currentListId={book._listId}
              lists={lists}
              onMove={onMove}
              onClose={() => setShowMove(false)}
            />
          )}
        </div>

        <button
          onClick={e => { e.stopPropagation(); onRemove(); }}
          className="p-1.5 rounded-lg text-faint hover:text-rust hover:bg-rust-soft transition-colors"
          aria-label="Remove from list"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </li>
  );
}

function NewListForm({ onDone }) {
  const [name, setName] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    await db.lists.add({ name: trimmed, createdAt: new Date().toISOString() });
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        ref={inputRef}
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Escape' && onDone()}
        placeholder="List name…"
        maxLength={80}
        className="flex-1 text-sm px-3 py-1.5 border border-dust bg-warm-white rounded-lg focus:outline-none focus:ring-2 focus:ring-rust placeholder-faint text-ink"
      />
      <button
        type="submit"
        disabled={!name.trim()}
        className="text-xs font-semibold text-warm-white bg-ink hover:bg-rust rounded-lg px-3 py-1.5 transition-colors disabled:opacity-40"
      >
        Add
      </button>
      <button
        type="button"
        onClick={onDone}
        className="text-xs font-semibold text-muted hover:text-ink rounded-lg px-2 py-1.5 transition-colors"
      >
        Cancel
      </button>
    </form>
  );
}

export default function ListsView() {
  const [selectedBook,        setSelectedBook]        = useState(null);
  const [showNewForm,         setShowNewForm]         = useState(false);
  const [confirmDeleteListId, setConfirmDeleteListId] = useState(null);

  const listsRaw        = useLiveQuery(() => db.lists.toArray(),        []);
  const listBooksRaw    = useLiveQuery(() => db.listBooks.toArray(),    []);
  const trackedBooksRaw = useLiveQuery(() => db.trackedBooks.toArray(), []);

  const loading = listsRaw === undefined || listBooksRaw === undefined || trackedBooksRaw === undefined;

  const lists        = listsRaw        ?? [];
  const listBooks    = listBooksRaw    ?? [];
  const trackedBooks = trackedBooksRaw ?? [];

  const bookById = Object.fromEntries(trackedBooks.map(b => [b.id, b]));

  const booksByListId = {};
  for (const lb of listBooks) {
    const book = bookById[lb.trackedBookId];
    if (!book) continue;
    if (!booksByListId[lb.listId]) booksByListId[lb.listId] = [];
    booksByListId[lb.listId].push({ ...book, _listBookId: lb.id, _listId: lb.listId });
  }

  const defaults = lists.filter(l => DEFAULT_NAMES.has(l.name));
  const customs  = lists.filter(l => !DEFAULT_NAMES.has(l.name));
  const sorted   = [...defaults, ...customs];

  async function deleteList(listId) {
    await db.transaction('rw', db.lists, db.listBooks, async () => {
      await db.listBooks.where('listId').equals(listId).delete();
      await db.lists.delete(listId);
    });
  }

  async function removeFromList(listBookId) {
    await db.listBooks.delete(listBookId);
  }

  async function moveToList(book, targetList) {
    await db.transaction('rw', db.listBooks, db.trackedBooks, async () => {
      const alreadyInTarget = await db.listBooks
        .where('[listId+trackedBookId]').equals([targetList.id, book.id]).first();

      await db.listBooks.delete(book._listBookId);

      if (!alreadyInTarget) {
        await db.listBooks.add({ listId: targetList.id, trackedBookId: book.id });
      }

      const newStatus = LIST_STATUS_MAP[targetList.name];
      if (newStatus) {
        await db.trackedBooks.update(book.id, { status: newStatus });
      }
    });
  }

  if (loading) return (
    <div className="space-y-10">
      <div className="mb-10">
        <div className="h-3 w-20 bg-dust rounded-full animate-pulse" />
        <div className="h-12 w-48 bg-dust rounded-xl animate-pulse mt-3" />
      </div>
      {Array.from({ length: 3 }).map((_, si) => (
        <div key={si} className="space-y-3">
          <div className="h-3 w-32 bg-dust rounded animate-pulse" />
          <ul className="flex flex-col gap-2">
            {Array.from({ length: si === 0 ? 3 : 2 }).map((_, ri) => (
              <li key={ri} className="flex items-center gap-4 bg-warm-white border border-dust rounded-2xl p-3.5">
                <div className="w-10 h-14 shrink-0 rounded-lg bg-dust animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-dust rounded animate-pulse w-2/3" />
                  <div className="h-3 bg-dust rounded animate-pulse w-1/3" />
                </div>
                <div className="w-16 h-6 bg-dust rounded-full animate-pulse shrink-0" />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <div className="space-y-12">
        {/* Hero heading */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted">/ your lists</p>
            <h1 className="font-serif italic font-semibold text-4xl md:text-[3.25rem] text-ink leading-[1.1] mt-2">
              your lists.
            </h1>
          </div>
          {!showNewForm && (
            <button
              onClick={() => setShowNewForm(true)}
              className="text-xs font-semibold text-muted hover:text-ink border border-dust hover:border-dust-dark rounded-full px-4 py-2 transition-colors shrink-0 mb-1"
            >
              + new list
            </button>
          )}
        </div>

        {showNewForm && <NewListForm onDone={() => setShowNewForm(false)} />}

        {sorted.map(list => {
          const books = booksByListId[list.id] ?? [];
          return (
            <section key={list.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-2">
                  <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted">
                    {list.name}
                  </p>
                  {books.length > 0 && (
                    <span className="text-xs text-faint">{books.length}</span>
                  )}
                </div>
                {!DEFAULT_NAMES.has(list.name) && (
                  confirmDeleteListId === list.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted">Delete list?</span>
                      <button
                        onClick={() => setConfirmDeleteListId(null)}
                        className="text-xs font-semibold text-muted hover:text-ink px-2 py-1 rounded-lg hover:bg-parchment transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => { deleteList(list.id); setConfirmDeleteListId(null); }}
                        className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg px-2 py-1 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteListId(list.id)}
                      className="p-1.5 rounded-lg text-faint hover:text-rust hover:bg-rust-soft transition-colors"
                      aria-label="Delete list"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  )
                )}
              </div>

              {books.length === 0 ? (
                <p className="text-sm text-faint italic">No books here yet.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {books.map(book => (
                    <BookRow
                      key={book._listBookId}
                      book={book}
                      lists={sorted}
                      onOpen={() => setSelectedBook(book)}
                      onMove={targetList => moveToList(book, targetList)}
                      onRemove={() => removeFromList(book._listBookId)}
                    />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {selectedBook && (
        <BookDetail
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
        />
      )}
    </>
  );
}
