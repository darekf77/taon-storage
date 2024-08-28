// //#region imports
// import { Taon } from 'taon';
// import { _ } from 'tnp-core';
// const host = 'http://localhost:4199';
// //#region @browser
// import { NgModule, NgZone, ViewEncapsulation } from '@angular/core';
// import { Component, OnInit } from '@angular/core';
// import { PreloadAllModules, RouterModule, Routes } from "@angular/router";
// //#endregion
// //#endregion

// //#region @browser

// //#region routes
// const routes: Routes = [
//   // {
//   //   path: 'pazymodulerouterpath',
//   //   loadChildren: () => import('lazymodule')
//   //     .then(m => m.LazyModule),
//   // },
// ];
// //#endregion

// //#region main component
// @Component({
//   selector: 'app-taon-storage',
//   encapsulation: ViewEncapsulation.None,
//   styleUrls: ['./app.scss'],
//   templateUrl: './app.html',
// })
// export class TaonStorageComponent {
//   async ngOnInit() {

//   }
// }
// //#endregion

// //#region main module
// @NgModule({
//   imports: [
//     RouterModule.forRoot(routes, {
//       useHash: true,
//       preloadingStrategy: PreloadAllModules,
//       enableTracing: false,
//       bindToComponentInputs: true
//     }),
//   ],
//   exports: [TaonStorageComponent],
//   declarations: [TaonStorageComponent],
//   providers: [],
// })
// export class TaonStorageModule { }
// //#endregion
// //#endregion

// //#region taon start function
// async function start() {
//   // Taon.enableProductionMode();

//   const context = await Taon.init({
//     host,
//     controllers: [
//       // PUT FIREDEV CONTORLLERS HERE
//     ],
//     entities: [
//       // PUT FIREDEV ENTITIES HERE
//     ],
//     //#region @websql
//     config: {
//       type: 'better-sqlite3',
//       database: 'tmp-db.sqlite',
//       logging: false,
//     }
//     //#endregion
//   });
//   //#region @backend
//   if (Taon.isNode) {
//     // context.node.app.get('/hello', (req, res) => {
//     //   res.send('Hello taon-storage')
//     // })
//   }
//   //#endregion
// }
// //#endregion

// export default start;
