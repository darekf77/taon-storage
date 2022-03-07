//#region @notForNpm
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
async function start(port: number)  {

}

export default start;

//#endregion

//#endregion