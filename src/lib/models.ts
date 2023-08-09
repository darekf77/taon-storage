//#region @browser
import type { storIndexdDb } from "./constants";
//#endregion

export namespace Models {

  //#region @browser
  export type StorType = Partial<(typeof storIndexdDb)>;
  //#endregion

  export interface PendingOperation {
    engine: StorgeEngine;
    id: string;
    isDone: boolean;
    // subscribers: ({
    //   awaitId: number;
    //   // fun: () => any;
    // })[];
  }

  export type StorgeEngine = 'localstorage'
    | 'indexeddb'
    //#region @backend
    | 'file'
    | 'json'
    //#endregion
    ;
}
