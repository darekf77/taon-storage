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

import { Stor } from 'taon-storage' // on NodeJS side

import { Stor } from 'taon-storage/browser' // on browser side

// In taon's apps you don't need to specify /folder
// just do thing like on NodeJS backend
import { Stor } from 'taon-storage' // taon apps

```


## Storing things in local storage in browser:

```ts
import { Stor } from 'taon-storage'

export class TaonAdmin {
  @Stor.in.localstorage.for(TaonAdmin).withDefaultValue(false)
  editMode: boolean
}
```


## Storing things in indexddb in browser:

```ts
import { Stor } from 'taon-storage'

export class TaonAdmin {

  @Stor.in.indexedb.for(TaonAdmin). withOptions({
    transformFrom: (valueFromDb: string) => new Blob([valueFromDb]),
    transformTo: (valueThatGetToDB: Blob) => valueThatGetToDB.text(),
  })
  myHugeBlobPicture: Blob;

}
```

## Storing things in file on backend NodeJS:

```ts
import { Stor } from 'taon-storage'

export class TaonAdmin {
  @Stor.in.file('/etc/hosts').withDefaultValue('localhost: 127.0.0.1')
  hostsFile: string

  @Stor.in.file('/my/absolute/path/to/file')
    .withDefaultValue('begging of secret file!')
  fileSecretFile: string;
}
```

## Storing things in json file on backend NodeJS:

```ts
import { Stor } from 'taon-storage';
import { List } from 'immutable'; // needs to be used

export class TaonAdmin {

 class MyBackend {

  @Stor.in.jsonFile('~/list-of-pictures.json').withDefaultValue(List([]))
  myPics: List<string>;

}

```


# TODO
- json value in file
- navitve storing browser files 
- navitve storing browser blob
- progress notifications service

