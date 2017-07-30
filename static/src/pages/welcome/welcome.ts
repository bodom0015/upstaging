import { Component } from '@angular/core';
import { URLSearchParams } from "@angular/http";
import { NavController, ToastController } from 'ionic-angular';

import { MainPage } from '../pages';
import { LoginPage } from '../login/login';
import { SignupPage } from '../signup/signup';

import { User } from '../../providers/user';

/**
 * The Welcome Page is a splash page that quickly describes the app,
 * and then directs the user to create an account or log in.
 * If you'd like to immediately put the user onto a login/signup page,
 * we recommend not using the Welcome page.
*/
@Component({
  selector: 'page-welcome',
  templateUrl: 'welcome.html'
})
export class WelcomePage {
  DEMO_ALERT_WARNING: string = "This account is for demonstration purposes only. Refreshing will cause you to lose any data you have entered.";

  constructor(public navCtrl: NavController, public user: User, public toastCtrl: ToastController) {
    let params = new URLSearchParams(window.location.search);
    let token = params.get('?token');
    
    if (token) {
      window.location.search = "";
      localStorage.setItem('token', token);
      this.navCtrl.push(MainPage);
    }
  }

  login() {
    this.navCtrl.push(LoginPage);
  }

  signup() {
    this.navCtrl.push(SignupPage);
  }

  // Allow users to log into the neutered demo account
  tryItOut() {
    this.user.login({
      email: 'test@example.com',
      password: 'test'
    }).subscribe((resp) => {
      alert(this.DEMO_ALERT_WARNING);
      this.navCtrl.push(MainPage);
    }, (err) => {
      // Unable to log in
      let toast = this.toastCtrl.create({
        message: 'Failed to login to demo account. Please try again later.',
        duration: 3000,
        position: 'top'
      });
      toast.present();
    });
  }
}
