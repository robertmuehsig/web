import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CivDef, CIV6_LEADERS, RANDOM_CIV, filterCivsByDlc } from 'pydt-shared';
import { ConfigureGameModel } from './config.component';
import { ModalDirective } from 'ngx-bootstrap/modal';
import { NotificationService, AuthService } from '../shared';
import * as _ from 'lodash';
import { DefaultApi, CreateGameRequestBody } from '../swagger/api/index';

@Component({
  selector: 'pydt-create-game',
  templateUrl: './create.component.html'
})
export class CreateGameComponent implements OnInit {
  model = new CreateGameModel();

  @ViewChild('cannotCreateGameModal') cannotCreateGameModal: ModalDirective;
  @ViewChild('mustSetEmailModal') mustSetEmailModal: ModalDirective;

  constructor(
    private api: DefaultApi,
    private auth: AuthService,
    private router: Router,
    private notificationService: NotificationService
  ) {
  }

  filteredLeaders() {
    return filterCivsByDlc(CIV6_LEADERS, this.model.dlcIdArray());
  }

  async ngOnInit() {
    const profile = this.auth.getSteamProfile();
    this.model.displayName = profile.personaname + '\'s game!';

    const userGames = await this.api.userGames().toPromise();

    for (const game of userGames.data) {
      if (game.createdBySteamId === profile.steamid && !game.inProgress) {
        this.cannotCreateGameModal.show();
        return;
      }
    }

    const user = await this.api.userGetCurrent().toPromise();

    if (user) {
      if (!user.emailAddress) {
        this.mustSetEmailModal.show();
      }
    }
  }

  selectedCivChange(civ: CivDef) {
    this.model.player1Civ = civ;
  }

  onSubmit() {
    this.api.gameCreate(this.model.toJSON())
      .subscribe(game => {
        this.router.navigate(['/game', game.gameId]);
        this.notificationService.showAlert({
          type: 'success',
          msg: 'Game created!'
        });
      });
  }
}

class CreateGameModel extends ConfigureGameModel {
  public player1Civ = _.find(CIV6_LEADERS, leader => {
    return !leader.dlcId && leader !== RANDOM_CIV;
  });

  toJSON(): CreateGameRequestBody {
    const result = super.toJSON() as CreateGameRequestBody;
    result.player1Civ = this.player1Civ.leaderKey;
    return result;
  }
}
