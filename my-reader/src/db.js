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

db.version(3).stores({
  books: '++id, title, fileType',
  trackedBooks: '++id, &olKey, title, author, status, dateAdded',
  lists: '++id, name',
  listBooks: '++id, listId, trackedBookId, [listId+trackedBookId]',
}).upgrade(async tx => {
  const now = new Date().toISOString();
  const old = await tx.lists.where('name').equals('Finished / DNF').first();
  if (old) {
    await tx.lists.update(old.id, { name: 'Finished' });
    const dnfListId = await tx.lists.add({ name: 'Did Not Finish', createdAt: now });

    const dnfBooks = await tx.trackedBooks.where('status').equals('dnf').toArray();
    const dnfIds = new Set(dnfBooks.map(b => b.id));
    const entries = await tx.listBooks.where('listId').equals(old.id).toArray();
    const toMove = entries.filter(lb => dnfIds.has(lb.trackedBookId));
    await tx.listBooks.bulkDelete(toMove.map(lb => lb.id));
    await tx.listBooks.bulkAdd(toMove.map(lb => ({ listId: dnfListId, trackedBookId: lb.trackedBookId })));
  } else {
    await tx.lists.bulkAdd([
      { name: 'Finished',       createdAt: now },
      { name: 'Did Not Finish', createdAt: now },
    ]);
  }
});

const DEFAULT_LISTS = ['Want to read', 'Currently reading', 'Finished', 'Did Not Finish'];

const STATUS_TO_LIST = {
  want:     'Want to read',
  reading:  'Currently reading',
  finished: 'Finished',
  dnf:      'Did Not Finish',
};

// Called explicitly from main.jsx before React renders.
// Creates any missing default lists and places orphaned tracked books
// into the correct list based on their status.
export async function initDb() {
  const now = new Date().toISOString();

  const existing = await db.lists.where('name').anyOf(DEFAULT_LISTS).toArray();
  const existingNames = new Set(existing.map(l => l.name));
  const missing = DEFAULT_LISTS.filter(n => !existingNames.has(n));
  if (missing.length) {
    await db.lists.bulkAdd(missing.map(name => ({ name, createdAt: now })));
  }

  const allLists     = await db.lists.toArray();
  const listByName   = Object.fromEntries(allLists.map(l => [l.name, l]));
  const allTracked   = await db.trackedBooks.toArray();
  const allListBooks = await db.listBooks.toArray();
  const inAList      = new Set(allListBooks.map(lb => lb.trackedBookId));

  const toAdd = [];
  for (const book of allTracked) {
    if (inAList.has(book.id) || !book.status) continue;
    const list = listByName[STATUS_TO_LIST[book.status]];
    if (list) toAdd.push({ listId: list.id, trackedBookId: book.id });
  }
  if (toAdd.length) await db.listBooks.bulkAdd(toAdd);
}

export default db;
