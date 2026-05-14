const BASE = 'https://openlibrary.org';

export async function searchBooks(query) {
  const url = `${BASE}/search.json?q=${encodeURIComponent(query)}&limit=10&fields=key,title,author_name,cover_i,number_of_pages_median`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open Library search failed: ${res.status}`);
  const data = await res.json();

  return data.docs.map(doc => ({
    olKey: doc.key,
    title: doc.title ?? 'Unknown title',
    author: doc.author_name?.[0] ?? 'Unknown author',
    coverUrl: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
      : null,
    coverThumb: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-S.jpg`
      : null,
    totalPages: doc.number_of_pages_median ?? null,
  }));
}
