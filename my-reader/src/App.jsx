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

// ─── Nav item definitions ────────────────────────────────────────────────────
// Items with `to` are NavLinks. `isSearch` renders as a button handled by AppLayout.

const NAV_ITEMS = [
  {
    to: '/', end: true, label: 'Library',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    to: '/lists', label: 'Lists',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12M8.25 17.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
      </svg>
    ),
  },
  {
    isSearch: true, label: 'Search',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>
    ),
  },
  {
    to: '/profile', label: 'Profile',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
      </svg>
    ),
  },
]

// ─── Shared nav item renderer ────────────────────────────────────────────────

function NavItem({ item, onSearch, searchOpen, layout }) {
  const isBottom = layout === 'bottom'
  const baseRow = isBottom
    ? 'flex flex-col items-center gap-0.5 pt-2.5 pb-3 w-full transition-colors'
    : 'flex flex-col items-center gap-1 rounded-xl py-2.5 px-1 w-full transition-colors'

  if (item.isSearch) {
    const active = searchOpen
    const cls = isBottom
      ? `${baseRow} ${active ? 'text-gray-900' : 'text-gray-400'}`
      : `${baseRow} ${active ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'}`
    return (
      <button onClick={onSearch} className={cls}>
        {item.icon}
        <span className="text-[10px] font-semibold tracking-wide leading-none">{item.label}</span>
      </button>
    )
  }

  return (
    <NavLink to={item.to} end={item.end} className={isBottom ? 'flex-1' : 'w-full'}>
      {({ isActive }) => (
        <div className={`${baseRow} ${
          isActive
            ? isBottom ? 'text-gray-900' : 'bg-gray-100 text-gray-900'
            : isBottom ? 'text-gray-400' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
        }`}>
          {item.icon}
          <span className="text-[10px] font-semibold tracking-wide leading-none">{item.label}</span>
        </div>
      )}
    </NavLink>
  )
}

// ─── Sidebar (desktop) ───────────────────────────────────────────────────────

function Sidebar({ onAddBook, onSearch, searchOpen }) {
  return (
    <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-20 bg-white border-r border-gray-100 z-20">
      <div className="flex items-center justify-center h-16 border-b border-gray-100 shrink-0">
        <span className="text-xs font-bold tracking-tight text-gray-900 text-center leading-tight">
          My<br />Reader
        </span>
      </div>

      <nav className="flex-1 flex flex-col items-center gap-1 py-3 px-2">
        {NAV_ITEMS.map(item => (
          <NavItem key={item.label} item={item} onSearch={onSearch} searchOpen={searchOpen} layout="sidebar" />
        ))}
      </nav>

      <div className="px-2 pb-4 shrink-0">
        <button
          onClick={onAddBook}
          className="w-full flex flex-col items-center gap-1 rounded-xl py-2.5 px-1 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span className="text-[10px] font-semibold tracking-wide leading-none">Add</span>
        </button>
      </div>
    </aside>
  )
}

// ─── Bottom nav (mobile) ─────────────────────────────────────────────────────

function BottomNav({ onSearch, searchOpen }) {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 z-20 flex">
      {NAV_ITEMS.map(item => (
        <NavItem key={item.label} item={item} onSearch={onSearch} searchOpen={searchOpen} layout="bottom" />
      ))}
    </nav>
  )
}

// ─── Search modal ────────────────────────────────────────────────────────────

function SearchModal({ onClose }) {
  useEffect(() => {
    function onKeyDown(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
        <span className="text-sm font-semibold text-gray-900">Search books</span>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors text-xl leading-none"
        >
          ×
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <BookSearch />
      </div>
    </div>
  )
}

// ─── Shared layout ───────────────────────────────────────────────────────────

function AppLayout() {
  const [showDropZone, setShowDropZone] = useState(false)
  const [showSearch,   setShowSearch]   = useState(false)
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        onAddBook={() => setShowDropZone(true)}
        onSearch={() => setShowSearch(true)}
        searchOpen={showSearch}
      />

      {/* Mobile header */}
      <header className="md:hidden bg-white border-b border-gray-100 px-5 py-3.5 flex items-center justify-between">
        <span className="text-base font-bold tracking-tight text-gray-900">My Reader</span>
        <button
          onClick={() => setShowDropZone(true)}
          className="text-sm font-semibold text-white bg-gray-900 hover:bg-gray-700 rounded-lg px-3 py-1.5 transition-colors"
        >
          + Add
        </button>
      </header>

      <div className="md:pl-20">
        <main className="max-w-3xl mx-auto px-6 py-7 pb-28 md:pb-10">
          <Outlet />
        </main>
      </div>

      <BottomNav onSearch={() => setShowSearch(true)} searchOpen={showSearch} />

      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}

      {showDropZone && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
          onClick={e => { if (e.target === e.currentTarget) setShowDropZone(false) }}
        >
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Add a book</h2>
              <button
                onClick={() => setShowDropZone(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
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

// ─── Route components ────────────────────────────────────────────────────────

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
      onBack={onBack}
    />
  )
}

// ─── Root ────────────────────────────────────────────────────────────────────

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
