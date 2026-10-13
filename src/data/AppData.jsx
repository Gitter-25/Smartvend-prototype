import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createKeyProfile } from '../lib/crypto.js';
import { browserRepository, readStored, storeIfAbsent } from '../lib/storage.js';
import { createPrototypeService, seedState } from '../lib/prototype-service.js';
import Button from '../components/Button';

const DataContext = createContext(null);
let servicePromise;

async function initializeService() {
  let profile = await readStored('keys', 'profile');
  if (!profile) {
    if (await browserRepository.snapshot()) {
      throw new Error('The browser’s encryption keys are missing. Use a fresh browser profile.');
    }
    profile = await storeIfAbsent('keys', 'profile', await createKeyProfile());
  }
  if (!(await browserRepository.snapshot())) {
    await storeIfAbsent('records', 'workspace', await seedState(profile));
  }
  return createPrototypeService(browserRepository, profile);
}

function getService() {
  servicePromise ??= initializeService().catch((error) => {
    servicePromise = null;
    throw error;
  });
  return servicePromise;
}

export function DataProvider({ children }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const serviceRef = useRef(null);

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
    loadData();
  }, []);

  async function runAction(name, input) {
    const service = await getService();
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
        addStudent: (input) => runAction('addStudent', input),
        toggleCard: (input) => runAction('toggleCard', input),
        saveProduct: (id, input) => runAction('saveProduct', { ...input, id }),
        topupWallet: (input) => runAction('topupWallet', input),
        manageCard: (input) => {
          const actions = { enroll: 'enrollCard', verify: 'verifyCard', purchase: 'purchaseCard' };
          return runAction(actions[input.action], input);
        },
        createOrder: (input) => runAction('createOrder', input),
        advanceOrder: (input) => runAction('advanceOrder', input),
        setMachine: (connected) => runAction('setMachine', { connected }),
        resetDemo: () => runAction('resetDemo'),
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
