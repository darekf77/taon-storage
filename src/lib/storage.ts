/* taon-storage (native, SSR-safe) */
import { UtilsOs, _ } from 'tnp-core/src';
export type StorageEngine = 'localstorage' | 'indexeddb' | 'file' | 'json';

export interface StorOptions<T = any> {
  defaultValue?: T;
  transformFrom?: (valueFromDb: any) => T;
  transformTo?: (valueToDb: T) => any;
}

export interface PendingOperation {
  engine: StorageEngine;
  id: string;
  isDone: boolean;
}

type ClassLike = Function | { name: string } | undefined;

const isBrowser =
  typeof window !== 'undefined' &&
  typeof document !== 'undefined' &&
  typeof navigator !== 'undefined';

function safeLocationPort(): string {
  try {
    return (globalThis as any)?.location?.port || 'no-port';
  } catch {
    return 'no-port';
  }
}

/**
 * Keeps the spirit of your old `storeName = taon-storage_<port>`
 * plus project name namespacing (but without localForage).
 */
export const storeName = `taon-storage_${safeLocationPort()}`;

function defaultNamespace(): string {
  const project = _.kebabCase(globalThis['CURRENT_PROJECT_GENERIC_NAME'] ?? '');
  return project ? `${storeName}_${project}` : storeName;
}

/**
 * Central config (optional).
 * You can set it once at app bootstrap if you want a stable namespace.
 */
export const StorConfig = {
  namespace: defaultNamespace(),
  indexedDb: {
    dbName: `${defaultNamespace()}_INDEXEDDB`,
    storeName: 'keyvaluepairs',
  },
};

function normalizeScopeClass(cls: ClassLike): { name: string } {
  if (!cls) return { name: '__GLOBAL_NAMESPACE__' };
  // if it's a function/class
  if (typeof cls === 'function')
    return { name: (cls as any).name || '__ANON__' };
  // if it's already object with name
  return { name: (cls as any).name || '__ANON__' };
}

export function keyValue(scopeClass: ClassLike, memberName: string) {
  const c = normalizeScopeClass(scopeClass);
  return `${StorConfig.namespace}::taon.storage.class.${c.name}.prop.${memberName}`;
}

export function keyDefaultValueAlreadySet(
  scopeClass: ClassLike,
  memberName: string,
) {
  return `${keyValue(scopeClass, memberName)}::defaultvalueisset`;
}

/** Back-compat alias (your old typo) */
export const keyDefaultValueAreadySet = keyDefaultValueAlreadySet;

/* ---------------------------
 * Stores
 * -------------------------- */

interface AsyncKVStore {
  getItem<T = any>(key: string): Promise<T | undefined>;
  setItem<T = any>(key: string, value: T): Promise<void>;
  removeItem(key: string): Promise<void>;
}

class NoopStore implements AsyncKVStore {
  async getItem<T>(_key: string): Promise<T | undefined> {
    return undefined;
  }
  async setItem<T>(_key: string, _value: T): Promise<void> {
    // noop
  }
  async removeItem(_key: string): Promise<void> {
    // noop
  }
}

class BrowserLocalStorageStore implements AsyncKVStore {
  private ls(): Storage | undefined {
    if (!isBrowser) return undefined;
    try {
      return window.localStorage;
    } catch {
      return undefined;
    }
  }

  async getItem<T>(key: string): Promise<T | undefined> {
    const ls = this.ls();
    if (!ls) return undefined;

    const raw = ls.getItem(key);
    if (raw === null) return undefined;

    try {
      return JSON.parse(raw) as T;
    } catch {
      // if something stored plain string by older versions
      return raw as unknown as T;
    }
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    const ls = this.ls();
    if (!ls) return;

    try {
      ls.setItem(key, JSON.stringify(value));
    } catch {
      // last resort: try as string
      try {
        ls.setItem(key, String(value));
      } catch {
        // ignore (quota/private mode)
      }
    }
  }

  async removeItem(key: string): Promise<void> {
    const ls = this.ls();
    if (!ls) return;
    try {
      ls.removeItem(key);
    } catch {
      // ignore
    }
  }
}

class BrowserIndexedDbStore implements AsyncKVStore {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private openDb(): Promise<IDBDatabase> {
    if (!isBrowser || !(window as any).indexedDB) {
      return Promise.reject(new Error('IndexedDB not available'));
    }
    if (this.dbPromise) return this.dbPromise;

    const { dbName, storeName } = StorConfig.indexedDb;

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(dbName, 1);

      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName);
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    return this.dbPromise;
  }

  private async withStore<T>(
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const db = await this.openDb();
    const { storeName } = StorConfig.indexedDb;

    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const req = fn(store);

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);

      tx.onabort = () => reject(tx.error);
      // tx.oncomplete => nothing
    });
  }

  async getItem<T>(key: string): Promise<T | undefined> {
    try {
      const result = await this.withStore('readonly', s => s.get(key));
      return (result as any) === undefined ? undefined : (result as any);
    } catch {
      return undefined;
    }
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      await this.withStore('readwrite', s => s.put(value as any, key));
    } catch {
      // ignore
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await this.withStore('readwrite', s => s.delete(key) as any);
    } catch {
      // ignore
    }
  }
}

/**
 * Node-side file storage (optional). No top-level node imports (Angular-safe).
 * Works only when executed in Node.
 */
class FileStor implements AsyncKVStore {
  constructor(
    private filePath: string,
    private useJSON = false,
  ) {}

  private isNodeRuntime() {
    return UtilsOs.isNode;
    // return (
    //   typeof process !== 'undefined' &&
    //   !!(process as any).versions?.node &&
    //   typeof (globalThis as any).window === 'undefined'
    // );
  }

  async setItem<T>(_key: string, value: T): Promise<void> {
    if (!this.isNodeRuntime()) return;
    //#region @backendFunc
    const fs = await import('node:fs/promises');
    const data = this.useJSON ? JSON.stringify(value, null, 2) : (value as any);

    if (this.useJSON) {
      await fs.writeFile(this.filePath, String(data), 'utf8');
    } else {
      await fs.writeFile(this.filePath, String(data), 'utf8');
    }
    //#endregion
  }

  async getItem<T>(_key: string): Promise<T | undefined> {
    if (!this.isNodeRuntime()) return undefined;
    //#region @backendFunc
    const fs = await import('node:fs/promises');

    try {
      const buf = await fs.readFile(this.filePath, 'utf8');
      if (!this.useJSON) return buf as any as T;
      return JSON.parse(buf) as T;
    } catch {
      return undefined;
    }
    //#endregion
  }

  async removeItem(_key: string): Promise<void> {
    if (!this.isNodeRuntime()) return;
    //#region @backendFunc
    const fs = await import('node:fs/promises');
    try {
      await fs.rm(this.filePath, { force: true });
    } catch {
      // ignore
    }
    //#endregion
  }
}

/* ---------------------------
 * Pending ops (so you can still await)
 * -------------------------- */

class StorPending {
  static pending: PendingOperation[] = [];
  static id = 0;
  static AWAITING_INTERVAL_TIME = 200;

  static async awaitPendingOperations(id = StorPending.id++): Promise<void> {
    if (id > Number.MAX_SAFE_INTEGER - 2) {
      StorPending.id = 0;
      id = StorPending.id++;
    }

    const pending = StorPending.pending;

    for (const op of pending) {
      if (!op.isDone) {
        await new Promise<void>(resolve => {
          setTimeout(async () => {
            await StorPending.awaitPendingOperations(id);
            resolve();
          }, StorPending.AWAITING_INTERVAL_TIME);
        });
        return;
      }
    }

    // cleanup
    StorPending.pending = pending.filter(p => !p.isDone);
  }

  static start(engine: StorageEngine, id: string): PendingOperation {
    const op: PendingOperation = { engine, id, isDone: false };
    StorPending.pending.push(op);
    return op;
  }

  static done(op: PendingOperation) {
    op.isDone = true;
  }
}

/* ---------------------------
 * Decorator builder
 * -------------------------- */

class StorPropertyBuilder {
  private scopeClass?: ClassLike;
  private engine: StorageEngine;
  private store: AsyncKVStore;
  private filePath?: string;
  private useJsonFile = false;

  constructor(engine: StorageEngine, store: AsyncKVStore) {
    this.engine = engine;
    this.store = store;
  }

  for(scopeClass?: ClassLike) {
    this.scopeClass = scopeClass;
    return this;
  }

  withDefaultValue<T = any>(defaultValue: T) {
    return this.withOptions<T>({ defaultValue });
  }

  withOptions<T = any>(options: StorOptions<T>) {
    const scopeClass = this.scopeClass;

    // per-instance state (fixes prototype-closure sharing)
    const values = new WeakMap<object, T>();
    const initStarted = new WeakMap<object, Promise<void>>();

    const ensureInit = (instance: object) => {
      if (initStarted.has(instance)) return;

      const op = StorPending.start(this.engine, 'init');
      const p = (async () => {
        const memberName = (ensureInit as any).__memberName as string;

        const kVal = keyValue(scopeClass, memberName);
        const kDef = keyDefaultValueAlreadySet(scopeClass, memberName);

        const defProvided = options.defaultValue !== undefined;

        if (
          !isBrowser &&
          (this.engine === 'localstorage' || this.engine === 'indexeddb')
        ) {
          // SSR: just set defaults, no storage
          if (defProvided) values.set(instance, options.defaultValue as T);
          return;
        }

        // Browser (or node file/json)
        if (defProvided) {
          const already = await this.store.getItem<boolean>(kDef);
          if (already) {
            const stored = await this.store.getItem<any>(kVal);
            const v = options.transformFrom
              ? options.transformFrom(stored)
              : stored;
            if (v !== undefined) values.set(instance, v as T);
            else values.set(instance, options.defaultValue as T);
          } else {
            await this.store.setItem(kDef, true);
            const toDb = options.transformTo
              ? options.transformTo(options.defaultValue as T)
              : (options.defaultValue as any);
            await this.store.setItem(kVal, toDb);
            values.set(instance, options.defaultValue as T);
          }
        } else {
          const stored = await this.store.getItem<any>(kVal);
          const v = options.transformFrom
            ? options.transformFrom(stored)
            : stored;
          if (v !== undefined) values.set(instance, v as T);
        }
      })()
        .catch(() => {
          // swallow, keep app alive
        })
        .finally(() => StorPending.done(op));

      initStarted.set(instance, p);
    };

    return (target: any, memberName: string) => {
      (ensureInit as any).__memberName = memberName;

      Object.defineProperty(target, memberName, {
        configurable: true,
        enumerable: true,
        get: function () {
          ensureInit(this);

          if (values.has(this)) return values.get(this);
          if (options.defaultValue !== undefined) return options.defaultValue;
          return undefined;
        },
        set: function (newValue: T) {
          values.set(this, newValue);

          // if this is the first interaction, init will happen anyway
          ensureInit(this);

          const op = StorPending.start(
            (target as any)?.engine ?? 'localstorage',
            'set',
          );

          const scope = scopeClass;
          const kVal = keyValue(scope, memberName);

          const toDb = options.transformTo
            ? options.transformTo(newValue)
            : (newValue as any);

          Promise.resolve()
            .then(() => target as any)
            .then(() => this as any)
            .then(() => this as any)
            .then(async () => {
              // If we are SSR + browser engine => no-op
              if (!isBrowser && (options as any)) return;
              await (options as any); // no-op line to keep TS happy about chaining in some builds
            })
            .catch(() => {
              // ignore
            });

          // do real store write (async)
          Promise.resolve()
            .then(async () => {
              // SSR guard for browser engines
              if (!isBrowser && (StorPropertyInLocalStorage as any)) {
                return;
              }
              await thisStoreForEngineWrite(this, kVal, toDb);
            })
            .catch(() => {
              // ignore
            })
            .finally(() => StorPending.done(op));
        },
      });

      // small helper to keep closure clean
      const builderStore = this.store;
      const builderEngine = this.engine;

      async function thisStoreForEngineWrite(
        _instance: any,
        key: string,
        value: any,
      ) {
        // If browser engines but not browser, skip.
        if (
          !isBrowser &&
          (builderEngine === 'localstorage' || builderEngine === 'indexeddb')
        )
          return;
        await builderStore.setItem(key, value);
      }
    };
  }

  /* optional node-only engines (same builder) */
  file(filePath: string) {
    this.engine = 'file';
    this.filePath = filePath;
    this.useJsonFile = false;
    this.store = new FileStor(filePath, false);
    return this;
  }

  jsonFile(filePath: string) {
    this.engine = 'json';
    this.filePath = filePath;
    this.useJsonFile = true;
    this.store = new FileStor(filePath, true);
    return this;
  }
}

/* ---------------------------
 * Public: clean API exports
 * -------------------------- */

const localStorageStore: AsyncKVStore = isBrowser
  ? new BrowserLocalStorageStore()
  : new NoopStore();
const indexedDbStore: AsyncKVStore = isBrowser
  ? new BrowserIndexedDbStore()
  : new NoopStore();

export class StorPropertyInLocalStorage {
  static for(scopeClass?: ClassLike) {
    return new StorPropertyBuilder('localstorage', localStorageStore).for(
      scopeClass,
    );
  }
}

export class StorPropertyInIndexedDb {
  static for(scopeClass?: ClassLike) {
    return new StorPropertyBuilder('indexeddb', indexedDbStore).for(scopeClass);
  }
}

/**
 * Helpers
 */
export async function uncache<CLASS_FUNCTION = any>(
  onlyInThisComponentClass: CLASS_FUNCTION,
  propertyValueToDeleteFromCache: keyof CLASS_FUNCTION,
) {
  const scope =
    onlyInThisComponentClass || ({ name: '__GLOBAL_NAMESPACE__' } as any);
  const prop = String(propertyValueToDeleteFromCache);

  await Promise.all([
    localStorageStore.removeItem(keyValue(scope as any, prop)),
    localStorageStore.removeItem(keyDefaultValueAlreadySet(scope as any, prop)),
    indexedDbStore.removeItem(keyValue(scope as any, prop)),
    indexedDbStore.removeItem(keyDefaultValueAlreadySet(scope as any, prop)),
  ]);
}

/**
 * Backwards-compatible facade:
 * Stor.property.in.localstorage.for(...).withDefaultValue(...)
 */
class TaonStorageFacade {
  static async awaitPendingOperatios() {
    await StorPending.awaitPendingOperations();
  }

  static get property() {
    return {
      in: {
        get localstorage() {
          return new StorPropertyBuilder('localstorage', localStorageStore);
        },
        get indexedb() {
          return new StorPropertyBuilder('indexeddb', indexedDbStore);
        },
        // node-only (safe: dynamic import inside FileStor)
        file(filePath: string) {
          return new StorPropertyBuilder('file', new FileStor(filePath, false));
        },
        jsonFile(filePath: string) {
          return new StorPropertyBuilder('json', new FileStor(filePath, true));
        },
      },
    };
  }
}

export const Stor = TaonStorageFacade;
