import { Component, OnInit } from '@angular/core';
import { Http } from '@angular/http';
import { NotificationService, AuthService } from '../shared';
import { DefaultApi, User } from '../swagger/api';

@Component({
  selector: 'pydt-user-profile',
  templateUrl: './profile.component.html'
})
export class UserProfileComponent implements OnInit {
  token: string;
  emailModel = new EmailModel('');
  loaded: boolean;
  user: User;
  noDiscourseUser: boolean;
  private steamName: string;

  constructor(private api: DefaultApi, private auth: AuthService, private http: Http, private notificationService: NotificationService) {
  }

  ngOnInit() {
    this.token = this.auth.getToken();
    const profile = this.auth.getSteamProfile();

    this.api.userGetCurrent().subscribe(user => {
      this.user = user;
      this.emailModel.emailAddress = user.emailAddress;
      this.loaded = true;
    });

    this.steamName = profile.personaname;

    const discourseUrl = `https://discourse.playyourdamnturn.com/users/${profile.personaname.toLowerCase()}.json`;

    this.http.get(discourseUrl).toPromise().catch(() => {
      this.noDiscourseUser = true;
    });
  }

  onSubmit() {
    this.loaded = false;
    this.api.userSetNotificationEmail({ emailAddress: this.emailModel.emailAddress }).subscribe(() => {
      this.loaded = true;
      this.notificationService.showAlert({
        type: 'success',
        msg: 'Email address updated!'
      });
    });
  }
}

class EmailModel {
  constructor(public emailAddress: string) {}
}
