import type { storIndexdDb } from "./constants";

export namespace Models {

  export type StorType = Partial<(typeof storIndexdDb)>;

  export interface PendingOperation {
    promise: Promise<any>;
    engine: StorgeEngine;
    id: string;
  }

  export type StorgeEngine = 'localstorage'
    | 'indexeddb'
    //#region @backend
    | 'file'
    | 'json'
    //#endregion
    ;
}
