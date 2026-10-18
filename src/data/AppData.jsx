/**
 * Workspace coordinator: initialize browser keys/storage, call the service, and refresh React
 * context after each successful action.
 */

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createKeyProfile } from '../lib/crypto.js';
import { browserRepository, readStored, storeIfAbsent } from '../lib/storage.js';
import { createPrototypeService, seedState } from '../lib/prototype-service.js';
import Button from '../components/Button';

const DataContext = createContext(null);
let servicePromise;

/**
 * Load the saved encryption keys and records, create sample data only when needed, and return
 * the browser-only service.
 */
async function initializeService() {
  let profile = await readStored('keys', 'profile');
  if (!profile) {
    // Existing ciphertext needs its original keys. Stop if records exist but keys are missing,
    // instead of silently creating keys that cannot decrypt them.
    if (await browserRepository.snapshot()) {
      throw new Error('The browser’s encryption keys are missing. Use a fresh browser profile.');
    }
    // Store keys as CryptoKey objects in IndexedDB. Reuse keys saved first by another tab rather
    // than overwriting them.
    profile = await storeIfAbsent('keys', 'profile', await createKeyProfile());
  }
  if (!(await browserRepository.snapshot())) {
    await storeIfAbsent('records', 'workspace', await seedState(profile));
  }
  return createPrototypeService(browserRepository, profile);
}

/**
 * Share one initialization promise so React renders do not create separate service instances.
 */
function getService() {
  servicePromise ??= initializeService().catch((error) => {
    // Allow initialization to be tried again after a storage or encryption failure.
    servicePromise = null;
    throw error;
  });
  return servicePromise;
}

/**
 * Provide shared workspace records and action functions to all pages; show a startup screen
 * until data is ready.
 */
export function DataProvider({ children }) {
  // data is the shared workspace snapshot; loading and error describe startup/reload progress.
  // serviceRef retains the initialized service across renders.
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const serviceRef = useRef(null);

  /**
   * Load a fresh workspace snapshot and expose loading or error feedback to the UI.
   */
  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const service = await getService();
      serviceRef.current = service;
      setData((await service.loadData()).data);
    } catch (failure) {
      setError(failure.message || 'Could not open browser storage.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Load the saved workspace when this provider first mounts.
    loadData();
  }, []);

  /**
   * Call the named service operation, update every page with its returned data, and return the
   * operation result to the caller.
   */
  async function runAction(name, input) {
    const service = await getService();
    // The service returns { data, result }. Publish data to all subscribed pages; return result to
    // the form that needs a receipt or success message.
    const response = await service[name](input);
    setData(response.data);
    return response.result;
  }

  if (!data) {
    return (
      <div className="startup-state" role={error ? 'alert' : 'status'}>
        <section className="card">
          <p className="eyebrow">SMARTVEND PROTOTYPE</p>
          <h2>{error ? 'Workspace could not open' : 'Preparing the presentation'}</h2>
          <p>{error || 'Creating browser encryption keys and sample records…'}</p>
          {error && <Button onClick={loadData}>Try again</Button>}
        </section>
      </div>
    );
  }

  return (
    <DataContext.Provider
      value={{
        ...data,
        profile: serviceRef.current.profile,
        loading,
        error,
        loadData,
        /**
         * Forward student registration to the service and refresh shared data.
         */
        addStudent: (input) => runAction('addStudent', input),
        /**
         * Forward the selected student to the card enable/disable operation.
         */
        toggleCard: (input) => runAction('toggleCard', input),
        /**
         * Combine the slot ID and edited fields before forwarding the product update.
         */
        saveProduct: (id, input) => runAction('saveProduct', { ...input, id }),
        /**
         * Forward a fictional wallet-credit request and refresh shared balances.
         */
        topupWallet: (input) => runAction('topupWallet', input),
        manageCard: (input) => {
          // Choose enrollment, verification, or purchase from the form action and run the
          // corresponding service method.
          const actions = { enroll: 'enrollCard', verify: 'verifyCard', purchase: 'purchaseCard' };
          return runAction(actions[input.action], input);
        },
        /**
         * Forward a new simulated QR order request.
         */
        createOrder: (input) => runAction('createOrder', input),
        /**
         * Forward a simulated payment, dispensing, cancellation, or refund action.
         */
        advanceOrder: (input) => runAction('advanceOrder', input),
        /**
         * Wrap the device availability flag in the shape expected by the service.
         */
        setMachine: (connected) => runAction('setMachine', { connected }),
        /**
         * Restore sample records through the service and refresh all pages.
         */
        resetDemo: () => runAction('resetDemo'),
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

/**
 * Read the workspace data and actions from React context without passing them through every
 * component.
 */
export function useData() {
  return useContext(DataContext);
}
