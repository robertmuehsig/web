import { Component, OnChanges, Input, ViewChild } from '@angular/core';
import { ModalDirective } from 'ngx-bootstrap/modal';
import { ProfileCacheService, CivDef, CIV6_LEADERS, PcsProfileMap, PcsSteamProfile } from 'pydt-shared';
import { Game, GamePlayer, SteamProfile, User, DefaultApi } from '../swagger/api';
import { AuthService } from '../shared';
import * as _ from 'lodash';

@Component({
  selector: 'pydt-game-preview',
  templateUrl: './preview.component.html',
  styleUrls: ['./preview.component.scss']
})
export class GamePreviewComponent implements OnChanges {
  @Input() game: Game;
  @ViewChild('playerDetailModal') playerDetailModal: ModalDirective;
  gamePlayers: GamePlayer[];
  activeProfile: SteamProfile;
  user: User;
  private civDefs: CivDef[];
  private gamePlayerProfiles: PcsProfileMap = {};

  constructor(private api: DefaultApi, private auth: AuthService, private profileCache: ProfileCacheService) {
  }

  ngOnChanges() {
    this.activeProfile = this.auth.getSteamProfile();

    this.profileCache.getProfilesForGame(this.game).then(profiles => {
      this.gamePlayerProfiles = profiles;
    });

    this.gamePlayers = [];
    this.civDefs = [];

    for (let i = 0; i < this.game.slots; i++) {
      if (this.game.players.length > i) {
        this.gamePlayers.push(this.game.players[i]);
        this.civDefs.push(_.find(CIV6_LEADERS, leader => {
          return leader.leaderKey === this.game.players[i].civType;
        }));
      } else {
        this.gamePlayers.push(null);
        this.civDefs.push(null);
      }
    }
  }

  getTooltip(player: GamePlayer, civDef: CivDef) {
    if (player) {
      const profile = this.gamePlayerProfiles[player.steamId];
      let playerName = 'AI';

      if (profile && !player.hasSurrendered) {
        playerName = profile.personaname;
      }

      let civDesc = 'Unknown Civ';

      if (civDef) {
        civDesc = civDef.getFullDisplayName();
      }

      return `${playerName} /<br />${civDesc}`;
    } else {
      return 'AI';
    }
  }

  getProfileImg(player: GamePlayer) {
    if (player && player.steamId && !player.hasSurrendered) {
      return (this.gamePlayerProfiles[player.steamId] || {} as PcsSteamProfile).avatarmedium;
    }

    return '/img/android.png';
  }

  showUserDetail(userId) {
    if (userId) {
      this.user = null;
      this.playerDetailModal.show();

      this.api.userById(userId).subscribe(user => {
        this.user = user;
      });
    }
  }
}
