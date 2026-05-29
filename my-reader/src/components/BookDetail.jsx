import { useState, useEffect, useRef } from 'react';
import db from '../db';

const STATUS_OPTIONS = [
  { value: 'want',     label: 'Want to read' },
  { value: 'reading',  label: 'Reading' },
  { value: 'finished', label: 'Finished' },
  { value: 'dnf',      label: 'DNF' },
];

function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(value === star ? 0 : star)}
          className={`text-2xl leading-none transition-colors ${
            star <= (hovered || value) ? 'text-yellow-500' : 'text-dust hover:text-yellow-300'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

// book      — always provided; may be a db.books record (library) or db.trackedBooks record (lists)
// trackedBook — optional; the linked db.trackedBooks record when opened from Library
// onOpen    — optional; if provided, "Open book" button is shown (library context)
export default function BookDetail({ book, trackedBook: trackedProp, onClose, onOpen }) {
  const isLibrary = 'fileType' in book;

  // The tracked record drives status/pages/rating/notes.
  // When opened from Library with a linked tracked book, that's trackedProp.
  // When opened from Lists, book itself is the tracked record.
  const tracked = trackedProp ?? (!isLibrary ? book : null);

  const [confirming,   setConfirming]   = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [editTitle,    setEditTitle]    = useState(book.title  ?? '');
  const [editAuthor,   setEditAuthor]   = useState(book.author ?? '');
  const [editingMeta,  setEditingMeta]  = useState(false);

  const [status,    setStatus]    = useState(tracked?.status    ?? 'want');
  const [pagesRead, setPagesRead] = useState(() => {
    if (!tracked) return 0;
    if (tracked.pagesRead > 0) return tracked.pagesRead;
    if (tracked.readerProgress != null && tracked.totalPages > 0)
      return Math.round(tracked.readerProgress * tracked.totalPages);
    return 0;
  });
  const [rating, setRating] = useState(tracked?.rating ?? 0);
  const [notes,  setNotes]  = useState(tracked?.notes  ?? '');

  const metaChanged = editTitle.trim() !== (book.title ?? '') || editAuthor.trim() !== (book.author ?? '');

  const notesFirstRender = useRef(true);
  useEffect(() => {
    if (!tracked) return;
    if (notesFirstRender.current) { notesFirstRender.current = false; return; }
    const timer = setTimeout(() => {
      db.trackedBooks.update(tracked.id, { notes });
    }, 600);
    return () => clearTimeout(timer);
  }, [notes]);

  const canTrackPages = tracked?.totalPages != null && tracked.totalPages > 0;

  const pct = tracked
    ? (canTrackPages && pagesRead > 0
        ? Math.min(100, Math.round((pagesRead / tracked.totalPages) * 100))
        : tracked.readerProgress != null
          ? Math.round(tracked.readerProgress * 100)
          : 0)
    : Math.round((book.progress ?? 0) * 100);

  function handlePagesChange(raw) {
    const n = Number(raw);
    setPagesRead(canTrackPages ? Math.min(tracked.totalPages, Math.max(0, n)) : Math.max(0, n));
  }

  async function handleDelete() {
    await db.books.delete(book.id);
    onClose();
  }

  async function handleUpdateProgress() {
    if (!tracked) return;
    await db.trackedBooks.update(tracked.id, { pagesRead: Number(pagesRead) });
  }

  async function handleMarkFinished() {
    if (!tracked) return;
    setSaving(true);
    const now = new Date().toISOString();
    const finalPages = canTrackPages ? tracked.totalPages : Number(pagesRead);

    await db.transaction('rw', db.trackedBooks, db.lists, db.listBooks, async () => {
      await db.trackedBooks.update(tracked.id, {
        status: 'finished',
        pagesRead: finalPages,
        dateFinished: tracked.dateFinished ?? now,
      });

      const finishedList = await db.lists.where('name').equals('Finished').first();
      if (!finishedList) return;

      const defaultLists = await db.lists
        .where('name').anyOf(['Want to read', 'Currently reading', 'Finished', 'Did Not Finish'])
        .toArray();
      const defaultIds = new Set(defaultLists.map(l => l.id));

      const entries = await db.listBooks.where('trackedBookId').equals(tracked.id).toArray();
      const toDelete = entries.filter(lb => defaultIds.has(lb.listId)).map(lb => lb.id);
      if (toDelete.length) await db.listBooks.bulkDelete(toDelete);

      await db.listBooks.add({ listId: finishedList.id, trackedBookId: tracked.id });
    });

    setSaving(false);
    onClose();
  }

  async function handleSave() {
    if (!tracked) return;
    setSaving(true);
    const isFinishedOrDnf = status === 'finished' || status === 'dnf';
    const statusToListName = {
      want: 'Want to read',
      reading: 'Currently reading',
      finished: 'Finished',
      dnf: 'Did Not Finish',
    };

    await db.transaction('rw', db.trackedBooks, db.lists, db.listBooks, async () => {
      await db.trackedBooks.update(tracked.id, {
        status,
        pagesRead: Number(pagesRead),
        rating: rating || null,
        notes,
        dateFinished: isFinishedOrDnf
          ? (tracked.dateFinished ?? new Date().toISOString())
          : null,
      });

      const defaultLists = await db.lists
        .where('name').anyOf(['Want to read', 'Currently reading', 'Finished', 'Did Not Finish'])
        .toArray();
      const defaultIds = new Set(defaultLists.map(l => l.id));

      const entries = await db.listBooks.where('trackedBookId').equals(tracked.id).toArray();
      const toDelete = entries.filter(lb => defaultIds.has(lb.listId)).map(lb => lb.id);
      if (toDelete.length) await db.listBooks.bulkDelete(toDelete);

      const targetList = defaultLists.find(l => l.name === statusToListName[status]);
      if (targetList) {
        await db.listBooks.add({ listId: targetList.id, trackedBookId: tracked.id });
      }
    });

    setSaving(false);
    onClose();
  }

  const coverUrl = tracked?.coverUrl ?? null;

  return (
    <>
      <div className="fixed inset-0 bg-ink/40 z-40" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-warm-white z-50 shadow-2xl flex flex-col border-l border-dust">

        <div className="flex items-center justify-between px-5 py-4 border-b border-dust shrink-0">
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted">
            / book details
          </p>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-faint hover:text-ink hover:bg-parchment transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

          {/* Identity */}
          <div className="flex gap-4">
            <div className="w-20 h-28 shrink-0 rounded-xl overflow-hidden bg-parchment flex items-center justify-center">
              {coverUrl ? (
                <img src={coverUrl} alt={book.title} className="w-full h-full object-cover" />
              ) : (
                <svg className="w-8 h-8 text-faint" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              {isLibrary ? (
                editingMeta ? (
                  <div className="space-y-1.5">
                    <input
                      autoFocus
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      className="w-full text-sm font-semibold text-ink bg-cream border border-dust rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-rust"
                      placeholder="Book title…"
                    />
                    <input
                      value={editAuthor}
                      onChange={e => setEditAuthor(e.target.value)}
                      className="w-full text-xs text-muted bg-cream border border-dust rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-rust placeholder-faint"
                      placeholder="Author (optional)…"
                    />
                    <span className="inline-block text-xs font-bold uppercase tracking-widest text-faint">
                      {book.fileType}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-start gap-1.5 group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink leading-snug">{editTitle || book.title}</p>
                      {(editAuthor || book.author) && (
                        <p className="text-xs text-muted mt-0.5">{editAuthor || book.author}</p>
                      )}
                      <span className="inline-block text-xs font-bold uppercase tracking-widest text-faint mt-1">
                        {book.fileType}
                      </span>
                    </div>
                    <button
                      onClick={() => setEditingMeta(true)}
                      className="shrink-0 mt-0.5 p-1 rounded-md text-faint hover:text-ink hover:bg-parchment transition-colors opacity-0 group-hover:opacity-100"
                      aria-label="Edit title and author"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                      </svg>
                    </button>
                  </div>
                )
              ) : (
                <>
                  <p className="text-sm font-semibold text-ink leading-snug">{book.title}</p>
                  {book.author && (
                    <p className="text-xs text-muted mt-0.5">{book.author}</p>
                  )}
                </>
              )}
              {tracked && (
                <p className="text-xs text-faint mt-1.5">
                  {tracked.totalPages != null ? `${tracked.totalPages} pages` : 'Unknown length'}
                </p>
              )}
              {tracked?.dateAdded && (
                <p className="text-xs text-faint mt-0.5">
                  Added {new Date(tracked.dateAdded).toLocaleDateString(undefined, {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </p>
              )}
            </div>
          </div>

          {/* Progress */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-[10px] font-semibold text-faint uppercase tracking-[0.15em]">Progress</p>
              <p className="text-2xl font-bold text-ink">
                {pct}<span className="text-sm font-semibold text-faint ml-0.5">%</span>
              </p>
            </div>
            <div className="h-2 w-full bg-dust rounded-full overflow-hidden">
              <div
                className="h-full bg-rust rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            {tracked && canTrackPages && (
              <p className="text-xs text-faint mt-1.5">{pagesRead} of {tracked.totalPages} pages</p>
            )}
          </div>

          {/* Tracked-book controls — shown whenever a tracked record exists */}
          {tracked && (
            <>
              <div>
                <p className="text-[10px] font-semibold text-faint uppercase tracking-[0.15em] mb-2">Status</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {STATUS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setStatus(opt.value)}
                      className={[
                        'text-xs font-semibold rounded-lg px-3 py-2 transition-colors border',
                        status === opt.value
                          ? 'bg-rust text-warm-white border-rust'
                          : 'bg-cream text-muted border-dust hover:border-dust-dark hover:text-ink',
                      ].join(' ')}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-semibold text-faint uppercase tracking-[0.15em] mb-2">Pages read</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={canTrackPages ? tracked.totalPages : undefined}
                    value={pagesRead}
                    onChange={e => handlePagesChange(e.target.value)}
                    className="w-20 text-sm text-center border border-dust bg-cream rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-rust text-ink"
                  />
                  {canTrackPages && (
                    <p className="text-xs text-faint">of {tracked.totalPages}</p>
                  )}
                  <button
                    onClick={handleUpdateProgress}
                    className="ml-auto text-xs font-semibold text-warm-white bg-ink hover:bg-rust rounded-lg px-3 py-1.5 transition-colors"
                  >
                    Update
                  </button>
                </div>
                {canTrackPages && (
                  <p className="text-xs text-faint mt-1.5">
                    {pct}% · {tracked.totalPages - Number(pagesRead)} pages left
                  </p>
                )}
              </div>

              <div>
                <p className="text-[10px] font-semibold text-faint uppercase tracking-[0.15em] mb-2">Rating</p>
                <StarRating
                  value={rating}
                  onChange={v => {
                    setRating(v);
                    db.trackedBooks.update(tracked.id, { rating: v || null });
                  }}
                />
                {rating > 0 && (
                  <button
                    onClick={() => setRating(0)}
                    className="mt-1.5 text-xs text-faint hover:text-muted transition-colors"
                  >
                    Clear rating
                  </button>
                )}
              </div>

              <div>
                <p className="text-[10px] font-semibold text-faint uppercase tracking-[0.15em] mb-2">Notes</p>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Your thoughts on this book…"
                  className="w-full text-sm border border-dust bg-cream rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-rust placeholder-faint text-ink"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-dust shrink-0 flex flex-col gap-2">
          {/* Tracked actions — shown whenever tracked record exists */}
          {tracked && status !== 'finished' && (
            <button
              onClick={handleMarkFinished}
              disabled={saving}
              className="w-full text-sm font-semibold text-warm-white bg-[#3A6435] hover:bg-[#2E5029] rounded-xl py-2.5 transition-colors disabled:opacity-60"
            >
              Finished
            </button>
          )}
          {tracked && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full text-sm font-semibold text-warm-white bg-ink hover:bg-rust rounded-xl py-2.5 transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          )}

          {/* Library actions — shown when onOpen is provided */}
          {onOpen && (
            <>
              {metaChanged && (
                <button
                  onClick={async () => {
                    const title  = editTitle.trim()  || book.title;
                    const author = editAuthor.trim() || null;
                    await db.books.update(book.id, { title, author });
                    setEditingMeta(false);
                  }}
                  className="w-full text-sm font-semibold text-warm-white bg-rust hover:bg-rust-hover rounded-xl py-2.5 transition-colors"
                >
                  Save title / author
                </button>
              )}
              <button
                onClick={() => onOpen(book)}
                className="w-full text-sm font-semibold text-warm-white bg-ink hover:bg-rust rounded-xl py-2.5 transition-colors"
              >
                Open book
              </button>
              {confirming ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted flex-1">Remove book?</span>
                  <button
                    onClick={() => setConfirming(false)}
                    className="text-xs font-semibold text-muted hover:text-ink px-2 py-1.5 rounded-lg hover:bg-parchment transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg px-2 py-1.5 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirming(true)}
                  className="w-full text-sm font-semibold text-faint hover:text-muted rounded-xl py-2 transition-colors"
                >
                  Remove from library
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
