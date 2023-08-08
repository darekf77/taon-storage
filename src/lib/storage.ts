//#region imports
import { Level, Log } from 'ng2-logger';
import { Helpers, _ } from 'tnp-core';
import { storIndexdDb, storLocalStorage, storeName } from './constants';
import { keyDefaultValueAreadySet, keyValue } from './helpers';
import { Models } from './models';
import { FileStor } from './file-stor';
//#endregion

//#region constants
const log = Log.create(storeName,
  Level.INFO
);
//#endregion

//#region public api / uncahce
export function uncache<CLASS_FUNCTION = any>(onlyInThisComponentClass: CLASS_FUNCTION, propertyValueToDeleteFromCache: keyof CLASS_FUNCTION) {
  if (!onlyInThisComponentClass) { // @ts-ignore
    onlyInThisComponentClass = { name: '__GLOBAL_NAMESPACE__' };
  }
  return Promise.all([
    //#region @browser
    storLocalStorage.removeItem(keyValue(onlyInThisComponentClass, propertyValueToDeleteFromCache)),
    storLocalStorage.removeItem(keyDefaultValueAreadySet(onlyInThisComponentClass, propertyValueToDeleteFromCache)),
    storIndexdDb.removeItem(keyValue(onlyInThisComponentClass, propertyValueToDeleteFromCache)),
    storIndexdDb.removeItem(keyDefaultValueAreadySet(onlyInThisComponentClass, propertyValueToDeleteFromCache)),
    //#endregion
  ])
}
//#endregion

class FiredevStorage {

  //#region static
  private static pendingOperatins: Models.PendingOperation[] = [];
  public static async awaitPendingOperatios(): Promise<void> {
    console.log(`WAITING PENDING OPERATIONS: ${this.pendingOperatins.length}`)
    const operations = this.pendingOperatins;
    this.pendingOperatins.length = 0;
    await Promise.all(operations);
    console.log(`WAITING PENDING DONE: ${this.pendingOperatins.length}`);
  }

  static get property() {
    return new FiredevStorage();
  }
  //#endregion

  //#region private fields
  private onlyInThisComponentClass?: Function;
  private defaultValue: any;
  private engine: Models.StorgeEngine;


  //#region private fields / file path
  //#region @backend
  private filePath: string;
  //#endregion
  //#endregion
  //#endregion

  //#region public getters
  public get in() {
    const that = this;
    return {
      get indexedb() {
        that.engine = 'indexeddb';
        return that as Omit<FiredevStorage, 'in'>;
      },
      get localstorage() {
        that.engine = 'localstorage';
        return that as Omit<FiredevStorage, 'in'>;
      },
      //#region @backend
      /**
       * may be relative or absolute
       */
      file(filePath: string) {
        that.engine = 'file';
        that.filePath = filePath;
        return that as Omit<FiredevStorage, 'in' | 'for'>;
      },
      jsonFile(filePath: string) {
        that.engine = 'json'
        that.filePath = filePath;
        return that as Omit<FiredevStorage, 'in' | 'for'>;
      },
      //#endregion
    }
  }
  //#endregion

  //#region public methods

  //#region public methods  / for
  //#region @browser
  public for(onlyInThisComponentClass?: Function): Omit<FiredevStorage, 'for' | 'in'> {
    this.onlyInThisComponentClass = onlyInThisComponentClass;
    return this as Omit<FiredevStorage, 'for' | 'in'>;
  }
  //#endregion
  //#endregion

  //#region public methods  / with default value
  public withDefaultValue(defaultValue?: any): any {
    // log.i(`["${}"]`)
    return this.action(defaultValue, this.getEngine(), this.engine)
  }
  //#endregion

  //#region public methods / with options
  withOptions(options: {
    /**
     * default value
     */
    defaultValue?: any;
    transformFrom?: (valueFromDb: any) => any,
    transformTo?: (valueThatGetToDB: any) => any,
  }) {
    const { defaultValue, transformFrom, transformTo } = (options || {}) as any;
    return this.action(
      defaultValue ? defaultValue : this.defaultValue,
      this.getEngine(),
      this.engine,
      transformFrom,
      transformTo,
    );
  }
  //#endregion

  //#endregion

  private getEngine() {
    switch (this.engine) {
      //#region @browser
      case 'localstorage':
        return storLocalStorage;
      case 'indexeddb':
        return storIndexdDb;
      //#endregion
      //#region @backend
      case 'file':
        return new FileStor(this.filePath);
      case 'json':
        return new FileStor(this.filePath, true);
      //#endregion
    }
  }

  private action = (
    defaultValue: any,
    storageEngine: Models.StorType,
    engine: Models.StorgeEngine,
    transformFrom?,
    transformTo?,
  ) => {
    if (!this.onlyInThisComponentClass) { // @ts-ignore
      this.onlyInThisComponentClass = { name: '__GLOBAL_NAMESPACE__' };
    }

    return (target: any, memberName: string) => {
      let currentValue: any = target[memberName];

      const setItemDefaultValue = async () => {
        const promise = new Promise<void>((resolve, reject) => {
          storageEngine.getItem(keyValue(this.onlyInThisComponentClass, memberName), (err, valFromDb) => {
            // target[memberName] = valFromDb;
            currentValue = transformFrom ? transformFrom(valFromDb) : valFromDb;
            log.info(`["${memberName}"] set default value for `, valFromDb);
            resolve()
          })
        });
        FiredevStorage.pendingOperatins.push({
          promise,
          engine,
          id: 'setting default value'
        });
        await promise;
      }

      if (defaultValue !== void 0) {
        const promise = new Promise<void>((resolve, reject) => {
          storageEngine.getItem(keyDefaultValueAreadySet(this.onlyInThisComponentClass, memberName), async (err, val) => {
            log.info(`["${memberName}"] was set default value for  ? `, val)
            if (val) {
              resolve()
              await setItemDefaultValue();
            } else {
              await new Promise<void>((res, rej) => {
                storageEngine.setItem(keyDefaultValueAreadySet(this.onlyInThisComponentClass, memberName), true, (err, v) => {
                  res();
                })
              });

              await new Promise<void>((res, rej) => {
                storageEngine.setItem(keyValue(this.onlyInThisComponentClass, memberName),
                  transformTo ? transformTo(defaultValue) : defaultValue, (err, val) => {
                    res();
                  })
              });

              currentValue = defaultValue;
              log.i(`["${memberName}"]  defaultValue "${memberName}"`, currentValue)
              resolve()
            }
          });
        });

        FiredevStorage.pendingOperatins.push({
          promise,
          engine,
          id: 'setting default not nil value'
        });
        promise.then(() => {
          console.log('DONE SETTIING NON TRIVAL')
        })
      } else {
        setItemDefaultValue();
      }

      Object.defineProperty(target, memberName, {
        set: (newValue: any) => {
          const promise = new Promise<void>((resolve, reject) => {
            storageEngine.setItem(
              keyValue(this.onlyInThisComponentClass, memberName),
              transformTo ? transformTo(newValue) : newValue,
              (err, savedValue) => {
                log.i(`setting done "${memberName} `, savedValue)
                resolve();
              }
            );
          });
          FiredevStorage.pendingOperatins.push({
            promise,
            engine,
            id: `setting item  "${memberName}" with new value:${newValue}`
          });
          currentValue = newValue;
          promise.then(() => {
            console.log('DONE SETTIING')
          })
        },
        get: () => currentValue,
      });
    };
  };

}


export const Stor = FiredevStorage;
