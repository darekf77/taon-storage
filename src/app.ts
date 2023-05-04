//#region @notForNpm

import { List } from 'immutable';
import { Stor } from './lib';



//#region @browser
import { NgModule } from '@angular/core';
import { Component, OnInit } from '@angular/core';


@Component({
  selector: 'app-firedev-storage',
  template: 'hello from firedev-storage'
})
export class FiredevStorageComponent implements OnInit {
  constructor() { }

  ngOnInit() { }
}

@NgModule({
  imports: [],
  exports: [FiredevStorageComponent],
  declarations: [FiredevStorageComponent],
  providers: [],
})
export class FiredevStorageModule { }
//#endregion

//#region @backend

class MyBackend {

  @Stor.property.in.jsonFile('~/pinguin.json').withDefaultValue(List([]))
  myListOfValue: List<string>;

}

async function start(port: number) {
  new MyBackend();
}

export default start;

//#endregion

//#endregion
