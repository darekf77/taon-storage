# taon storage

Isomoric storage solution browser and nodejs.

Purpose of project:

### I don't want to save/read class properties values when decorators can do that for me!

## installation

```
npm i -g taon-storage
```

## import Stor
```ts

import { TaonStor } from 'taon-storage/src' // for taon usage

import { TaonStor } from 'taon-storage/browser' // browser version -> to use outside taon

```


## Storing things in local storage in browser:

```ts
import { TaonStor } from 'taon-storage'

export class TaonAdminComponent {
  public editMode = TaonStor.inLocalstorage(
    {
      defaultValue: false,
      key: 'editMode',
    },
    TaonAdminComponent,
  );

  async start() { 
    await TaonAdmin.awaitAll()

    console.log(this.editMode()) // use like signals
  }
}
```


## Storing things in indexddb in browser:

```ts
import { TaonStor } from 'taon-storage/src'

export class TaonAdmin {
  myHugeBlobPicture: Blob;

  public myHugeBlobPicture = TaonStor.inIndexedDbStorage(
    {
      defaultValue: null,
      key: 'myHugeBlobPicture',
      transformFrom: (valueFromDb: string) => new Blob([valueFromDb]),
      transformTo: (valueThatGetToDB: Blob) => valueThatGetToDB.text(),
    },
    TaonAdmin,
  );

}
```

## Storing things in file on backend NodeJS:

```ts
import { TaonStor } from 'taon-storage/src'

export class TaonAdmin {
   public fileSecretFile = TaonStor.inFile(
    {
      filePath: 'path/to/file',
      defaultValue: null,
      key: 'fileSecretFile',
    },
    TaonAdmin,
  );
}
```

