import { useState, useRef } from 'react';
import db from '../db';

const ACCEPTED = ['.epub', '.pdf'];
const ACCEPTED_MIME = ['application/epub+zip', 'application/pdf'];

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

export default function DropZone({ onBookAdded }) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
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
      const id = await db.books.add({
        title: file.name.replace(/\.(epub|pdf)$/i, ''),
        fileType,
        fileData,
        lastPosition: null,
      });
      onBookAdded?.({ id, title: file.name.replace(/\.(epub|pdf)$/i, ''), fileType });
    } catch (err) {
      setError('Failed to save the file. Please try again.');
      console.error(err);
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
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => !loading && inputRef.current.click()}
      className={[
        'flex flex-col items-center justify-center gap-3',
        'border-2 border-dashed rounded-2xl p-12 cursor-pointer',
        'transition-colors duration-150 select-none',
        dragging
          ? 'border-blue-500 bg-blue-50 text-blue-700'
          : 'border-gray-300 bg-gray-50 text-gray-500 hover:border-gray-400 hover:bg-gray-100',
        loading && 'opacity-60 cursor-wait',
      ].join(' ')}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        className="hidden"
        onChange={onInputChange}
      />

      <svg className="w-10 h-10 opacity-50" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5v-9m0 0-3 3m3-3 3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.338-2.032A4.501 4.501 0 0 1 17.25 19.5H6.75Z" />
      </svg>

      {loading ? (
        <p className="text-sm font-medium">Saving book…</p>
      ) : (
        <>
          <p className="text-sm font-medium">
            Drop a book here, or <span className="underline">browse</span>
          </p>
          <p className="text-xs opacity-60">Supports .epub and .pdf</p>
        </>
      )}

      {error && (
        <p className="text-xs text-red-500 font-medium">{error}</p>
      )}
    </div>
  );
}
