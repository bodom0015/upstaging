import { Injectable } from '@angular/core';
import { URLSearchParams } from "@angular/http";
import { RequestOptions, Headers, Http } from '@angular/http';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Api } from './api';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/toPromise';

/**
 * Most apps have the concept of a User. This is a simple provider
 * with stubs for login/signup/etc.
 *
 * This User provider makes calls to our API at the `login` and `signup` endpoints.
 *
 * By default, it expects `login` and `signup` to return a JSON object of the shape:
 *
 * ```json
 * {
 *   status: 'success',
 *   user: {
 *     // User fields your app needs, like "id", "name", "email", etc.
 *   }
 * }
 * ```
 *
 * If the `status` field is not `success`, then an error is detected and returned.
 */
@Injectable()
export class User {
  //public profile: any;
  public token: string;
  
  baseOptions: RequestOptions;
  
  tokenChanged: ReplaySubject<any> = new ReplaySubject<any>(null);

  constructor(public api: Api) {
    // Initialize user/token with anything we have saved previously
    //this.profile = localStorage.getItem('profile');
    this.token = localStorage.getItem('token');
    
    if (this.token) {
      this._loggedIn({ "token": this.token });
    }
  }
  
  getToken() {
    return this.tokenChanged.asObservable();
  }

  /**
   * Send a POST request to our login endpoint with the data
   * the user entered on the form.
   */
  login(accountInfo: any) {
    let seq = this.api.post('login', accountInfo).share();

    seq
      .map(res => res.json())
      .subscribe(res => {
        // If the API returned a successful response, mark the user as logged in
        if (res.status == 'success') {
          this._loggedIn(res);
        }
      }, err => {
        console.error('ERROR', err);
      });

    return seq;
  }

  /**
   * Send a POST request to our signup endpoint with the data
   * the user entered on the form.
   */
  signup(accountInfo: any) {
    let seq = this.api.post('register', accountInfo).share();

    seq
      .map(res => res.json())
      .subscribe(res => {
        // If the API returned a successful response, mark the user as logged in
        if (res.status == 'success') {
          this._loggedIn(res);
        }
      }, err => {
        console.error('ERROR', err);
      });

    return seq;
  }

  /**
   * Log the user out, which forgets the session
   */
  logout() {
    console.log("user.logout");
    localStorage.clear();
    
    //this.profile = null;
    this.token = null;
    
    this.tokenChanged.next(null);
  }

  /**
   * Process a login/signup response to store user data
   */
  _loggedIn(resp) {
    // Store profile / token data (settings?)
    let token = resp.token;
    //localStorage.setItem('profile', this.profile = resp.user);
    localStorage.setItem('token', this.token = token);
    
    console.log("Token changed... broadcasting new value: " + token);
    
    // Broadcast our new token change
    this.tokenChanged.next(this.token);
  }
}
