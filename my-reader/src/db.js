import Dexie from 'dexie';

const db = new Dexie('MyReaderDB');

db.version(1).stores({
  books: '++id, title, fileType',
});

export default db;
