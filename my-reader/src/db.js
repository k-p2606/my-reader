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

export default db;
