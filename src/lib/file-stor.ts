import { Helpers } from "tnp-core/src";
import { Models } from "./models";


export class FileStor
  //#region @browser
  implements Models.StorType
//#endregion
{
  constructor(
    private filePath: string,
    private useJSON = false
  ) { }

  async setItem<T>(key: string, value: T, callback?: (err: any, value: T) => void): Promise<T> {
    //#region @backendFunc
    const promise = new Promise<void>((resolve, reject) => {
      if (this.useJSON) {
        Helpers.writeJson(this.filePath, value as any);
        callback(void 0, value);
        resolve();
      } else {
        Helpers.writeFile(this.filePath, value as any);
        callback(void 0, value);
        resolve();
      }
    });
    // pendingOperatins.push(promise);
    await promise;
    return void 0;
    //#endregion
  }
  async getItem<T>(key: string, callback?: (err: any, value: T) => void): Promise<T> {
    //#region @backendFunc
    const promise = new Promise<T>((resolve, reject) => {
      if (this.useJSON) {
        const result = Helpers.readJson(this.filePath);
        callback(void 0, result);
        resolve(result)
      } else {
        const result = Helpers.readFile(this.filePath);
        callback(void 0, result as any);
        resolve(result as any)
      }
    });
    // pendingOperatins.push(promise);
    return await promise;
    //#endregion
  }
  async removeItem(key: string, callback?: (err: any) => void): Promise<void> {
    //#region @backendFunc
    const promise = new Promise<void>((resolve, reject) => {
      Helpers.remove(this.filePath, true);
      callback(void 0);
      resolve();
    });
    // pendingOperatins.push(promise);
    await promise;
    return void 0;
    //#endregion
  }
}
//#endregion

