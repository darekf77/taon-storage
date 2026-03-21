import { signal, WritableSignal } from '@angular/core';
import { _, UtilsOs } from 'tnp-core/src';

//#region use all of this in new implementation

interface StorOptions<T = any> {
  defaultValue?: T;
  transformFrom?: (valueFromDb: any) => T;
  transformTo?: (valueToDb: T) => any;

  /**
   * property key in class
   * OR path to file/json
   */
  keyOrPath?: string;
}

const isBrowser = UtilsOs.isBrowser;
const isNode = UtilsOs.isNode;

const safeLocationPort = (): string => {
  try {
    return (globalThis as any)?.location?.port || 'no-port';
  } catch {
    return 'no-port';
  }
};

const storeName = `taon-storage_${safeLocationPort()}`;

const defaultNamespace = (): string => {
  const project = _.kebabCase(globalThis['CURRENT_PROJECT_GENERIC_NAME'] ?? '');
  return project ? `${storeName}_${project}` : storeName;
};

const StorConfig = {
  namespace: defaultNamespace(),
  indexedDb: {
    dbName: `${defaultNamespace()}_INDEXEDDB`,
    storeName: 'keyvaluepairs',
  },
};

type ClassLike = Function | { name: string } | undefined;

const normalizeScopeClass = (cls: ClassLike): { name: string } => {
  if (!cls) return { name: '__GLOBAL_NAMESPACE__' };
  // if it's a function/class
  if (typeof cls === 'function')
    return { name: (cls as any).name || '__ANON__' };
  // if it's already object with name
  return { name: (cls as any).name || '__ANON__' };
};

const keyValue = (scopeClass: ClassLike, memberName: string) => {
  const c = normalizeScopeClass(scopeClass);
  return `${StorConfig.namespace}::taon.storage.class.${c.name}.prop.${memberName}`;
};

const keyDefaultValueAlreadySet = (
  scopeClass: ClassLike,
  memberName: string,
): string => {
  return `${keyValue(scopeClass, memberName)}::defaultvalueisset`;
};
//#endregion

//#region core

interface AsyncKVStore {
  getItem<T = any>(key: string): Promise<T | undefined>;
  setItem<T = any>(key: string, value: T): Promise<void>;
  removeItem(key: string): Promise<void>;
}

//#region local storage
class LocalStorageStore implements AsyncKVStore {
  async getItem<T>(key: string): Promise<T | undefined> {
    if (!isBrowser) return undefined;
    const raw = localStorage.getItem(key);
    if (raw == null) return undefined;
    try {
      return JSON.parse(raw);
    } catch {
      return raw as any;
    }
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    if (!isBrowser) return;
    localStorage.setItem(key, JSON.stringify(value));
  }

  async removeItem(key: string): Promise<void> {
    if (!isBrowser) return;
    localStorage.removeItem(key);
  }
}
//#endregion

//#region session storage
class SessionStorageStore extends LocalStorageStore {
  override async getItem<T>(key: string): Promise<T | undefined> {
    if (!isBrowser) return undefined;
    const raw = sessionStorage.getItem(key);
    if (raw == null) return undefined;
    try {
      return JSON.parse(raw);
    } catch {
      return raw as any;
    }
  }

  override async setItem<T>(key: string, value: T): Promise<void> {
    if (!isBrowser) return;
    sessionStorage.setItem(key, JSON.stringify(value));
  }

  override async removeItem(key: string): Promise<void> {
    if (!isBrowser) return;
    sessionStorage.removeItem(key);
  }
}
//#endregion

//#region indexed db store
class IndexedDbStore implements AsyncKVStore {
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
//#endregion

//#region file stor
class FileStor implements AsyncKVStore {
  constructor(
    private filePath: string,
    private useJSON = false,
  ) {}

  private isNodeRuntime(): boolean {
    return UtilsOs.isNode;
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
//#endregion

// --- global registry
const ALL_READY: Promise<void>[] = [];

//#endregion

//#region signal wrapper
export interface StorSignal<T> {
  (): T;
  set(v: T): Promise<void>;
  ready(): Promise<void>;
  signal: WritableSignal<T>;
}

function createStorSignal<T>(
  key: string,
  store: AsyncKVStore,
  options: StorOptions<T>,
): StorSignal<T> {
  const hasDefault = options.defaultValue !== undefined;

  const s = signal<T>(options.defaultValue as T);

  const readyPromise = (async () => {
    // SSR: just use default
    if (!isBrowser && !isNode) {
      return;
    }

    const stored = await store.getItem<any>(key);

    if (stored !== undefined) {
      const v = options.transformFrom ? options.transformFrom(stored) : stored;

      s.set(v);
    } else if (hasDefault) {
      const toDb = options.transformTo
        ? options.transformTo(options.defaultValue as T)
        : options.defaultValue;

      await store.setItem(key, toDb as any);
      s.set(options.defaultValue as T);
    }
  })();

  ALL_READY.push(readyPromise);

  const fn = (() => s()) as StorSignal<T>;

  fn.signal = s;

  fn.set = async (v: T) => {
    s.set(v);

    const toDb = options.transformTo ? options.transformTo(v) : (v as any);

    await store.setItem(key, toDb);
  };

  fn.ready = () => readyPromise;

  return fn;
}
//#endregion

const create = <T>(
  engine: AsyncKVStore,
  scopeClass: ClassLike | undefined,
  memberName: string,
  options: StorOptions<T>,
): StorSignal<T> => {
  const key = keyValue(scopeClass, memberName);
  return createStorSignal<T>(key, engine, options);
};

const local = new LocalStorageStore();
const session = new SessionStorageStore();
const indexedDBInstace = new IndexedDbStore();

//#region API
export namespace TaonStor {
  export function inLocalstorage<T>(
    options: StorOptions<T>,
    scopeClass?: ClassLike,
  ): StorSignal<T> {
    return create(
      local,
      scopeClass,
      options.keyOrPath ?? '__global__',
      options,
    );
  }

  export function inSessionStorage<T>(
    options: StorOptions<T>,
    scopeClass?: ClassLike,
  ): StorSignal<T> {
    return create(
      session,
      scopeClass,
      options.keyOrPath ?? '__global__',
      options,
    );
  }

  export function inIndexedDbStorage<T>(
    options: StorOptions<T>,
    scopeClass?: ClassLike,
  ): StorSignal<T> {
    return create(
      indexedDBInstace,
      scopeClass,
      options.keyOrPath ?? '__global__',
      options,
    );
  }

  export function inFile<T>(
    options: StorOptions<T>,
    scopeClass?: ClassLike,
  ): StorSignal<T> {
    //#region @backendFunc
    const fileStor = new FileStor(options.keyOrPath, false);
    return create(
      fileStor,
      scopeClass,
      options.keyOrPath ?? '__global__',
      options,
    );
    //#endregion
  }

  export function inJson<T>(
    options: StorOptions<T>,
    scopeClass?: ClassLike,
  ): StorSignal<T> {
    //#region @backendFunc
    const fileStor = new FileStor(options.keyOrPath, true);
    return create(
      fileStor,
      scopeClass,
      options.keyOrPath ?? '__global__',
      options,
    );
    //#endregion
  }

  export async function awaitAll(): Promise<void> {
    await Promise.all(ALL_READY);
  }
}
//#endregion

/**
 * exampel useage
 *
 * class SomeAngularComponentOrWhatever {
 *
 *  positionX = TaonStor.inLocalstorage({
 *     defaultValue: 0
 *  });
 *
 *  async ngOnInit() {
 *    console.log(this.positionX()) // I wonder if this can be angular signal
 *
 *    this.positionX.set(12)
 *
 *    await this.positionX.ready(); // but with addional this
 *  }
 *
 * }
 *

 *
 */
