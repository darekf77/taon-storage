
import "reflect-metadata";

import * as localForge from 'localforage';

const stor = localForge.createInstance({
  driver: localForge.INDEXEDDB,
  storeName: 'app-firedev-admin-mode-configuration'
})

const formatMetadataKey = Symbol("format");

export function Cache(formatString?: string) {
  return Reflect.metadata(formatMetadataKey, formatString);
}


// export function getFormat(target: any, propertyKey: string) {
//   return Reflect.getMetadata(formatMetadataKey, target, propertyKey);
// }
