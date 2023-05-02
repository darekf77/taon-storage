//#region @browser
import * as localForge from 'localforage';
//#endregion

import { Level, Log } from 'ng2-logger';
import { Helpers } from 'tnp-core';

const storeName = 'firedev-ui- cache';

const log = Log.create(storeName,
  Level.__NOTHING
);

//#region @browser
const storLocalStorage = localForge.createInstance({
  driver: localForge.LOCALSTORAGE,
  storeName: storeName + localForge.LOCALSTORAGE,
})

const storIndexdDb = localForge.createInstance({
  driver: localForge.INDEXEDDB,
  storeName: storeName + localForge.INDEXEDDB,
})

export type StorType = Partial<(typeof storIndexdDb)>;
//#endregion

//#region @backend
export class FileStor
  //#region @browser
  implements StorType
//#endregion
{
  constructor(
    private filePath: string,
    private useJSON = false
  ) { }

  setItem<T>(key: string, value: T, callback?: (err: any, value: T) => void): Promise<T> {
    if (this.useJSON) {
      Helpers.writeJson(this.filePath, value as any);
      callback(void 0, value);
    } else {
      Helpers.writeFile(this.filePath, value as any);
      callback(void 0, value);
    }
    return void 0;
  }
  getItem<T>(key: string, callback?: (err: any, value: T) => void): Promise<T> {
    if (this.useJSON) {
      callback(void 0, Helpers.readJson(this.filePath));
    } else {
      callback(void 0, Helpers.readFile(this.filePath) as any);
    }
    return void 0;
  }
  removeItem(key: string, callback?: (err: any) => void): Promise<void> {
    Helpers.remove(this.filePath, true);
    callback(void 0);
    return void 0;
  }
}
//#endregion


const keyValue = (classFun, memberName) => {
  // console.log('classname',classFun.name)
  const res = `firedev.localstorage.class.${classFun.name}.prop.${memberName}`
  return res;
}

const keyDefaultValueAreadySet = (classFun, memberName) => {
  const res = keyValue(classFun, memberName) + 'defaultvalueisset';
  return res;
}

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


class FiredevStorage {

  private onlyInThisComponentClass?: Function;
  private defaultValue: any;
  //#region @backend
  private filePath: string;
  //#endregion
  private engine: 'localstorage'
    | 'indexeddb'
    //#region @backend
    | 'file'
    | 'json'
    //#endregion
    ;

  //#region @browser
  for(onlyInThisComponentClass?: Function) {
    this.onlyInThisComponentClass = onlyInThisComponentClass;
    return this as Omit<FiredevStorage, 'for' | 'in'>;
  }
  //#endregion

  withDefaultValue(defaultValue?: any) {
    return this.action(defaultValue, this.getEngine())
  }

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
      transformFrom,
      transformTo,
    );
  }

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

  get in() {
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


  private action = (defaultValue: any,
    storageEngine
      //#region @browser
      : StorType
    //#endregion
    ,
    transformFrom?,
    transformTo?,
  ) => {
    if (!this.onlyInThisComponentClass) { // @ts-ignore
      this.onlyInThisComponentClass = { name: '__GLOBAL_NAMESPACE__' };
    }

    return (target: any, memberName: string) => {
      let currentValue: any = target[memberName];

      const setItemDefaultValue = () => {
        storageEngine.getItem(keyValue(this.onlyInThisComponentClass, memberName), (err, valFromDb) => {
          // target[memberName] = valFromDb;
          currentValue = transformFrom ? transformFrom(valFromDb) : valFromDb;
          log.i(`setItemValue newvalue "${memberName}"`, valFromDb)
        })
      }

      if (defaultValue !== void 0) {
        storageEngine.getItem(keyDefaultValueAreadySet(this.onlyInThisComponentClass, memberName), (err, val) => {
          if (val) {
            setItemDefaultValue();
          } else {
            storageEngine.setItem(keyDefaultValueAreadySet(this.onlyInThisComponentClass, memberName), true)

            storageEngine.setItem(keyValue(this.onlyInThisComponentClass, memberName),
              transformTo ? transformTo(defaultValue) : defaultValue)

            currentValue = defaultValue;
            log.i(`newvalue defaultValue "${memberName}"`, currentValue)
          }
        });

      } else {
        setItemDefaultValue();
      }

      Object.defineProperty(target, memberName, {
        set: (newValue: any) => {
          log.i(`setting item  "${memberName}" with new value `, newValue)
          storageEngine.setItem(
            keyValue(this.onlyInThisComponentClass, memberName),
            transformTo ? transformTo(newValue) : newValue,
            (err, savedValue) => {
              log.i(`setting done "${memberName} `, savedValue)
            }
          )
          currentValue = newValue;
        },
        get: () => currentValue,
      });
    };
  };

}


export const Stor = (new FiredevStorage() as Omit<FiredevStorage, 'for'>);
