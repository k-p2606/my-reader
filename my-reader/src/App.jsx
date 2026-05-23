import { useState, useEffect } from 'react'
import { Routes, Route, NavLink, Navigate, Outlet, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import './App.css'
import db from './db'
import Library from './components/Library'
import ListsView from './components/ListsView'
import BookSearch from './components/BookSearch'
import ProfilePage from './components/ProfilePage'
import EpubReader from './components/EpubReader'
import PdfReader from './components/PdfReader'
import DropZone from './components/DropZone'

const NAV_ITEMS = [
  {
    to: '/', end: true, label: 'Library',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    to: '/lists', label: 'Lists',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12M8.25 17.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
      </svg>
    ),
  },
  {
    isSearch: true, label: 'Search',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>
    ),
  },
  {
    to: '/profile', label: 'Profile',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
      </svg>
    ),
  },
]

// ─── Bottom nav item (mobile only) ───────────────────────────────────────────

function BottomNavItem({ item, onSearch, searchOpen }) {
  const base = 'flex flex-col items-center gap-0.5 pt-2.5 pb-3 w-full transition-colors'

  if (item.isSearch) {
    return (
      <button
        onClick={onSearch}
        className={`${base} ${searchOpen ? 'text-rust' : 'text-faint hover:text-muted'}`}
      >
        {item.icon}
        <span className="text-[10px] font-semibold tracking-wide leading-none">{item.label}</span>
      </button>
    )
  }

  return (
    <NavLink to={item.to} end={item.end} className="flex-1">
      {({ isActive }) => (
        <div className={`${base} ${isActive ? 'text-rust' : 'text-faint hover:text-muted'}`}>
          {item.icon}
          <span className="text-[10px] font-semibold tracking-wide leading-none">{item.label}</span>
        </div>
      )}
    </NavLink>
  )
}

// ─── Top nav (desktop) ────────────────────────────────────────────────────────

function TopNav({ onAddBook, onSearch, searchOpen }) {
  return (
    <header className="hidden md:flex items-center justify-between px-8 h-[62px] bg-warm-white border-b border-dust fixed top-0 left-0 right-0 z-20">
      {/* Logo */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-7 h-7 rounded-full bg-rust flex items-center justify-center shrink-0">
          <svg className="w-3.5 h-3.5 text-warm-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-ink tracking-tight">my reader</span>
      </div>

      {/* Nav links — centered relative to the full header */}
      <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-8">
        {NAV_ITEMS.filter(i => !i.isSearch).map(item => (
          <NavLink key={item.label} to={item.to} end={item.end}>
            {({ isActive }) => (
              <span className={`text-sm transition-colors pb-[3px] border-b-2 ${
                isActive
                  ? 'text-ink font-semibold border-rust'
                  : 'text-muted border-transparent hover:text-ink'
              }`}>
                {item.label}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Right controls */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onSearch}
          className={`flex items-center gap-2 pl-3.5 pr-6 py-2 rounded-full text-[13px] transition-colors ${
            searchOpen ? 'bg-dust text-ink' : 'bg-parchment hover:bg-dust text-muted hover:text-ink'
          }`}
        >
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <span className="text-muted">search a title, an author…</span>
        </button>
        <button
          onClick={onAddBook}
          className="text-xs font-semibold text-warm-white bg-ink hover:bg-rust rounded-full px-4 py-2 transition-colors"
        >
          + add a book
        </button>
      </div>
    </header>
  )
}

// ─── Bottom nav (mobile) ─────────────────────────────────────────────────────

function BottomNav({ onSearch, searchOpen }) {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-warm-white border-t border-dust z-20 flex">
      {NAV_ITEMS.map(item => (
        <BottomNavItem key={item.label} item={item} onSearch={onSearch} searchOpen={searchOpen} />
      ))}
    </nav>
  )
}

// ─── Search modal ─────────────────────────────────────────────────────────────

function SearchModal({ onClose }) {
  useEffect(() => {
    function onKeyDown(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-warm-white">
      <div className="flex items-center justify-between px-6 py-4 border-b border-dust shrink-0">
        <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted">/ Search</p>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-faint hover:text-ink hover:bg-parchment transition-colors text-xl leading-none"
        >
          ×
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <BookSearch />
      </div>
    </div>
  )
}

// ─── Shared layout ────────────────────────────────────────────────────────────

function AppLayout() {
  const [showDropZone, setShowDropZone] = useState(false)
  const [showSearch,   setShowSearch]   = useState(false)
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-cream">
      <TopNav
        onAddBook={() => setShowDropZone(true)}
        onSearch={() => setShowSearch(v => !v)}
        searchOpen={showSearch}
      />

      {/* Mobile header */}
      <header className="md:hidden bg-warm-white border-b border-dust px-5 py-3.5 flex items-center justify-between fixed top-0 inset-x-0 z-20">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-rust flex items-center justify-center shrink-0">
            <svg className="w-3 h-3 text-warm-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-ink">my reader</span>
        </div>
        <button
          onClick={() => setShowDropZone(true)}
          className="text-xs font-semibold text-warm-white bg-ink hover:bg-rust rounded-full px-3 py-1.5 transition-colors"
        >
          + Add
        </button>
      </header>

      <div className="md:pt-[62px] pt-[54px]">
        <main className="max-w-5xl mx-auto px-6 py-10 pb-28 md:pb-14">
          <Outlet />
        </main>
      </div>

      <BottomNav onSearch={() => setShowSearch(v => !v)} searchOpen={showSearch} />

      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}

      {showDropZone && (
        <div
          className="fixed inset-0 bg-ink/50 flex items-center justify-center z-50 px-4"
          onClick={e => { if (e.target === e.currentTarget) setShowDropZone(false) }}
        >
          <div className="bg-warm-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-dust">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted">/ add to library</p>
                <h2 className="text-base font-semibold text-ink mt-0.5">Add a book</h2>
              </div>
              <button
                onClick={() => setShowDropZone(false)}
                className="text-faint hover:text-ink text-2xl leading-none transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-parchment"
              >
                ×
              </button>
            </div>
            <DropZone onBookAdded={() => { setShowDropZone(false); navigate('/') }} />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Route components ─────────────────────────────────────────────────────────

function LibraryRoute() {
  const navigate = useNavigate()
  return <Library onOpenBook={book => navigate(`/read/${book.id}`)} />
}

function ReaderRoute() {
  const { bookId } = useParams()
  const navigate = useNavigate()
  const book = useLiveQuery(() => db.books.get(Number(bookId)), [bookId])

  if (book === undefined) return null
  if (!book) return <Navigate to="/" replace />

  const onBack = () => navigate('/')

  if (book.fileType === 'pdf') {
    return (
      <PdfReader
        bookId={book.id}
        title={book.title}
        fileData={book.fileData}
        savedPage={book.lastPosition}
        trackedBookId={book.trackedBookId}
        onBack={onBack}
      />
    )
  }
  return (
    <EpubReader
      bookId={book.id}
      title={book.title}
      fileData={book.fileData}
      savedCfi={book.lastPosition}
      trackedBookId={book.trackedBookId}
      onBack={onBack}
    />
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<LibraryRoute />} />
        <Route path="lists" element={<ListsView />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="/read/:bookId" element={<ReaderRoute />} />
    </Routes>
  )
}
