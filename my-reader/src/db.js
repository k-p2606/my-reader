import Dexie from 'dexie';

const db = new Dexie('MyReaderDB');

db.version(1).stores({
  books: '++id, title, fileType',
});

db.version(2).stores({
  books: '++id, title, fileType',
  trackedBooks: '++id, &olKey, title, author, status, dateAdded',
  lists: '++id, name',
  listBooks: '++id, listId, trackedBookId, [listId+trackedBookId]',
}).upgrade(tx => {
  const now = new Date().toISOString();
  return tx.lists.bulkAdd([
    { name: 'Want to read',       createdAt: now },
    { name: 'Currently reading',  createdAt: now },
    { name: 'Finished / DNF',     createdAt: now },
  ]);
});

export default db;
