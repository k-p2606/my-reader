import { useLiveQuery } from 'dexie-react-hooks';
import db from '../db';

export default function Library({ onOpenBook }) {
  const books = useLiveQuery(() => db.books.toArray(), []);

  if (books === undefined) return null;

  if (books.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center mt-8">
        No books yet — drop one above to get started.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-8">
      {books.map(book => (
        <div
          key={book.id}
          className="flex flex-col justify-between gap-3 border rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition-shadow"
        >
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              {book.fileType}
            </span>
            <p className="mt-1 text-sm font-medium text-gray-800 line-clamp-3 leading-snug">
              {book.title}
            </p>
          </div>
          <button
            onClick={() => onOpenBook?.(book)}
            className="mt-auto text-xs font-semibold text-white bg-gray-800 hover:bg-gray-700 rounded-lg px-3 py-1.5 transition-colors"
          >
            Open
          </button>
        </div>
      ))}
    </div>
  );
}
