//#region imports
import { _ } from 'tnp-core/src';
import { keyDefaultValueAreadySet, keyValue } from './helpers';
import { Models } from './models';
import { FileStor } from './file-stor';
//#region @browser
import { storIndexdDb, storLocalStorage } from './constants';
//#endregion
//#endregion

//#region constants
const AWAITING_INTERVAL_TIME = 200;
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

class TaonStorage {

  //#region static
  private static pendingOperatins: Models.PendingOperation[] = [];
  private static id = 0;

  /**
   * TODO This is fine for now, but could be something smarter here
   */
  public static async awaitPendingOperatios(id = TaonStorage.id++): Promise<void> {
    // console.log('AWAITING')
    if (id > Number.MAX_SAFE_INTEGER - 2) {
      TaonStorage.id = 0;
      id = TaonStorage.id++;
    }
    const pending = this.pendingOperatins as Models.PendingOperation[];
    const toDeleteIndex = [];
    for (let index = 0; index < pending.length; index++) {
      const op = pending[index] as Models.PendingOperation;

      if (!op.isDone) {
        await new Promise<void>(async (resovle, reject) => {
          setTimeout(async () => {
            await this.awaitPendingOperatios(id);
            resovle();
          }, AWAITING_INTERVAL_TIME)
        })
        return;
      } else {
        toDeleteIndex.push(index);
      }
    }
    for (let index = 0; index < toDeleteIndex.length; index++) {
      const toDelete = toDeleteIndex[index];
      pending.splice(toDelete, 1);
    }
  }

  static get property() {
    return new TaonStorage();
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
        return that as Omit<TaonStorage, 'in'>;
      },
      get localstorage() {
        that.engine = 'localstorage';
        return that as Omit<TaonStorage, 'in'>;
      },
      //#region @backend
      /**
       * may be relative or absolute
       */
      file(filePath: string) {
        that.engine = 'file';
        that.filePath = filePath;
        return that as Omit<TaonStorage, 'in' | 'for'>;
      },
      jsonFile(filePath: string) {
        that.engine = 'json'
        that.filePath = filePath;
        return that as Omit<TaonStorage, 'in' | 'for'>;
      },
      //#endregion
    }
  }
  //#endregion

  //#region public methods

  //#region public methods  / for
  //#region @browser
  public for(onlyInThisComponentClass?: Function): Omit<TaonStorage, 'for' | 'in'> {
    this.onlyInThisComponentClass = onlyInThisComponentClass;
    return this as Omit<TaonStorage, 'for' | 'in'>;
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

  //#region private methods

  //#region private methods / get engine
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
  //#endregion

  //#region private methods / end observer action
  private endObserverAction(observe: Models.PendingOperation) {
    // observe.subscribers.forEach(c => typeof c?.awaitId === 'function' && c());
    observe.isDone = true;
  }
  //#endregion

  //#region private methods / action
  private action = (
    defaultValue: any,
    storageEngine
      //#region @browser
      : Models.StorType
    //#endregion
    ,
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
        //#region settin default value
        const observe = {
          engine,
          id: 'setting default value'
        } as Models.PendingOperation;
        TaonStorage.pendingOperatins.push(observe);

        await new Promise<void>((resolve, reject) => {
          storageEngine.getItem(keyValue(this.onlyInThisComponentClass, memberName), (err, valFromDb) => {
            // target[memberName] = valFromDb;
            currentValue = transformFrom ? transformFrom(valFromDb) : valFromDb;
            // log.info(`["${memberName}"] set default value for `, valFromDb);
            resolve();
            this.endObserverAction(observe);
          })
        });
        //#endregion
      }

      if (defaultValue !== void 0) {
        //#region setting default value from db
        const observe = {
          engine,
          id: 'setting not rivial default value'
        } as Models.PendingOperation;
        TaonStorage.pendingOperatins.push(observe);

        (new Promise<void>((resolve, reject) => {
          storageEngine.getItem(keyDefaultValueAreadySet(this.onlyInThisComponentClass, memberName), async (err, val) => {
            // log.info(`["${memberName}"] was set default value for  ? `, val)
            if (val) {
              await setItemDefaultValue();
              resolve()
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
              // log.i(`["${memberName}"]  defaultValue "${memberName}"`, currentValue)
              resolve()
            }
          });
        })).then(() => {
          this.endObserverAction(observe);
        });

        //#endregion
      } else {
        setItemDefaultValue();
      }

      Object.defineProperty(target, memberName, {
        set: (newValue: any) => {
          //#region setting new value on setter
          const observe = {
            engine,
            id: 'setting in SET not rivial default value'
          } as Models.PendingOperation;
          TaonStorage.pendingOperatins.push(observe);

          (new Promise<void>((resolve, reject) => {
            storageEngine.setItem(
              keyValue(this.onlyInThisComponentClass, memberName),
              transformTo ? transformTo(newValue) : newValue,
              (err, savedValue) => {
                resolve();
              }
            );
          })).then(() => {
            this.endObserverAction(observe);
          });
          //#endregion
          currentValue = newValue;
        },
        get: () => currentValue,
      });
    };
  };
  //#endregion

  //#endregion

}

export const Stor = TaonStorage;
