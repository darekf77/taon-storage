//#region imports
import * as localForge from 'localforage'; // @browser
import { Helpers, _ } from 'tnp-core/src';
//#endregion

//#region constants / store name
let win: any;
if (typeof window !== 'undefined') {
  win = window;
}
win = win || globalThis;

export const storeName = 'taon-storage_' + win?.location?.port;
//#endregion

let environment = globalThis['ENV'];

//#region constant / stor local storage
const websql = Helpers.isWebSQL ? 'websql' : '';
//#region @browser
export const storLocalStorage = localForge.createInstance({
  driver: localForge.LOCALSTORAGE,
  storeName: [
    storeName,
    'LOCALSTORAGE',
    _.kebabCase(environment?.currentProjectGenericName) + websql,
  ].join('_'), // + _.kebabCase(window.location.origin),
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
  ].join('_'),
}) as any; // TODO UNCOMMENT any
//#endregion
//#endregion
