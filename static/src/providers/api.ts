import { Injectable } from '@angular/core';
import { Http, Headers, RequestOptions, URLSearchParams } from '@angular/http';
import { Settings } from './settings';
import 'rxjs/add/operator/map';

/**
 * Api is a generic REST Api handler. Set your API url first.
 */
@Injectable()
export class Api {
  url: string = 'https://slambert.org:8080/api';
  useDb: boolean = true;
  settingsReady: boolean = false;
  options: any;

  constructor(public http: Http, public settings: Settings) {
    this.settings.load().then(() => {
      this.settingsReady = true;
      this.options = this.settings.allSettings;
      
      if (this.options.apiServer) {
        this.url = this.options.apiServer;
      }
    }); 
  }

  get(endpoint: string, params?: any, options?: RequestOptions) {
    // Support easy query params for GET requests
    if (params) {
      let p = new URLSearchParams();
      for (let k in params) {
        p.set(k, params[k]);
      }
      // Set the search field if we have params and don't already have
      // a search field set in options.
      options.search = !options.search && p || options.search;
    }

    // No Content-Type for GET
    return this.http.get(this.url + '/' + endpoint, options);
  }

  post(endpoint: string, body: any, options?: RequestOptions) {
    // Expect JSON body for POST
    return this.http.post(this.url + '/' + endpoint, body, options);
  }

  put(endpoint: string, body: any, options?: RequestOptions) {
    // Expect JSON body for PUT
    return this.http.put(this.url + '/' + endpoint, body, options);
  }

  delete(endpoint: string, options?: RequestOptions) {
    // No Content-Type for DELETE
    return this.http.delete(this.url + '/' + endpoint, options);
  }

  patch(endpoint: string, body: any, options?: RequestOptions) {
    return this.http.put(this.url + '/' + endpoint, body, options);
  }
}
