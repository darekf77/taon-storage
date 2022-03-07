/*
 * Public API Surface of ngx-store
 */

// Public classes.
export {
  CookieStorage, LocalStorage, SessionStorage, SharedStorage, SharedStorage as TempStorage,
} from './decorator/webstorage';
export { WebStorageService } from './service/webstorage.service';
export {
  CookiesStorageService, CookiesStorageService as CookieStorageService,
} from './service/cookies-storage.service';
export { SharedStorageService, SharedStorageService as TempStorageService } from './service/shared-storage.service';
export { LocalStorageService } from './service/local-storage.service';
export { SessionStorageService } from './service/session-storage.service';
export { WebStorageConfigInterface } from './config/config.interface';
export { Webstorable, WebstorableArray, WebstorableObject } from './ngx-store.types';
export { NgxStorageEvent } from './utility/storage/storage-event';
export { Resource as NgxResource } from './service/resource';
export { NgxStoreModule, NgxStoreModule as WebStorageModule } from './ngx-store.module';
export * from './ngx-store.types';
