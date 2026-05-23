import { useState, useRef } from 'react';
import db from '../db';

const ACCEPTED = ['.epub', '.pdf'];

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
  const [error,    setError]    = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [pending,  setPending]  = useState(null); // { file, fileType, title, author }
  const inputRef = useRef(null);

  function stageFile(file) {
    setError(null);
    const fileType = getFileType(file);
    if (!fileType) { setError('Only .epub and .pdf files are supported.'); return; }
    const title = file.name.replace(/\.(epub|pdf)$/i, '');
    setPending({ file, fileType, title, author: '' });
  }

  async function handleConfirm() {
    if (!pending) return;
    setSaving(true);
    try {
      const fileData = await readAsArrayBuffer(pending.file);
      const title = pending.title.trim() || pending.file.name.replace(/\.(epub|pdf)$/i, '');
      const author = pending.author.trim() || null;
      const id = await db.books.add({
        title,
        author,
        fileType: pending.fileType,
        fileData,
        lastPosition: null,
      });
      onBookAdded?.({ id, title, fileType: pending.fileType });
    } catch {
      setError('Failed to save the file. Please try again.');
      setSaving(false);
    }
  }

  function onDragOver(e)  { e.preventDefault(); setDragging(true); }
  function onDragLeave(e) { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); }
  function onDrop(e)      { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) stageFile(f); }
  function onInputChange(e) { const f = e.target.files[0]; if (f) stageFile(f); e.target.value = ''; }

  if (pending) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2.5 px-3 py-2.5 bg-parchment rounded-xl border border-dust">
          <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-faint shrink-0">
            {pending.fileType}
          </span>
          <span className="text-xs text-muted truncate">{pending.file.name}</span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-semibold text-faint uppercase tracking-[0.15em] mb-1.5">
              Title
            </label>
            <input
              autoFocus
              value={pending.title}
              onChange={e => setPending(p => ({ ...p, title: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleConfirm()}
              className="w-full text-sm px-3 py-2 border border-dust bg-cream rounded-lg focus:outline-none focus:ring-2 focus:ring-rust text-ink placeholder-faint"
              placeholder="Book title…"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-faint uppercase tracking-[0.15em] mb-1.5">
              Author <span className="normal-case font-normal">(optional)</span>
            </label>
            <input
              value={pending.author}
              onChange={e => setPending(p => ({ ...p, author: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleConfirm()}
              className="w-full text-sm px-3 py-2 border border-dust bg-cream rounded-lg focus:outline-none focus:ring-2 focus:ring-rust text-ink placeholder-faint"
              placeholder="Author name…"
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => { setPending(null); setError(null); }}
            className="flex-1 text-sm font-semibold text-muted hover:text-ink border border-dust rounded-xl py-2.5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="flex-1 text-sm font-semibold text-warm-white bg-ink hover:bg-rust rounded-xl py-2.5 transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Add to library'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => inputRef.current.click()}
      className={[
        'flex flex-col items-center justify-center gap-5 w-full',
        'border-2 border-dashed rounded-3xl py-16 px-12 cursor-pointer select-none',
        'transition-colors duration-150',
        dragging
          ? 'border-rust bg-rust-soft'
          : 'border-dust bg-parchment/50 hover:border-dust-dark hover:bg-parchment',
      ].join(' ')}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        className="hidden"
        onChange={onInputChange}
      />

      <svg
        className={`w-10 h-10 transition-colors ${dragging ? 'text-rust' : 'text-faint'}`}
        fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5v-9m0 0-3 3m3-3 3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.338-2.032A4.501 4.501 0 0 1 17.25 19.5H6.75Z" />
      </svg>

      <div className="text-center space-y-1.5">
        <p className={`text-base font-semibold transition-colors ${dragging ? 'text-rust' : 'text-muted'}`}>
          {dragging ? 'Drop it here.' : 'Drop an EPUB or PDF to get started'}
        </p>
        <p className="text-sm text-faint">
          or <span className="underline underline-offset-2">browse your files</span>
        </p>
      </div>

      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
}
