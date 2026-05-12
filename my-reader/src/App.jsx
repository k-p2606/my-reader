import { useState } from 'react'
import './App.css'
import DropZone from './components/DropZone'
import Library from './components/Library'

function App() {
  const [showDropZone, setShowDropZone] = useState(false)

  function handleBookAdded() {
    setShowDropZone(false)
  }

  function handleOpenBook(book) {
    console.log('open book:', book)
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="w-full bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <span className="text-lg font-semibold tracking-tight text-gray-900">My Reader</span>
        <button
          onClick={() => setShowDropZone(true)}
          className="text-sm font-semibold text-white bg-gray-900 hover:bg-gray-700 rounded-lg px-4 py-2 transition-colors"
        >
          + Add book
        </button>
      </header>

      <main className="flex-1 w-full px-8 py-8">
        <Library onOpenBook={handleOpenBook} />
      </main>

      {showDropZone && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setShowDropZone(false) }}
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
            <DropZone onBookAdded={handleBookAdded} />
          </div>
        </div>
      )}
    </div>
  )
}

export default App
