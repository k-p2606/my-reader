import { useEffect, useRef, useState } from 'react';
import ePub from 'epubjs';
import db from '../db';

const FONT_SIZES = [80, 90, 100, 110, 120, 130, 150];
const DEFAULT_SIZE = 100;

const THEMES = {
  light: {
    body: { background: '#F4EDE0 !important', color: '#2A1A0E !important' },
    'p, span, div, li, blockquote': { color: '#2A1A0E !important' },
    'h1, h2, h3, h4, h5, h6': { color: '#2A1A0E !important' },
    a: { color: '#8B3525 !important' },
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

const THEME_CSS = {
  light: `body{background:#F4EDE0!important;color:#2A1A0E!important}p,span,div,li,blockquote{color:#2A1A0E!important}h1,h2,h3,h4,h5,h6{color:#2A1A0E!important}a{color:#8B3525!important}`,
  dark:  `body{background:#1c1c1e!important;color:#e8e8e8!important}p,span,div,li,blockquote{color:#e8e8e8!important}h1,h2,h3,h4,h5,h6{color:#f5f5f5!important}a{color:#6ea8fe!important}`,
};

function injectThemeCSS(contents, themeName) {
  try {
    let el = contents.document.getElementById('__reader_theme__');
    if (!el) {
      el = contents.document.createElement('style');
      el.id = '__reader_theme__';
      contents.document.head.appendChild(el);
    }
    el.textContent = THEME_CSS[themeName] ?? THEME_CSS.light;
  } catch {}
}

export default function EpubReader({ bookId, title, fileData, savedCfi, trackedBookId, onBack }) {
  const bookRef        = useRef(null);
  const renditionRef   = useRef(null);
  const themeRef       = useRef('light');
  const saveTimerRef   = useRef(null);
  const [showSettings, setShowSettings] = useState(false);
  const [fontSize,     setFontSize]     = useState(DEFAULT_SIZE);
  const [theme,        setTheme]        = useState('light');
  const [currentProgress, setCurrentProgress] = useState(0);

  const isDark = theme === 'dark';

  useEffect(() => {
    if (!fileData) return;

    const book = ePub(fileData);
    bookRef.current = book;

    const rendition = book.renderTo('viewer', {
      width:          '100%',
      height:         '100%',
      spread:         'auto',   // two pages on wide screens, one on narrow
      minSpreadWidth: 768,      // matches Tailwind's md breakpoint
    });
    renditionRef.current = rendition;

    rendition.themes.register('light', THEMES.light);
    rendition.themes.register('dark', THEMES.dark);
    rendition.themes.select(themeRef.current);

    rendition.hooks.content.register(contents => {
      injectThemeCSS(contents, themeRef.current);
    });

    rendition.display(savedCfi || undefined);

    rendition.on('relocated', (location) => {
      const cfi = location.start.cfi;

      // Save position immediately so resume always works
      db.books.update(bookId, { lastPosition: cfi });

      const total = book.spine.items.length;
      if (total > 0) {
        const chapterIdx      = location.start.index;
        const pageInChapter   = location.start.displayed?.page ?? 1;
        const totalInChapter  = location.start.displayed?.total || 1;
        const pct = Math.min(1, (chapterIdx + pageInChapter / totalInChapter) / total);
        setCurrentProgress(pct);

        // Debounce the heavier progress writes — 1.5 s after last page turn
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          if (pct > 0) {
            db.books.update(bookId, { progress: pct });
            if (trackedBookId) db.trackedBooks.update(trackedBookId, { readerProgress: pct });
          }
        }, 1500);
      }
    });

    return () => {
      clearTimeout(saveTimerRef.current);
      book.destroy();
    };
  }, [fileData]);

  useEffect(() => {
    themeRef.current = theme;
    const r = renditionRef.current;
    if (!r) return;
    r.themes.select(theme);
    try {
      r.getContents().forEach(contents => injectThemeCSS(contents, theme));
    } catch {}
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

  const settingsBtnCls = isDark
    ? 'w-8 h-8 flex items-center justify-center rounded-md bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs font-bold'
    : 'w-8 h-8 flex items-center justify-center rounded-md bg-dust text-ink hover:bg-parchment disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs font-bold border border-dust';

  return (
    <div className={`flex flex-col h-screen ${isDark ? 'bg-[#1c1c1e]' : 'bg-cream'}`}>
      <header className={`flex items-center justify-between px-6 py-3 shrink-0 border-b ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-warm-white border-dust'}`}>
        <button
          onClick={onBack}
          className={`transition-colors p-1 ${isDark ? 'text-white/70 hover:text-white' : 'text-faint hover:text-ink'}`}
          aria-label="Back to library"
        >
          <IconBack />
        </button>
        <span className={`text-sm font-medium truncate max-w-xs ${isDark ? 'text-white' : 'text-ink'}`}>
          {title}
        </span>
        <button
          onClick={() => setShowSettings(s => !s)}
          className={`transition-colors p-1 ${isDark
            ? (showSettings ? 'text-white' : 'text-white/70 hover:text-white')
            : (showSettings ? 'text-ink' : 'text-faint hover:text-ink')
          }`}
          aria-label="Settings"
        >
          <IconSettings />
        </button>
      </header>

      {showSettings && (
        <div className={`flex items-center gap-6 px-6 py-3 border-b shrink-0 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-parchment border-dust'}`}>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-medium uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-faint'}`}>Font</span>
            <div className="flex items-center gap-2">
              <button onClick={decreaseFont} disabled={fontSize === FONT_SIZES[0]} className={settingsBtnCls}>A−</button>
              <span className={`text-sm w-10 text-center ${isDark ? 'text-white' : 'text-ink'}`}>{fontSize}%</span>
              <button onClick={increaseFont} disabled={fontSize === FONT_SIZES[FONT_SIZES.length - 1]} className={settingsBtnCls}>A+</button>
            </div>
          </div>

          <div className={`w-px h-5 ${isDark ? 'bg-gray-600' : 'bg-dust-dark'}`} />

          <div className="flex items-center gap-3">
            <span className={`text-xs font-medium uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-faint'}`}>Theme</span>
            <button
              onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${isDark ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-dust text-ink hover:bg-parchment'}`}
            >
              {isDark ? <IconSun /> : <IconMoon />}
              {isDark ? 'Light' : 'Dark'}
            </button>
          </div>
        </div>
      )}

      {/* Viewer — darker surround so pages read as distinct paper sheets */}
      <div className={`flex-1 overflow-hidden relative ${isDark ? 'bg-[#0d0d0d]' : 'bg-[#BDA882]'}`}>
        <div id="viewer" className="w-full h-full" />
        {/* Spine — visible only when epubjs is in two-page spread mode */}
        <div
          className={`hidden md:block absolute inset-y-0 left-1/2 w-px pointer-events-none z-10
            ${isDark ? 'bg-white/10' : 'bg-black/15'}`}
        />
      </div>

      <footer className={`flex items-center justify-between px-6 py-3 shrink-0 border-t ${isDark ? 'bg-[#1c1c1e] border-gray-700' : 'bg-warm-white border-dust'}`}>
        <button
          onClick={prevPage}
          className={`text-sm font-medium transition-colors px-4 py-2 rounded-lg ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-muted hover:text-ink hover:bg-parchment'}`}
        >
          ← Previous
        </button>
        <div className="flex flex-col items-center gap-1.5 min-w-24">
          {currentProgress > 0 ? (
            <>
              <div className={`w-28 h-0.5 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-dust'}`}>
                <div
                  className={`h-full rounded-full transition-all duration-300 ${isDark ? 'bg-gray-400' : 'bg-rust'}`}
                  style={{ width: `${Math.round(currentProgress * 100)}%` }}
                />
              </div>
              <span className={`text-xs select-none ${isDark ? 'text-gray-500' : 'text-faint'}`}>
                {Math.round(currentProgress * 100)}%
              </span>
            </>
          ) : (
            <span className={`text-xs select-none ${isDark ? 'text-gray-700' : 'text-faint'}`}>← → to navigate</span>
          )}
        </div>
        <button
          onClick={nextPage}
          className={`text-sm font-medium transition-colors px-4 py-2 rounded-lg ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-muted hover:text-ink hover:bg-parchment'}`}
        >
          Next →
        </button>
      </footer>
    </div>
  );
}
