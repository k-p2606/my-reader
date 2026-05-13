import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import db from '../db';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

function IconBack() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function IconSun() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
    </svg>
  );
}

export default function PdfReader({ bookId, title, fileData, savedPage, onBack }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const pdfRef = useRef(null);
  const [pageNum, setPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (!fileData) return;
    let cancelled = false;

    async function loadPdf() {
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(fileData.slice(0)) }).promise;
      if (cancelled) return;
      pdfRef.current = pdf;
      setTotalPages(pdf.numPages);
      const startPage = savedPage && savedPage <= pdf.numPages ? savedPage : 1;
      setPageNum(startPage);
      db.books.update(bookId, {
        totalPages: pdf.numPages,
        progress: startPage / pdf.numPages,
      });
    }

    loadPdf();
    return () => { cancelled = true; };
  }, [fileData]);

  useEffect(() => {
    if (!pdfRef.current || !canvasRef.current) return;
    let cancelled = false;

    async function renderPage() {
      const page = await pdfRef.current.getPage(pageNum);
      if (cancelled) return;

      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: ctx, viewport }).promise;
    }

    renderPage();
    return () => { cancelled = true; };
  }, [pageNum, totalPages]);

  function prevPage() {
    setPageNum(n => {
      const next = Math.max(1, n - 1);
      db.books.update(bookId, { lastPosition: next, progress: next / totalPages });
      return next;
    });
  }

  function nextPage() {
    setPageNum(n => {
      const next = Math.min(totalPages, n + 1);
      db.books.update(bookId, { lastPosition: next, progress: next / totalPages });
      return next;
    });
  }

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'ArrowLeft') prevPage();
      if (e.key === 'ArrowRight') nextPage();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [totalPages]);

  return (
    <div className={`flex flex-col h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <header className="flex items-center justify-between px-6 py-3 bg-gray-900 shrink-0">
        <button onClick={onBack} className="text-white/70 hover:text-white transition-colors p-1" aria-label="Back to library">
          <IconBack />
        </button>
        <span className="text-white text-sm font-medium truncate max-w-xs">{title}</span>
        <button
          onClick={() => setShowSettings(s => !s)}
          className={`transition-colors p-1 ${showSettings ? 'text-white' : 'text-white/70 hover:text-white'}`}
          aria-label="Settings"
        >
          <IconSettings />
        </button>
      </header>

      {showSettings && (
        <div className="flex items-center gap-4 px-6 py-3 bg-gray-800 border-b border-gray-700 shrink-0">
          <span className="text-gray-400 text-xs font-medium uppercase tracking-wide">Theme</span>
          <button
            onClick={() => setDarkMode(d => !d)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-700 text-white hover:bg-gray-600 transition-colors text-xs font-medium"
          >
            {darkMode ? <IconSun /> : <IconMoon />}
            {darkMode ? 'Light' : 'Dark'}
          </button>
        </div>
      )}

      <div ref={containerRef} className="flex-1 overflow-y-auto flex justify-center py-6 px-4">
        <canvas
          ref={canvasRef}
          className="shadow-lg bg-white"
          style={darkMode ? { filter: 'invert(1) hue-rotate(180deg)' } : undefined}
        />
      </div>

      <footer className={`flex items-center justify-between px-6 py-3 shrink-0 border-t ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
        <button
          onClick={prevPage}
          disabled={pageNum <= 1}
          className={`text-sm font-medium transition-colors px-4 py-2 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed ${darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
        >
          ← Previous
        </button>
        <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          {totalPages > 0 ? `Page ${pageNum} of ${totalPages}` : '—'}
        </span>
        <button
          onClick={nextPage}
          disabled={pageNum >= totalPages}
          className={`text-sm font-medium transition-colors px-4 py-2 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed ${darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
        >
          Next →
        </button>
      </footer>
    </div>
  );
}
