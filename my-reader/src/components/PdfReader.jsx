import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import db from '../db';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

const ZOOM_STEPS = [50, 75, 100, 125, 150, 200];
const CACHE_MAX = 5;

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

export default function PdfReader({ bookId, title, fileData, savedPage, trackedBookId, onBack }) {
  const canvasRef      = useRef(null);
  const pdfRef         = useRef(null);
  const renderTaskRef  = useRef(null);  // current pdfjs RenderTask (cancellable)
  const pageCacheRef   = useRef(new Map()); // pageNum → offscreen canvas
  const zoomRef        = useRef(100);
  const saveTimerRef   = useRef(null);
  const pageNumRef     = useRef(1);
  const totalPagesRef  = useRef(0);

  const [pageNum,      setPageNum]      = useState(1);
  const [totalPages,   setTotalPages]   = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [darkMode,     setDarkMode]     = useState(false);
  const [zoom,         setZoom]         = useState(100);

  // Keep refs in sync so event listeners always see fresh values
  pageNumRef.current    = pageNum;
  totalPagesRef.current = totalPages;

  // ── Load PDF ──────────────────────────────────────────────────────────────
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
      db.books.update(bookId, { totalPages: pdf.numPages, progress: startPage / pdf.numPages });
      if (trackedBookId) db.trackedBooks.update(trackedBookId, { totalPages: pdf.numPages });
    }

    loadPdf();
    return () => { cancelled = true; };
  }, [fileData]);

  // ── Page rendering with cache ─────────────────────────────────────────────
  useEffect(() => {
    if (!pdfRef.current || !canvasRef.current || totalPages === 0) return;

    const scale = 1.5 * (zoom / 100);
    const cache = pageCacheRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Cancel any in-progress render to avoid wasted GPU work
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      renderTaskRef.current = null;
    }

    async function show() {
      // Cache hit → paint instantly from pre-rendered canvas
      if (cache.has(pageNum)) {
        const src = cache.get(pageNum);
        canvas.width  = src.width;
        canvas.height = src.height;
        ctx.drawImage(src, 0, 0);
        prerender(pageNum, scale); // warm up adjacent pages in background
        return;
      }

      // Cache miss → render directly into the visible canvas
      try {
        const page = await pdfRef.current.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        canvas.width  = viewport.width;
        canvas.height = viewport.height;

        const task = page.render({ canvasContext: ctx, viewport });
        renderTaskRef.current = task;
        await task.promise;
        renderTaskRef.current = null;

        // Copy the result into cache for instant recall later
        const cached = document.createElement('canvas');
        cached.width  = canvas.width;
        cached.height = canvas.height;
        cached.getContext('2d').drawImage(canvas, 0, 0);
        cacheSet(pageNum, cached);

        prerender(pageNum, scale);
      } catch {
        // RenderingCancelledException — next render is already queued
      }
    }

    show();
  }, [pageNum, totalPages, zoom]);

  function cacheSet(key, value) {
    const cache = pageCacheRef.current;
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
    cache.set(key, value);
  }

  async function prerender(currentPage, scale) {
    const cache = pageCacheRef.current;
    const total = totalPagesRef.current;
    const pdf   = pdfRef.current;
    if (!pdf) return;

    // Render adjacent pages that aren't cached yet (fire-and-forget)
    for (const n of [currentPage + 1, currentPage - 1]) {
      if (n < 1 || n > total || cache.has(n)) continue;
      try {
        const page     = await pdf.getPage(n);
        const viewport = page.getViewport({ scale });
        const offscreen = document.createElement('canvas');
        offscreen.width  = viewport.width;
        offscreen.height = viewport.height;
        await page.render({ canvasContext: offscreen.getContext('2d'), viewport }).promise;
        cacheSet(n, offscreen);
      } catch {}
    }
  }

  // Clear stale cache when zoom changes (cached pages are at the old scale)
  useEffect(() => {
    zoomRef.current = zoom;
    pageCacheRef.current.clear();
  }, [zoom]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout(saveTimerRef.current);
      if (renderTaskRef.current) renderTaskRef.current.cancel();
    };
  }, []);

  // ── Debounced DB save ─────────────────────────────────────────────────────
  function scheduleSave(page, total) {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const progress = page / total;
      db.books.update(bookId, { lastPosition: page, progress });
      if (trackedBookId) {
        db.trackedBooks.update(trackedBookId, { pagesRead: page, readerProgress: progress });
      }
    }, 1500);
  }

  function goTo(next) {
    setPageNum(next);
    scheduleSave(next, totalPagesRef.current);
  }

  function prevPage() {
    const next = Math.max(1, pageNumRef.current - 1);
    if (next !== pageNumRef.current) goTo(next);
  }

  function nextPage() {
    const next = Math.min(totalPagesRef.current, pageNumRef.current + 1);
    if (next !== pageNumRef.current) goTo(next);
  }

  function zoomOut() {
    setZoom(z => { const i = ZOOM_STEPS.indexOf(z); return i > 0 ? ZOOM_STEPS[i - 1] : z; });
  }

  function zoomIn() {
    setZoom(z => { const i = ZOOM_STEPS.indexOf(z); return i < ZOOM_STEPS.length - 1 ? ZOOM_STEPS[i + 1] : z; });
  }

  // Keyboard navigation — uses refs so this effect never needs to re-run
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'ArrowLeft')  prevPage();
      if (e.key === 'ArrowRight') nextPage();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const pct = totalPages > 0 ? Math.round((pageNum / totalPages) * 100) : 0;

  return (
    <div className={`flex flex-col h-screen ${darkMode ? 'bg-gray-900' : 'bg-cream'}`}>
      <header className={`flex items-center justify-between px-6 py-3 shrink-0 border-b ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-warm-white border-dust'}`}>
        <button
          onClick={onBack}
          className={`transition-colors p-1 ${darkMode ? 'text-white/70 hover:text-white' : 'text-faint hover:text-ink'}`}
          aria-label="Back to library"
        >
          <IconBack />
        </button>
        <span className={`text-sm font-medium truncate max-w-xs ${darkMode ? 'text-white' : 'text-ink'}`}>
          {title}
        </span>
        <button
          onClick={() => setShowSettings(s => !s)}
          className={`transition-colors p-1 ${darkMode
            ? (showSettings ? 'text-white' : 'text-white/70 hover:text-white')
            : (showSettings ? 'text-ink' : 'text-faint hover:text-ink')
          }`}
          aria-label="Settings"
        >
          <IconSettings />
        </button>
      </header>

      {showSettings && (
        <div className={`flex items-center gap-6 px-6 py-3 border-b shrink-0 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-parchment border-dust'}`}>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-medium uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-faint'}`}>Zoom</span>
            <div className="flex items-center gap-2">
              <button
                onClick={zoomOut}
                disabled={zoom === ZOOM_STEPS[0]}
                className={`w-8 h-8 flex items-center justify-center rounded-md text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-colors ${darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-dust text-ink hover:bg-parchment border border-dust'}`}
              >−</button>
              <span className={`text-sm w-12 text-center tabular-nums ${darkMode ? 'text-white' : 'text-ink'}`}>{zoom}%</span>
              <button
                onClick={zoomIn}
                disabled={zoom === ZOOM_STEPS[ZOOM_STEPS.length - 1]}
                className={`w-8 h-8 flex items-center justify-center rounded-md text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-colors ${darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-dust text-ink hover:bg-parchment border border-dust'}`}
              >+</button>
            </div>
          </div>

          <div className={`w-px h-5 ${darkMode ? 'bg-gray-600' : 'bg-dust-dark'}`} />

          <div className="flex items-center gap-3">
            <span className={`text-xs font-medium uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-faint'}`}>Theme</span>
            <button
              onClick={() => setDarkMode(d => !d)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-dust text-ink hover:bg-parchment'}`}
            >
              {darkMode ? <IconSun /> : <IconMoon />}
              {darkMode ? 'Light' : 'Dark'}
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto py-6 px-4">
        <canvas
          ref={canvasRef}
          className="block mx-auto shadow-lg bg-white"
          style={{ filter: darkMode ? 'invert(1) hue-rotate(180deg)' : 'none' }}
        />
      </div>

      <footer className={`flex items-center justify-between px-6 py-3 shrink-0 border-t ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-warm-white border-dust'}`}>
        <button
          onClick={prevPage}
          disabled={pageNum <= 1}
          className={`text-sm font-medium transition-colors px-4 py-2 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed ${darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-muted hover:text-ink hover:bg-parchment'}`}
        >
          ← Previous
        </button>
        <div className="flex flex-col items-center gap-1.5 min-w-24">
          {totalPages > 0 ? (
            <>
              <div className={`w-28 h-0.5 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-dust'}`}>
                <div
                  className={`h-full rounded-full transition-all duration-300 ${darkMode ? 'bg-gray-400' : 'bg-rust'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className={`text-xs select-none ${darkMode ? 'text-gray-500' : 'text-faint'}`}>
                {pageNum} / {totalPages}
              </span>
            </>
          ) : (
            <span className={`text-xs select-none ${darkMode ? 'text-gray-700' : 'text-faint'}`}>—</span>
          )}
        </div>
        <button
          onClick={nextPage}
          disabled={pageNum >= totalPages}
          className={`text-sm font-medium transition-colors px-4 py-2 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed ${darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-muted hover:text-ink hover:bg-parchment'}`}
        >
          Next →
        </button>
      </footer>
    </div>
  );
}
