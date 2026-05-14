import { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../db';
import BookDetail from './BookDetail';
import TrackLinkModal from './TrackLinkModal';

const STATUS_LABELS = { want: 'Want to read', reading: 'Reading', finished: 'Finished', dnf: 'DNF' };
const STATUS_COLORS = {
  want:     'bg-gray-100 text-gray-500',
  reading:  'bg-blue-50 text-blue-600',
  finished: 'bg-green-50 text-green-600',
  dnf:      'bg-red-50 text-red-400',
};

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
    if (!fileType) {
      setError('Only .epub and .pdf files are supported.');
      return;
    }
    setLoading(true);
    try {
      const fileData = await readAsArrayBuffer(file);
      await db.books.add({
        title: file.name.replace(/\.(epub|pdf)$/i, ''),
        fileType,
        fileData,
        lastPosition: null,
      });
    } catch {
      setError('Failed to save the file. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function onDragOver(e) {
    e.preventDefault();
    setDragging(true);
  }

  function onDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function onInputChange(e) {
    const file = e.target.files[0];
    if (file) handleFile(file);
    e.target.value = '';
  }

  return (
    <div className="flex items-center justify-center py-12 px-4">
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !loading && inputRef.current.click()}
        className={[
          'flex flex-col items-center justify-center gap-5 w-full max-w-xl',
          'border-2 border-dashed rounded-3xl py-24 px-12 cursor-pointer select-none',
          'transition-colors duration-150',
          dragging
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white',
          loading && 'opacity-60 cursor-wait',
        ].join(' ')}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".epub,.pdf"
          className="hidden"
          onChange={onInputChange}
        />

        <svg
          className={`w-14 h-14 transition-colors ${dragging ? 'text-blue-400' : 'text-gray-300'}`}
          fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5v-9m0 0-3 3m3-3 3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.338-2.032A4.501 4.501 0 0 1 17.25 19.5H6.75Z" />
        </svg>

        {loading ? (
          <p className="text-sm font-medium text-gray-500">Saving book…</p>
        ) : (
          <div className="text-center space-y-1.5">
            <p className={`text-base font-semibold transition-colors ${dragging ? 'text-blue-600' : 'text-gray-600'}`}>
              {dragging ? 'Drop it!' : 'Drop an EPUB or PDF here to get started'}
            </p>
            <p className="text-sm text-gray-400">
              or <span className="underline underline-offset-2">browse your files</span>
            </p>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-500 font-medium">{error}</p>
        )}
      </div>
    </div>
  );
}

function BookCard({ book, linkedTracked, onClick }) {
  const [confirming, setConfirming] = useState(false);
  const [showTrack,  setShowTrack]  = useState(false);

  function handleDelete(e) {
    e.stopPropagation();
    db.books.delete(book.id);
  }

  return (
    <>
      <div
        onClick={!confirming ? onClick : undefined}
        className="flex flex-col justify-between gap-3 border rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      >
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            {book.fileType}
          </span>
          <p className="mt-1 text-sm font-medium text-gray-800 line-clamp-3 leading-snug">
            {book.title}
          </p>
        </div>

        {book.progress > 0 && (
          <div className="space-y-1">
            <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gray-800 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.round(book.progress * 100))}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">{Math.round(book.progress * 100)}%</p>
          </div>
        )}

        {confirming ? (
          <div
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-2 mt-auto"
          >
            <span className="text-xs text-gray-500 flex-1">Remove book?</span>
            <button
              onClick={e => { e.stopPropagation(); setConfirming(false); }}
              className="text-xs font-semibold text-gray-500 hover:text-gray-800 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
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
          <div className="flex items-center justify-between mt-auto">
            <button
              onClick={e => { e.stopPropagation(); setShowTrack(true); }}
              className={linkedTracked
                ? `text-xs font-semibold rounded-full px-2.5 py-1 transition-colors ${STATUS_COLORS[linkedTracked.status] ?? 'bg-gray-100 text-gray-400'}`
                : 'text-xs text-gray-400 hover:text-gray-600 transition-colors'
              }
            >
              {linkedTracked ? (STATUS_LABELS[linkedTracked.status] ?? linkedTracked.status) : '+ Track'}
            </button>
            <button
              onClick={e => { e.stopPropagation(); setConfirming(true); }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
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

  const trackedById = Object.fromEntries(trackedBooks.map(t => [t.id, t]));

  if (books === undefined) return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-8">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3 border rounded-xl p-4 bg-white shadow-sm">
          <div className="space-y-2">
            <div className="h-2.5 w-8 bg-gray-200 rounded animate-pulse" />
            <div className="h-3.5 bg-gray-200 rounded animate-pulse" />
            <div className="h-3.5 bg-gray-200 rounded animate-pulse w-4/5" />
            <div className="h-3.5 bg-gray-200 rounded animate-pulse w-3/5" />
          </div>
          <div className="h-1 bg-gray-200 rounded-full animate-pulse mt-auto" />
        </div>
      ))}
    </div>
  );

  if (books.length === 0) return <EmptyState />;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-8">
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
