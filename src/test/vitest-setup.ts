// Block real HTTP calls to the Lunchmoney API during unit tests.
// Angular HTTP tests must use provideHttpClientTesting() + HttpTestingController.
// Tests that exercise service-worker fetch logic must mock globalThis.fetch locally.
const LUNCHMONEY_API_HOST = 'api.lunchmoney.dev';
const _nativeFetch =
  typeof globalThis.fetch === 'function' ? globalThis.fetch : null;

globalThis.fetch = function lunchmoneyApiGuard(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const rawUrl =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : input.url;

  try {
    const parsed = new URL(rawUrl, 'http://localhost');
    if (parsed.hostname === LUNCHMONEY_API_HOST) {
      return Promise.reject(
        new Error(
          `[Test guard] Blocked real HTTP call to Lunchmoney API: ${rawUrl}. ` +
            `Use provideHttpClientTesting() with HttpTestingController for ` +
            `Angular HTTP tests, or mock globalThis.fetch in your test setup.`
        )
      );
    }
  } catch {
    // Non-parseable or relative URLs pass through.
  }

  if (_nativeFetch) {
    return _nativeFetch.call(globalThis, input, init);
  }

  return Promise.reject(
    new Error('fetch is not available in this test environment')
  );
} as typeof fetch;

const createMemoryStorage = (): Storage => {
  const data = new Map<string, string>();

  return {
    get length() {
      return data.size;
    },
    clear() {
      data.clear();
    },
    getItem(key: string) {
      return data.get(key) ?? null;
    },
    key(index: number) {
      const keys = Array.from(data.keys());
      return keys[index] ?? null;
    },
    removeItem(key: string) {
      data.delete(key);
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    },
  };
};

const ensureStorage = (name: 'localStorage' | 'sessionStorage') => {
  const candidate = (globalThis as Record<string, unknown>)[name];
  const hasStorageApi =
    typeof candidate === 'object' &&
    candidate !== null &&
    typeof (candidate as Storage).getItem === 'function' &&
    typeof (candidate as Storage).setItem === 'function' &&
    typeof (candidate as Storage).removeItem === 'function' &&
    typeof (candidate as Storage).clear === 'function';

  if (!hasStorageApi) {
    Object.defineProperty(globalThis, name, {
      value: createMemoryStorage(),
      configurable: true,
      writable: true,
    });
  }
};

ensureStorage('localStorage');
ensureStorage('sessionStorage');
