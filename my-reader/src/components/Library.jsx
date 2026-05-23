import { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../db';
import BookDetail from './BookDetail';
import TrackLinkModal from './TrackLinkModal';

const STATUS_LABELS = { want: 'Want to read', reading: 'Reading', finished: 'Finished', dnf: 'DNF' };
const STATUS_COLORS = {
  want:     'bg-parchment text-muted',
  reading:  'bg-rust-soft text-rust',
  finished: 'bg-[#E8F0E6] text-[#3A6435]',
  dnf:      'bg-red-50 text-red-400',
};

const COVER_COLORS = [
  '#8B3525', '#6B5540', '#3D4A3A', '#4A3D58', '#2A404E', '#5C4527', '#3A3028', '#4E4535',
];

function hashTitle(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function getFileType(file) {
  if (file.name.endsWith('.epub') || file.type === 'application/epub+zip') return 'epub';
  if (file.name.endsWith('.pdf') || file.type === 'application/pdf') return 'pdf';
  return null;
}

function readAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  );
}

function EmptyState() {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  async function handleFile(file) {
    setError(null);
    const fileType = getFileType(file);
    if (!fileType) { setError('Only .epub and .pdf files are supported.'); return; }
    setLoading(true);
    try {
      const fileData = await readAsArrayBuffer(file);
      await db.books.add({ title: file.name.replace(/\.(epub|pdf)$/i, ''), fileType, fileData, lastPosition: null });
    } catch {
      setError('Failed to save the file. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function onDragOver(e) { e.preventDefault(); setDragging(true); }
  function onDragLeave(e) { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); }
  function onDrop(e) { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }
  function onInputChange(e) { const f = e.target.files[0]; if (f) handleFile(f); e.target.value = ''; }

  return (
    <div className="flex flex-col items-start py-8">
      <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted">/ your library</p>
      <h1 className="font-serif italic font-semibold text-4xl md:text-[3.25rem] text-ink leading-[1.1] mt-2 mb-10">
        empty shelves,<br />waiting.
      </h1>

      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !loading && inputRef.current.click()}
        className={[
          'flex flex-col items-center justify-center gap-5 w-full max-w-xl',
          'border-2 border-dashed rounded-3xl py-20 px-12 cursor-pointer select-none',
          'transition-colors duration-150',
          dragging ? 'border-rust bg-rust-soft' : 'border-dust bg-parchment/50 hover:border-dust-dark hover:bg-parchment',
          loading && 'opacity-60 cursor-wait',
        ].join(' ')}
      >
        <input ref={inputRef} type="file" accept=".epub,.pdf" className="hidden" onChange={onInputChange} />

        <svg
          className={`w-12 h-12 transition-colors ${dragging ? 'text-rust' : 'text-faint'}`}
          fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5v-9m0 0-3 3m3-3 3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.338-2.032A4.501 4.501 0 0 1 17.25 19.5H6.75Z" />
        </svg>

        {loading ? (
          <p className="text-sm font-medium text-muted">Saving book…</p>
        ) : (
          <div className="text-center space-y-1.5">
            <p className={`text-base font-semibold transition-colors ${dragging ? 'text-rust' : 'text-muted'}`}>
              {dragging ? 'Drop it here.' : 'Drop an EPUB or PDF to get started'}
            </p>
            <p className="text-sm text-faint">
              or <span className="underline underline-offset-2">browse your files</span>
            </p>
          </div>
        )}

        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
      </div>
    </div>
  );
}

function BookCard({ book, linkedTracked, onClick }) {
  const [confirming, setConfirming] = useState(false);
  const [showTrack,  setShowTrack]  = useState(false);

  const coverColor = COVER_COLORS[hashTitle(book.title) % COVER_COLORS.length];
  const coverUrl   = linkedTracked?.coverUrl ?? null;
  const progress   = book.progress > 0 ? Math.min(100, Math.round(book.progress * 100)) : 0;

  function handleDelete(e) {
    e.stopPropagation();
    db.books.delete(book.id);
  }

  return (
    <>
      <div className="flex flex-col rounded-2xl overflow-hidden border border-dust shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer">
        {/* Cover */}
        <div
          onClick={!confirming ? onClick : undefined}
          className="relative select-none aspect-2/3 overflow-hidden"
          style={!coverUrl ? { background: coverColor } : undefined}
        >
          {coverUrl ? (
            <img src={coverUrl} alt={book.title} className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col justify-end p-4">
              <p className="font-serif italic text-white/90 text-sm leading-snug line-clamp-4">
                {book.title}
              </p>
              <p className="text-[9px] font-bold tracking-[0.15em] uppercase text-white/40 mt-1.5">
                {book.fileType}
              </p>
            </div>
          )}
        </div>

        {/* Title + author */}
        <div
          onClick={!confirming ? onClick : undefined}
          className="px-3 pt-2.5 pb-1 bg-warm-white"
        >
          <p className="text-sm font-semibold text-ink leading-snug line-clamp-2">{book.title}</p>
          {(linkedTracked?.author || book.author) && (
            <p className="text-xs text-muted mt-0.5 truncate">{linkedTracked?.author ?? book.author}</p>
          )}
        </div>

        {/* Progress bar */}
        {progress > 0 && (
          <div className="px-3 pt-2 bg-warm-white">
            <div className="h-0.5 w-full bg-dust rounded-full overflow-hidden">
              <div
                className="h-full bg-rust rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        {confirming ? (
          <div
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-2 px-3 py-2.5 bg-warm-white"
          >
            <span className="text-xs text-muted flex-1">Remove?</span>
            <button
              onClick={e => { e.stopPropagation(); setConfirming(false); }}
              className="text-xs font-medium text-muted hover:text-ink px-2 py-1 rounded-lg hover:bg-parchment transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg px-2 py-1 transition-colors"
            >
              Delete
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between px-3 py-2.5 bg-warm-white">
            <button
              onClick={e => { e.stopPropagation(); setShowTrack(true); }}
              className={`text-[11px] font-semibold rounded-full px-2.5 py-0.5 transition-colors ${
                linkedTracked
                  ? STATUS_COLORS[linkedTracked.status] ?? 'bg-parchment text-muted'
                  : 'text-faint hover:text-muted'
              }`}
            >
              {linkedTracked
                ? (STATUS_LABELS[linkedTracked.status] ?? linkedTracked.status)
                : (progress > 0 ? `${progress}%` : '+ track')}
            </button>
            <button
              onClick={e => { e.stopPropagation(); setConfirming(true); }}
              className="p-1.5 rounded-lg text-faint hover:text-rust hover:bg-rust-soft transition-colors"
              aria-label="Delete book"
            >
              <TrashIcon />
            </button>
          </div>
        )}
      </div>

      {showTrack && (
        <TrackLinkModal
          book={book}
          linkedTracked={linkedTracked}
          onClose={() => setShowTrack(false)}
        />
      )}
    </>
  );
}

export default function Library({ onOpenBook }) {
  const [detailBook, setDetailBook] = useState(null);
  const books        = useLiveQuery(() => db.books.toArray(),        []);
  const trackedBooks = useLiveQuery(() => db.trackedBooks.toArray(), []) ?? [];
  const trackedById  = Object.fromEntries(trackedBooks.map(t => [t.id, t]));

  if (books === undefined) return (
    <div>
      <div className="mb-10">
        <div className="h-3 w-24 bg-dust rounded-full animate-pulse" />
        <div className="h-12 w-72 bg-dust rounded-xl animate-pulse mt-3" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-2xl overflow-hidden border border-dust">
            <div className="h-48 bg-dust animate-pulse" />
            <div className="p-3.5 bg-warm-white space-y-2">
              <div className="h-2 bg-dust rounded-full animate-pulse w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (books.length === 0) return <EmptyState />;

  return (
    <>
      {/* Hero heading */}
      <div className="mb-10">
        <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted">/ your library</p>
        <h1 className="font-serif italic font-semibold text-4xl md:text-[3.25rem] text-ink leading-[1.1] mt-2">
          your shelf.
        </h1>
        <p className="text-sm text-muted mt-2.5">
          {books.length} {books.length === 1 ? 'book' : 'books'} uploaded
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {books.map(book => (
          <BookCard
            key={book.id}
            book={book}
            linkedTracked={book.trackedBookId ? trackedById[book.trackedBookId] : null}
            onClick={() => setDetailBook(book)}
          />
        ))}
      </div>

      {detailBook && (
        <BookDetail
          book={detailBook}
          onClose={() => setDetailBook(null)}
          onOpen={book => { setDetailBook(null); onOpenBook?.(book); }}
        />
      )}
    </>
  );
}
