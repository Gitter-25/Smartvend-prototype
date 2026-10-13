const databaseName = 'smartvend-presentation-prototype-v1';
let databasePromise;

function openDatabase() {
  databasePromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('keys');
      request.result.createObjectStore('records');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new Error('Browser storage is unavailable. Allow site storage.'));
    request.onblocked = () => reject(new Error('Close other prototype tabs and try again.'));
  });
  return databasePromise;
}

export async function readStored(storeName, key) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const request = transaction.objectStore(storeName).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Add, rather than overwrite, keeps a concurrent tab from replacing saved keys.
export async function storeIfAbsent(storeName, key, value) {
  const db = await openDatabase();
  try {
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      transaction.objectStore(storeName).add(value, key);
      transaction.oncomplete = resolve;
      transaction.onabort = () => reject(transaction.error);
    });
    return value;
  } catch (error) {
    if (error?.name === 'ConstraintError') {
      return readStored(storeName, key);
    }
    throw error;
  }
}

export const browserRepository = {
  snapshot() {
    return readStored('records', 'workspace');
  },

  // All wallet, stock, and receipt changes are committed in one browser transaction.
  async mutate(change) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('records', 'readwrite');
      const store = transaction.objectStore('records');
      const request = store.get('workspace');
      let state;
      let result;
      let failure;
      request.onsuccess = () => {
        try {
          state = request.result;
          if (!state || state.version !== 1) {
            throw new Error('Prototype data is unavailable or has an unsupported version.');
          }
          result = change(state);
          store.put(state, 'workspace');
        } catch (error) {
          failure = error;
          transaction.abort();
        }
      };
      transaction.oncomplete = () => resolve({ state, result });
      transaction.onabort = () => reject(failure || transaction.error);
    });
  },
};
