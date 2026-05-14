import { useEffect, useRef, useState } from 'react';
import ePub from 'epubjs';
import db from '../db';

const FONT_SIZES = [80, 90, 100, 110, 120, 130, 150];
const DEFAULT_SIZE = 100;

const THEMES = {
  light: {
    body: { background: '#ffffff !important', color: '#111111 !important' },
  },
  dark: {
    body: { background: '#1c1c1e !important', color: '#e8e8e8 !important' },
    'p, span, div, li, blockquote': { color: '#e8e8e8 !important' },
    'h1, h2, h3, h4, h5, h6': { color: '#f5f5f5 !important' },
    a: { color: '#6ea8fe !important' },
  },
};

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

export default function EpubReader({ bookId, title, fileData, savedCfi, onBack }) {
  const bookRef = useRef(null);
  const renditionRef = useRef(null);
  const [showSettings, setShowSettings] = useState(false);
  const [fontSize, setFontSize] = useState(DEFAULT_SIZE);
  const [theme, setTheme] = useState('light');
  const [currentProgress, setCurrentProgress] = useState(0);

  const isDark = theme === 'dark';

  useEffect(() => {
    if (!fileData) return;

    const book = ePub(fileData);
    bookRef.current = book;

    const rendition = book.renderTo('viewer', { width: '100%', height: '100%' });
    renditionRef.current = rendition;

    rendition.themes.register('light', THEMES.light);
    rendition.themes.register('dark', THEMES.dark);

    rendition.display(savedCfi || undefined);

    rendition.on('relocated', async (location) => {
      const cfi = location.start.cfi;
      db.books.update(bookId, { lastPosition: cfi });

      const total = book.spine.items.length;
      if (total > 0) {
        const chapterIdx = location.start.index;
        const pageInChapter = location.start.displayed?.page ?? 1;
        const totalInChapter = location.start.displayed?.total || 1;
        const pct = Math.min(1, (chapterIdx + pageInChapter / totalInChapter) / total);
        setCurrentProgress(pct);
        if (pct > 0) {
          db.books.update(bookId, { progress: pct });
          const tracked = await db.trackedBooks.where('title').equals(title).first();
          if (tracked) {
            db.trackedBooks.update(tracked.id, { readerProgress: pct });
          }
        }
      }
    });

    return () => { book.destroy(); };
  }, [fileData]);

  useEffect(() => {
    renditionRef.current?.themes.select(theme);
  }, [theme]);

  useEffect(() => {
    renditionRef.current?.themes.fontSize(`${fontSize}%`);
  }, [fontSize]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'ArrowLeft') renditionRef.current?.prev();
      if (e.key === 'ArrowRight') renditionRef.current?.next();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function prevPage() { renditionRef.current?.prev(); }
  function nextPage() { renditionRef.current?.next(); }

  function decreaseFont() {
    setFontSize(f => {
      const idx = FONT_SIZES.indexOf(f);
      return idx > 0 ? FONT_SIZES[idx - 1] : f;
    });
  }

  function increaseFont() {
    setFontSize(f => {
      const idx = FONT_SIZES.indexOf(f);
      return idx < FONT_SIZES.length - 1 ? FONT_SIZES[idx + 1] : f;
    });
  }

  const settingsBtnCls = 'w-8 h-8 flex items-center justify-center rounded-md bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs font-bold';

  return (
    <div className={`flex flex-col h-screen ${isDark ? 'bg-[#1c1c1e]' : 'bg-white'}`}>
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
        <div className="flex items-center gap-6 px-6 py-3 bg-gray-800 border-b border-gray-700 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-xs font-medium uppercase tracking-wide">Font</span>
            <div className="flex items-center gap-2">
              <button onClick={decreaseFont} disabled={fontSize === FONT_SIZES[0]} className={settingsBtnCls}>A−</button>
              <span className="text-white text-sm w-10 text-center">{fontSize}%</span>
              <button onClick={increaseFont} disabled={fontSize === FONT_SIZES[FONT_SIZES.length - 1]} className={settingsBtnCls}>A+</button>
            </div>
          </div>

          <div className="w-px h-5 bg-gray-600" />

          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-xs font-medium uppercase tracking-wide">Theme</span>
            <button
              onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-700 text-white hover:bg-gray-600 transition-colors text-xs font-medium"
            >
              {isDark ? <IconSun /> : <IconMoon />}
              {isDark ? 'Light' : 'Dark'}
            </button>
          </div>
        </div>
      )}

      <div id="viewer" className="flex-1 overflow-hidden" />

      <footer className={`flex items-center justify-between px-6 py-3 shrink-0 border-t ${isDark ? 'bg-[#1c1c1e] border-gray-700' : 'bg-white border-gray-200'}`}>
        <button onClick={prevPage} className={`text-sm font-medium transition-colors px-4 py-2 rounded-lg ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}>
          ← Previous
        </button>
        <div className="flex flex-col items-center gap-1.5 min-w-24">
          {currentProgress > 0 ? (
            <>
              <div className={`w-28 h-0.5 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                <div
                  className={`h-full rounded-full transition-all duration-300 ${isDark ? 'bg-gray-400' : 'bg-gray-500'}`}
                  style={{ width: `${Math.round(currentProgress * 100)}%` }}
                />
              </div>
              <span className={`text-xs select-none ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {Math.round(currentProgress * 100)}%
              </span>
            </>
          ) : (
            <span className={`text-xs select-none ${isDark ? 'text-gray-700' : 'text-gray-300'}`}>← → to navigate</span>
          )}
        </div>
        <button onClick={nextPage} className={`text-sm font-medium transition-colors px-4 py-2 rounded-lg ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}>
          Next →
        </button>
      </footer>
    </div>
  );
}
