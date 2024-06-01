//#region imports
import { Helpers, _ } from "tnp-core/src";
//#region @browser
import * as localForge from 'localforage';
//#endregion
//#endregion

//#region constants / store name
export const storeName = 'firedev-storage_'
  //#region @browser
  + window?.location.port;
//#endregion
//#endregion

//#region constants / environment
let environment = {} as any;
//#region @backend
// @ts-ignore
environment = global['ENV'];
//#endregion
//#region @browser
// @ts-ignore
environment = window['ENV'];
//#endregion
//#endregion

//#region constant / stor local storage
const websql = Helpers.isWebSQL ? 'websql' : '';
//#region @browser
export const storLocalStorage = localForge.createInstance({
  driver: localForge.LOCALSTORAGE,
  storeName: [
    storeName,
    'LOCALSTORAGE',
    _.kebabCase(environment?.currentProjectGenericName) + websql,
  ].join('_')
  , // + _.kebabCase(window.location.origin),
}) as any; // TODO UNCOMMENT any
//#endregion
//#endregion

//#region constant / stor idndexedb storage
//#region @browser
export const storIndexdDb = localForge.createInstance({
  driver: localForge.INDEXEDDB,
  storeName: [
    storeName,
    'INDEXEDDB',
    _.kebabCase(environment?.currentProjectGenericName) + websql,
  ].join('_')
}) as any; // TODO UNCOMMENT any
//#endregion
//#endregion
