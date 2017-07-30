import { Injectable } from '@angular/core';
import { RequestOptions, Headers } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import 'rxjs/add/operator/map';
import 'rxjs/add/observable/throw';
import 'rxjs/add/operator/catch';

import { User } from './user';
import { Api } from './api';
import { Item } from '../models/item';

@Injectable()
export class Items {
  defaultItem: any = null;
  
  private subject: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([]);
  
  expectJsonBody: RequestOptions;
  expectNoBody: RequestOptions;

  constructor(public api: Api, public user: User) {  
    // For GET / DELETE, do not expect a BODY
    let noBodyHeaders = new Headers({ 
      'Accept': 'application/json',
      //'Content-Type': 'application/json'
    });
    
    // For PUT / POST / PATCH, expect a JSON body
    let jsonBodyHeaders = new Headers({ 
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    });
    
    this.expectNoBody = new RequestOptions(/*{ headers: noBodyHeaders }*/);
    this.expectJsonBody = new RequestOptions(/*{ headers: jsonBodyHeaders }*/);
    
    this.user.getToken().subscribe((token) => {
      console.log("Token changed, loading /songs: " + token);
      if (!token) {
        this.subject.next([]);
      } else {
        this.api.get('songs', null, this.getRequestOptions())
          .catch((error:any) => Observable.throw(error.json().error || 'Server error'))
          .map(response => response.json())
          .subscribe(response => {
            this.subject.next(response.songs);
            console.debug(this.subject);
          });
      }
    });
  }
  
  /*getUserProfile() {
    return this.user.profile;
  }*/
  
  getToken() {
    return this.user.token;
  }
  
  getId(item: any) {
    return item['_id'];
  }
  
  getRequestOptions() {
    let token = this.getToken();
    let headers = new Headers({
      'Authorization': 'Bearer ' + token
    });
    console.debug(headers);
    return new RequestOptions({ headers: headers });
  }

  query(params?: any) {
    return this.subject.asObservable();
  }
  
  isDemoUser(): boolean {
    return this.getToken() === 'faketoken';
  }
  
  get(id: string) {
    if (this.isDemoUser()) {
      return Observable.from({ "status": "success", "songs": this.getDemoSongs() });
    }
    
    // Explicitly pass null for params (to bypass "easy query params")
    return this.api.get('songs/' + id, null, this.getRequestOptions())
      .catch((error:any) => Observable.throw(error.json().error || 'Server error'))
      .map(response => response.json());
  }

  add(song: Item) {
    if (this.isDemoUser()) {
      song['_id'] = this.generateFakeId();
      return Observable.from({ "status": "success", "created_id": this.getId(song), "song": song });
    }
    
    return this.api.post('songs', song, this.getRequestOptions())
      .catch((error:any) => Observable.throw(error.json().error || 'Server error'))
      .map(response => response.json());
  }
  
  update(song: Item) {
    if (this.isDemoUser()) {
      return Observable.from({ "status": "success", "updated_id": this.getId(song), "song": song });
    }
    
    let id = this.getId(song);
    return this.api.put('songs/' + id, song, this.getRequestOptions())
      .catch((error:any) => Observable.throw(error.json().error || 'Server error'))
      .map(response => response.json());
  }

  delete(song: Item) {
    if (this.isDemoUser()) {
      return Observable.from({ "status": "success", "deleted_id": this.getId(song) });
    }
    
    let id = this.getId(song);
    return this.api.delete('songs/' + id, this.getRequestOptions())
      .catch((error:any) => Observable.throw(error.json().error || 'Server error'))
      .map(response => response.json());
  }

  syncItems(songs: Item[]) {
    this.subject.next(songs);
  }
  
  /** TODO: Everything from here down is in order to support the DemoUser (move to its own class?) */
  // Converts a unicode string to its hex representation
  hexEncode(str: String): String {
    let hex, i;

    let result = "";
    for (i = 0; i < str.length; i++) {
        hex = str.charCodeAt(i).toString(16);
        result += ("000"+hex).slice(-4);
    }

    return result
  }
  
  // Generates a fake segments (for use in a fake uuid)
  generateFakeSegment():String {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }
  
  // Generates a fake uuid (for demo user's songs)
  generateFakeId(): String {
    let s4 = this.generateFakeSegment;
    function generateFakeId() {
      let unicodeId = s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
      return this.hexEncode(unicodeId);
    }
  }
  
  // Returns a list of example songs for the DemoUser to view
  getDemoSongs(): any[] {
    return [
        {
          "_id": this.generateFakeId(),
          "album": "21", 
          "artist": "Adele", 
          "chords": [
            {
              "chordSet": "Am Em G Em G", 
              "setName": "Verse"
            }, 
            {
              "chordSet": "F G Em F", 
              "setName": "Pre-Chorus"
            }, 
            {
              "chordSet": "Am G F G", 
              "setName": "Chorus"
            }
          ],
          "capo": 3,
          "favorite": true, 
          "lyrics": "There's a fire starting in my heart\nReaching a fever pitch and it's bringing me out the dark\nFinally I can see you crystal clear\nGo ahead and sell me out and I'll lay your ship bare\n\nSee how I leave with every piece of you\nDon't underestimate the things that I will do\nThere's a fire starting in my heart\nReaching a fever pitch and it's bringing me out the dark\n\nThe scars of your love remind me of us\nThey keep me thinking that we almost had it all\nThe scars of your love they leave me breathless\nI can't help feeling\n\nWe could've had it all\nRolling in the deep\nYou had my heart inside your hands\nBut you played it with a beating\n\nBaby I have no story to be told\nBut I've heard one of you and I'm gonna make your head burn\nThink of me in the depths of your despair\nMaking a home down there 'cause mine sure won't be shared\n\nThe scars of your love remind me of us\nThey keep me thinking that we almost had it all\nThe scars of your love they leave me breathless\nI can't help feeling\n\nWe could've had it all\nRolling in the deep\nYou had my heart inside your hands\nBut you played it with a beating\n\nThrow your soul through every open door\nCount your blessings to find what you look for\nTurn my sorrow into treasured gold\nPay me back in kind and reap just what you sow\n\nWe could've had it all\nCould've had it all\nIt all\nIt all\nIt all\n\nWe could've had it all\nRolling in the deep\nYou had my heart inside your hands\nBut you played it with a beating", 
          "title": "Rolling in the Deep"
        },
        {
          "_id": this.generateFakeId(), 
          "album": "Lead Sails, Paper Anchor", 
          "artist": "Atreyu", 
          "chords": [
            {
              "chordSet": "Em D C B", 
              "setName": "Verse"
            }, 
            {
              "chordSet": "C D", 
              "setName": "Pre-Chorus"
            }, 
            {
              "chordSet": "Am Em B Em", 
              "setName": "Chorus"
            }, 
            {
              "chordSet": "G D C B", 
              "setName": "Bridge"
            }
          ], 
          "capo": 4,
          "favorite": true, 
          "lyrics": "Marching along, like a good soldier does\nI'm setting sail, with anchors holding me down\nPack up my bags, stow them away\nI'm bidding farewell to all that is safe\n\nWill I come up for air, come up for air\nAfter awhile the current is calling me\nLulling me, waving goodbye\nI'm out here alone, oh God can you save me now?\nSinking my heart turns to stone\n\nWithering away, a shrinking violet dies\nSo full of life, these lights they've dried me out\nInto the sea, I needed a drink\nI never thought this would consume me whole\n\nWill I come up for air, come up for air\nAfter awhile the current is calling me\nLulling me, waving goodbye\nI'm out here alone, oh God can you save me now?\nSinking my heart turns to stone\n(I turn to stone)\nSinking my heart turns to stone\nSave me, take me home\nOver and over again\nSave me, take me home\nWishing that this all would end\nSave me, take me home\nOver and over again\nSave me, take me home\nWishing that this all would end\n\nAfter awhile the current is calling me\nLulling me, waving goodbye\nI'm out here alone, oh God can you save me now?\nSinking my heart turns to stone\nAfter awhile the current is calling me\nLulling me, waving goodbye\nI'm out here alone, oh God can you save me now?\nSinking my heart turns to stone\nSinking my heart turns to stone\n\nSave me take me home\nWhen I come up for air\nSave me take me home\nWhen I come up for air\nSave me take me home\nOver and over again\nSave me take me home\n\nWishing that all this would end", 
          "title": "Lead Sails and a Paper Anchor"
        },
        {
          "_id": this.generateFakeId(), 
          "album": "The Marshall Mathers LP 2", 
          "artist": "Eminem (ft. Rihanna)", 
          "chords": [
            {
              "chordSet": "Am G F--", 
              "setName": "All"
            }
          ], 
          "favorite": true,
          "capo": 3,
          "lyrics": "I'm friends with the monster that's under my bed\nGet along with the voices inside of my head\nYou're trying to save me, stop holding your breath\nAnd you think I'm crazy, yeah you think I'm crazy\n\nI wanted the fame but not the cover of Newsweek, oh well\nGuess beggars can't be choosy\nWanted to receive attention for my music\nWanted to be left alone in public, excuse me\nFor wanting my cake and eat it too, for wanting it both ways\nFame made me a balloon, as my ego inflated\nWhen I blew, see, well it was confusing\n'Cause all I wanted to do is be the Bruce Lee of loose-leaf\nAbused ink, used it as a tool and I blew steam woo!\nHit the lottery, ooh-wee!\nBut with what I gave up to get it was bitter-sweet\nIt was like winning a used mink\nIronic 'cause I think I'm gettin' so huge I need a shrink\nI'm beginning to lose sleep, one sheep, two sheep\nGoin' coo-coo and cooky as Cool Keith,\nBut I'm actually weirder than you think\n\n'Cause I'm friends with the monster that's under my bed\nGet along with the voices inside of my head\nYou're trying to save me, stop holding your breath\nAnd you think I'm crazy, yeah you think I'm crazy\nWell that's nothing!\nWell that's nothing!\n\nWell I ain't much of a poet\nBut I know somebody once told me\nTo seize the moment and don't squander it\n'Cause you'll never know when it all could be over tomorrow\nSometimes I wonder where these thoughts spawn from\nYeah, ponderin' will do you wonders boy\nWhen you're losin' your mind the way it wanders\nYodel-yodelay eeee-hoo!\nI think it went wanderin' off and\nStumbled down to Jeff VanVondrin (sic?)\n'Cause I need an interventionist\nTo intervene between me and this monster\nTo save me from myself and all this conflict\n'Cause the very thing that I love is killin' me and I can't conquer it\nMy OCD's conkin' me in the head\nKeep knockin', nobody's home, I'm sleep-walking\nI'm just relaying what the voice in my head sayin'\nDon't shoot the messenger, I'm just\n\nFriends with the monster that's under my bed\nGet along with the voices inside of my head\nYou're trying to save me, stop holding your breath\nAnd you think I'm crazy, yeah you think I'm crazy\nWell that's nothing!\nWell that's nothing!\n\nCall me crazy, but I have this vision that\nOne day I'll walk amongst you a regular civilian\nBut until then, drums get killed and I'm coming straight at MC's blood get spilled and I'll\nTake you back to the days that I'd get on a Dre track\nAnd give every kid who got played that pumped-up feeling\nAnd shit to say back to the kid's who played him\nI ain't here to save the fuckin' children\nBut if one kid out a hundred million who are going through a stuggle feels that it relates that's great!\nIt's payback Russel Wilson (sic?) fallin' way back in the draft\nTurn nothing into something still can make that\nStraw into gold, chump, I will spin Rumplestiltskin (sic?) in a haystack\nMaybe I need a straight-jacket, face facts I am nuts, for real, but I'm ok with that\nThat's nothing I'm still\n\nFriends with the monster that's under my bed\nGet along with the voices inside of my head\nYou're trying to save me, stop holding your breath\nAnd you think I'm crazy, yeah you think I'm crazy\n\nI'm friends with the monster that's under my bed (get along with)\nGet along with the voices inside of my head (you're trying to\nYou're trying to save me, stop holding your breath (you think I'm)\nAnd you think I'm crazy, yeah you think I'm crazy\nWell that's nothing!\nWell that's nothing!", 
          "title": "Monster"
        }, 
    ];
  }
}
