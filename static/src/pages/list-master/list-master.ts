import { Component } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { NavController, ModalController } from 'ionic-angular';

import { ItemCreatePage } from '../item-create/item-create';
import { ItemDetailPage } from '../item-detail/item-detail';

import { Items } from '../../providers/providers';

import { Item } from '../../models/item';

@Component({
  selector: 'page-list-master',
  templateUrl: 'list-master.html'
})
export class ListMasterPage {
  currentItems: Item[] = [];

  constructor(public navCtrl: NavController, public items: Items, public modalCtrl: ModalController) {
    // Mock items:
    //this.currentItems = this.items.query();
    
    // Live items:
    this.items.query().subscribe(items => {
      this.currentItems = this.sort(items);
    });
  }
  
  /** Sort items artist, and sort each artist by title */
  sort(items: any[]) {
    return items.sort(this.sortBy('title')).sort(this.sortBy('artist'))
  }
  
  /**
   * Return a new function that will sort based on the given field name
   */
  sortBy(fieldName: string) {
    return function(a, b) {
      let aVal = a[fieldName].toLowerCase();
      let bVal = b[fieldName].toLowerCase();
      if (aVal < bVal) return -1;
      if (aVal > bVal) return 1;
      return 0;
    }
  }

  /**
   * The view loaded, let's query our items for the list
   */
  ionViewDidLoad() {
  }

  /**
   * Prompt the user to add a new item. This shows our ItemCreatePage in a
   * modal and then adds the new item to our data source if the user created one.
   */
  addItem() {
    let addModal = this.modalCtrl.create(ItemCreatePage);
    addModal.onDidDismiss(item => {
      if (item) {
        this.items.add(item)
				  .subscribe((response: any) => {
            let song: any = response['song'];
            //song['_id'] = { '$oid': result['created_id'] };
            this.currentItems.push(song);
            this.currentItems = this.sort(this.currentItems);
          });
      }
    });
    addModal.present();
  }
  
  // TODO: Move this to service?
  /**
   * Toggle favorite status for an item from the list of items.
   */
  toggleFavorite(item, event) {
    // Do not propagate this event (do not select the item when toggling favorites)
    event.stopPropagation();
    
    let previousValue: Item = { ...item };
    item['favorite'] = !item['favorite'];
    this.items.update(item)
      .catch((error:any) => {
        // Roll back our change
        item['favorite'] = previousValue['favorite'];
        return Observable.throw(error.json().error || 'Server error');
      }) 
      .subscribe(res => {
        console.log('favorite successfully toggled: now ' + item['favorite'])
          let index = this.currentItems.indexOf(previousValue);
          this.currentItems[index] = item;
          this.items.syncItems(this.currentItems);
      });
  }
   
  /**
   * Returns an array containing integers from 1 to the given item's rating
   */
  ratingArray(item: Item) {
    let ret = []
    for (let i = 1; i <= item['rating']; i++) {
      ret.push(i);
    }
    return ret;
 }

  /**
   * Delete an item from the list of items.
   */
  deleteItem(item) {
    this.items.delete(item._id).subscribe(res => this.currentItems.splice(item, 1));
  }

  /**
   * Navigate to the detail page for this item.
   */
  openItem(item: Item) {
    this.navCtrl.push(ItemDetailPage, {
      item: item,
      currentItems: this.currentItems
    });
  }
}
