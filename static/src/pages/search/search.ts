import { Component, OnInit } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';

import { ItemDetailPage } from '../item-detail/item-detail';

import { Item } from '../../models/item';

import { Items } from '../../providers/providers';


@Component({
  selector: 'page-search',
  templateUrl: 'search.html'
})
export class SearchPage implements OnInit {
  allItems: any[] = [];
  currentItems: any[] = [];

  constructor(public navCtrl: NavController, public navParams: NavParams, public items: Items) {
    
  }
  
  ngOnInit() {
    this.items.query().subscribe((items) => {
      this.allItems = items
    });
  }
  
  // TODO: Move this to a common class / pipe
  sortBy(fieldName: string) {
    return function(a, b) {
      let aVal = a[fieldName].toLowerCase();
      let bVal = b[fieldName].toLowerCase();
      if (aVal < bVal) return -1;
      if (aVal > bVal) return 1;
      return 0;
    }
  }
  
  // TODO: Make this a pipe
  transposeArticle(segments: string[]) {
    let lastSegment = segments[segments.length - 1];
    lastSegment += ','
    
    let firstSegment = segments.shift();
    segments.push(firstSegment);
    
    return segments.join(' ');
  }
  
  // TODO: Make this a pipe
  adjustForArticles(str: string) {
    if (!str) {
      return str;
    }
    
    let segments = str.split(' ');
    let firstSegment = segments[0].toLowerCase();
    if (firstSegment === 'a' || firstSegment === 'the') {
      return this.transposeArticle(segments);
    }
    
    return str;
  }

  /**
   * Perform a service for the proper items.
   */
  getItems(ev) {
    let val = ev.target.value;
    if (!val || !val.trim()) {
      this.currentItems = [];
      return;
    }
    
    // TODO: Support musical properties for search? (i.e. chords, capo, tuning)
    this.currentItems = this.allItems.filter((item) => {
      //let adjustedArtist = this.adjustForArticles(item.artist);
      //let adjustedTitle = this.adjustForArticles(item.title);
      //let adjustedAlbum = this.adjustForArticles(item.album);
      
      return item.title.toLowerCase().indexOf(val) !== -1 || 
             item.artist.toLowerCase().indexOf(val) !== -1 ||
             item.album.toLowerCase().indexOf(val) !== -1;
            
    });
    
    // TODO: Should we sort before returning? Is It already sorted? Does it even matter?
    //.sort(this.sortBy('title')).sort(this.sortBy('artist'));
    
    // NOTE: This is an "OR"
    /*this.currentItems = this.items.query({
      title: val,
      artist: val,
      album: val
    });*/
  }

  /**
   * Navigate to the detail page for this item.
   */
  openItem(item: Item) {
    this.navCtrl.push(ItemDetailPage, {
      item: item
    });
  }

}
