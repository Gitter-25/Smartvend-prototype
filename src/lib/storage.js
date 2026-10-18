/**
 * Persistence layer: IndexedDB is a database inside this browser profile. The keys store
 * contains CryptoKey objects; records contains the workspace.
 */

const databaseName = 'smartvend-presentation-prototype-v1';
let databasePromise;

/**
 * Open and reuse the IndexedDB connection that stores this browser profile's keys and workspace
 * records.
 */
function openDatabase() {
  databasePromise ??= new Promise((resolve, reject) => {
    // Wrap IndexedDB's event-based database opening in a promise that callers can await.
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      // Create the key and record stores when database version 1 is first installed.
      request.result.createObjectStore('keys');
      request.result.createObjectStore('records');
    };
    /**
     * Return the opened database connection after IndexedDB signals success.
     */
    request.onsuccess = () => resolve(request.result);
    /**
     * Report a database-open failure in a form the startup screen can display.
     */
    request.onerror = () =>
      reject(new Error('Browser storage is unavailable. Allow site storage.'));
    /**
     * Report when another tab prevents the database from opening or upgrading.
     */
    request.onblocked = () => reject(new Error('Close other prototype tabs and try again.'));
  });
  return databasePromise;
}

/**
 * Read a single value from the named IndexedDB store without changing it.
 */
export async function readStored(storeName, key) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    // Wait for a readonly lookup to finish and return its stored value or error.
    const transaction = db.transaction(storeName, 'readonly');
    const request = transaction.objectStore(storeName).get(key);
    /**
     * Return the requested value; a missing key resolves to undefined.
     */
    request.onsuccess = () => resolve(request.result);
    /**
     * Pass a failed lookup back to the caller.
     */
    request.onerror = () => reject(request.error);
  });
}

/**
 * Add initial data only if the key is absent; if another tab adds it first, reuse that saved
 * value instead of overwriting it.
 */
export async function storeIfAbsent(storeName, key, value) {
  const db = await openDatabase();
  try {
    await new Promise((resolve, reject) => {
      // Wait for the add transaction to commit before treating initialization as saved.
      const transaction = db.transaction(storeName, 'readwrite');
      // add fails if the key already exists. Using put here could overwrite another tab's
      // encryption profile during initialization.
      transaction.objectStore(storeName).add(value, key);
      transaction.oncomplete = resolve;
      /**
       * Reject an aborted add transaction so the caller can handle a duplicate key or storage
       * failure.
       */
      transaction.onabort = () => reject(transaction.error);
    });
    return value;
  } catch (error) {
    // A concurrent initializer may win the add. Read its committed value so both tabs use the same
    // keys and workspace.
    if (error?.name === 'ConstraintError') {
      return readStored(storeName, key);
    }
    throw error;
  }
}

export const browserRepository = {
  /**
   * Read the complete saved workspace for a service operation.
   */
  snapshot() {
    return readStored('records', 'workspace');
  },

  /**
   * Apply one synchronous change callback and save its wallet, stock, order, and receipt changes
   * in a single IndexedDB transaction.
   */
  async mutate(change) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      // Wait for the entire write transaction, not just the initial read, before returning the
      // updated state and action result.
      const transaction = db.transaction('records', 'readwrite');
      const store = transaction.objectStore('records');
      const request = store.get('workspace');
      let state;
      let result;
      let failure;
      request.onsuccess = () => {
        // Validate the saved workspace, run the change callback, and queue its write; abort all
        // changes if validation fails.
        try {
          state = request.result;
          if (!state || state.version !== 1) {
            throw new Error('Prototype data is unavailable or has an unsupported version.');
          }
          // The change callback must be synchronous: do crypto/await work before opening this
          // transaction. Throwing aborts the grouped update instead of leaving partial records.
          result = change(state);
          store.put(state, 'workspace');
        } catch (error) {
          failure = error;
          transaction.abort();
        }
      };
      /**
       * Return the updated workspace and action result only after the write commits.
       */
      transaction.oncomplete = () => resolve({ state, result });
      /**
       * Report a validation or storage failure after the transaction rolls back.
       */
      transaction.onabort = () => reject(failure || transaction.error);
    });
  },
};
