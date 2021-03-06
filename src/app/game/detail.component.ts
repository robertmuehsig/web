import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalDirective } from 'ngx-bootstrap/modal';
import { CivDef, CIV6_DLCS, CIV6_LEADERS, RANDOM_CIV, filterCivsByDlc, BusyService } from 'pydt-shared';
import { NotificationService, AuthService } from '../shared';
import { Game, SteamProfile, DefaultApi } from '../swagger/api';
import * as _ from 'lodash';
import * as pako from 'pako';

@Component({
  selector: 'pydt-game-detail',
  templateUrl: './detail.component.html'
})
export class GameDetailComponent implements OnInit {
  game: Game;
  profile: SteamProfile;
  userInGame = false;
  civDefs: CivDef[] = [];
  availableCivs: CivDef[];
  tooManyHumans = false;
  playerCiv: CivDef;
  joinGamePassword: string;
  newCiv: CivDef;
  pageUrl: string;
  dlcEnabled: string;
  private discourse: HTMLScriptElement;

  @ViewChild('confirmRevertModal') confirmRevertModal: ModalDirective;
  @ViewChild('confirmSurrenderModal') confirmSurrenderModal: ModalDirective;
  @ViewChild('confirmKickUserModal') confirmKickUserModal: ModalDirective;
  @ViewChild('confirmLeaveModal') confirmLeaveModal: ModalDirective;
  @ViewChild('confirmDeleteModal') confirmDeleteModal: ModalDirective;
  @ViewChild('confirmDlcModal') confirmDlcModal: ModalDirective;
  @ViewChild('mustHaveEmailSetToJoinModal') mustHaveEmailSetToJoinModal: ModalDirective;
  @ViewChild('uploadFirstTurnModal') uploadFirstTurnModal: ModalDirective;
  @ViewChild('confirmStartGameModal') confirmStartGameModal: ModalDirective;

  constructor(
    private api: DefaultApi,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private notificationService: NotificationService,
    private busyService: BusyService
  ) {
    this.pageUrl = `${location.protocol}//${location.hostname}${(location.port ? ':' + location.port : '')}${location.pathname}`;
  }

  ngOnInit() {
    this.profile = this.auth.getSteamProfile();
    this.getGame();
  }

  discourseEmbed() {
    if (!this.discourse && this.game.discourseTopicId) {
      const discourseEmbed = {
        discourseUrl: 'https://discourse.playyourdamnturn.com/',
        topicId: this.game.discourseTopicId
      };

      (<any>window).DiscourseEmbed = discourseEmbed;

      this.discourse = document.createElement('script');
      this.discourse.type = 'text/javascript';
      this.discourse.async = true;
      this.discourse.src = discourseEmbed.discourseUrl + 'javascripts/embed.js';

      (document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0]).appendChild(this.discourse);
    }
  }

  startGame() {
    this.api.gameStart(this.game.gameId).subscribe(game => {
      this.setGame(game);
      this.notificationService.showAlert({
        type: 'success',
        msg: 'Game started!'
      });
    });
  }

  getGame() {
    this.route.params.forEach(params => {
      this.api.gameGet(params['id']).subscribe(game => {
        this.setGame(game);
      });
    });
  }

  startJoinGame() {
    if (this.game.dlc.length) {
      this.confirmDlcModal.show();
    } else {
      this.finishJoinGame();
    }
  }

  async finishJoinGame() {
    const user = await this.api.userGetCurrent().toPromise();

    if (!user.emailAddress) {
      this.mustHaveEmailSetToJoinModal.show();
    } else {
      const game = await this.api.gameJoin(this.game.gameId, {
        playerCiv: this.playerCiv.leaderKey,
        password: this.joinGamePassword
      }).toPromise();

      this.notificationService.showAlert({
        type: 'success',
        msg: 'Joined game!'
      });

      this.setGame(game);
    }
  }

  changeCiv() {
    this.api.gameChangeCiv(this.game.gameId, {
      playerCiv: this.newCiv.leaderKey
    }).subscribe(game => {
      this.newCiv = null;
      this.notificationService.showAlert({
        type: 'success',
        msg: 'Changed civilization!'
      });

      this.setGame(game);
    });
  }

  setGame(game: Game) {
    this.game = game;
    game.dlc = game.dlc || [];
    const steamIds = _.compact(_.map(game.players, 'steamId'));
    this.tooManyHumans = steamIds.length >= game.humans;
    this.userInGame = false;

    this.civDefs = [];
    this.availableCivs = [];
    this.playerCiv = null;

    if (this.profile) {
      this.userInGame = _.includes(steamIds, this.profile.steamid);

      const userPlayer = _.find(game.players, player => {
        return player.steamId === this.profile.steamid;
      });

      if (userPlayer) {
        this.playerCiv = this.findLeader(userPlayer.civType);
        this.newCiv = this.playerCiv;
      }
    }

    for (const player of this.game.players) {
      this.civDefs.push(this.findLeader(player.civType));
    }

    if (game.inProgress) {
      if (!this.playerCiv && game.allowJoinAfterStart) {
        this.availableCivs = _(game.players)
          .filter(player => {
            return !player.steamId;
          })
          .map(player => {
            return _.find(CIV6_LEADERS, leader => {
              return leader.leaderKey === player.civType;
            });
          })
          .value();
      }
    } else {
      this.availableCivs =  _.clone(filterCivsByDlc(CIV6_LEADERS, this.game.dlc));

      for (const player of this.game.players) {
        const curLeader = this.findLeader(player.civType);

        if (curLeader !== RANDOM_CIV) {
          _.pull(this.availableCivs, curLeader);
        }
      }
    }

    if (this.profile && !this.playerCiv && this.availableCivs.length) {
      this.playerCiv = this.availableCivs[0];
    }

    this.dlcEnabled = _.map(game.dlc, dlcId => {
      return _.find(CIV6_DLCS, dlc => {
        return dlc.id === dlcId;
      }).displayName;
    }).join(', ');

    if (!this.dlcEnabled) {
      this.dlcEnabled = 'None';
    }

    this.discourseEmbed();
  }

  private findLeader(civType: string) {
    return _.find(CIV6_LEADERS, leader => {
      return leader.leaderKey === civType;
    });
  }

  downloadTurn(gameId) {
    this.api.gameGetTurn(gameId)
      .subscribe(resp => {
        window.open(resp.downloadUrl);
      });
  }

  async fileSelected(event, gameId) {
    if (event.target.files.length > 0) {
      this.busyService.incrementBusy(true);

      try {
        const gameResp = await this.api.gameStartSubmit(gameId).toPromise();
        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', gameResp.putUrl, true);

          xhr.onload = () => {
            if (xhr.status === 200) {
              resolve();
            } else {
              reject(xhr.status);
            }
          };

          xhr.onerror = () => {
            reject(xhr.status);
          };

          xhr.setRequestHeader('Content-Type', 'application/octet-stream');
          const reader = new FileReader();
          reader.onload = function() {
            const array = new Uint8Array(this.result);
            const toSend = pako.gzip(array);
            xhr.send(toSend);
          };
          reader.readAsArrayBuffer(event.target.files[0]);
        });

        await this.api.gameFinishSubmit(gameId).toPromise();

        this.getGame();
        this.notificationService.showAlert({
          type: 'success',
          msg: 'Turn submitted successfully!'
        });
      } catch (err) {
        event.target.value = '';
        throw err;
      } finally {
        this.busyService.incrementBusy(false);
      }
    }
  }

  revert() {
    this.confirmRevertModal.hide();

    this.api.gameRevert(this.game.gameId).subscribe(game => {
      this.setGame(game);
      this.notificationService.showAlert({
        type: 'warning',
        msg: 'Turn Reverted!'
      });
    });
  }

  leave() {
    this.confirmLeaveModal.hide();

    this.api.gameLeave(this.game.gameId).subscribe(() => {
      this.notificationService.showAlert({
        type: 'warning',
        msg: 'Left Game :('
      });
      this.router.navigate(['/user/games']);
    });
  }

  surrender() {
    this.confirmSurrenderModal.hide();

    this.api.gameSurrender(this.game.gameId, {}).subscribe(() => {
      this.notificationService.showAlert({
        type: 'warning',
        msg: 'Surrendered :('
      });
      this.router.navigate(['/user/games']);
    });
  }

  kickPlayer() {
    this.confirmKickUserModal.hide();

    this.api.gameSurrender(this.game.gameId, { kickUserId: this.game.currentPlayerSteamId }).subscribe(game => {
      this.notificationService.showAlert({
        type: 'warning',
        msg: 'Successfully kicked user :('
      });
      this.setGame(game);
    });
  }

  delete() {
    this.confirmDeleteModal.hide();

    this.api.gameDelete(this.game.gameId).subscribe(() => {
      this.notificationService.showAlert({
        type: 'warning',
        msg: 'Game Deleted :('
      });
      this.router.navigate(['/user/games']);
    });
  }
}
