import { NgModule, ApplicationRef, ErrorHandler } from '@angular/core';
import { Http, XHRBackend, RequestOptions } from '@angular/http';
import { BrowserModule } from '@angular/platform-browser';
import {
  AlertModule, CollapseModule, DropdownModule, PaginationModule,
  TabsModule, TooltipModule, ModalModule
} from 'ng2-bootstrap/ng2-bootstrap';
import { Ng2TableModule } from 'ng2-table/ng2-table';
import { HttpModule } from '@angular/http';
import { FormsModule } from '@angular/forms';
import { Angulartics2Module, Angulartics2GoogleAnalytics } from 'angulartics2';
import { MetaModule } from 'ng2-meta';
import { ClipboardModule }  from 'angular2-clipboard';
import {
  ApiService, BusyModule, ProfileCacheService, Civ6GameSpeedPipe, Civ6MapPipe, Civ6MapSizePipe,
  API_URL_PROVIDER_TOKEN, API_CREDENTIALS_PROVIDER_TOKEN
} from 'pydt-shared';
import { WebApiUrlProvider, WebApiCredentialsProvider } from './shared/webApiServiceImplementations';

import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { ForumComponent } from './forum/forum.component';
import { SteamReturnComponent } from './steamreturn/steamreturn.component';
import { ConfigureGameComponent } from './game/config.component';
import { EditGameComponent } from './game/edit.component';
import { GameDetailComponent } from './game/detail.component';
import { GameDetailStatsComponent } from './game/detail/stats.component';
import { GamePreviewComponent } from './game/preview.component';
import { CreateGameComponent } from './game/create.component';
import { OpenGamesComponent } from './game/opengames.component';
import { UserProfileComponent } from './user/profile.component';
import { UserStatsComponent } from './user/stats.component';
import { UserGamesComponent } from './user/games.component';
import { UserInfoComponent } from './user/info.component';
import { DisplayCivComponent } from './game/displayCiv.component';
import { SelectCivComponent } from './game/selectCiv.component';
import { AuthGuard, ErrorHandlerService, NotificationService } from './shared';
import { routing } from './app.routing';
import { PydtHttp } from './pydtHttp.service';

import { removeNgStyles, createNewHosts } from '@angularclass/hmr';

@NgModule({
  imports: [
    AlertModule,
    BrowserModule,
    HttpModule,
    FormsModule,
    ClipboardModule,
    CollapseModule,
    DropdownModule,
    ModalModule,
    PaginationModule,
    TabsModule,
    TooltipModule,
    routing,
    BusyModule,
    Ng2TableModule,
    Angulartics2Module.forRoot([ Angulartics2GoogleAnalytics ]),
    MetaModule.forRoot({
      useTitleSuffix: true,
      defaults: {
        titleSuffix: ' | Play Your Damn Turn'
      }
    })
  ],
  declarations: [
    AppComponent,
    HomeComponent,
    ForumComponent,
    ConfigureGameComponent,
    EditGameComponent,
    GameDetailComponent,
    GameDetailStatsComponent,
    GamePreviewComponent,
    CreateGameComponent,
    OpenGamesComponent,
    DisplayCivComponent,
    SelectCivComponent,
    SteamReturnComponent,
    UserProfileComponent,
    UserInfoComponent,
    UserGamesComponent,
    UserStatsComponent,
    Civ6GameSpeedPipe,
    Civ6MapPipe,
    Civ6MapSizePipe
  ],
  providers: [
    ProfileCacheService,
    AuthGuard,
    { provide: API_URL_PROVIDER_TOKEN, useClass: WebApiUrlProvider },
    { provide: API_CREDENTIALS_PROVIDER_TOKEN, useClass: WebApiCredentialsProvider },
    { provide: ErrorHandler, useClass: ErrorHandlerService },
    NotificationService,
    ApiService,
    {
      provide: Http,
      useFactory: (backend: XHRBackend, options: RequestOptions, error: ErrorHandler) => {
        return new PydtHttp(backend, options, error);
      },
      deps: [XHRBackend, RequestOptions, ErrorHandler]
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
  constructor(public appRef: ApplicationRef) {}
  hmrOnInit(store) {
    console.log('HMR store', store);
  }
  hmrOnDestroy(store) {
    let cmpLocation = this.appRef.components.map(cmp => cmp.location.nativeElement);
    // recreate elements
    store.disposeOldHosts = createNewHosts(cmpLocation);
    // remove styles
    removeNgStyles();
  }
  hmrAfterDestroy(store) {
    // display new elements
    store.disposeOldHosts();
    delete store.disposeOldHosts;
  }
}
