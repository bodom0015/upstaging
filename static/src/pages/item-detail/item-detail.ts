import { Component } from '@angular/core';
import { ModalController, NavController, NavParams } from 'ionic-angular';
import { ItemCreatePage } from '../item-create/item-create';
import { Observable } from 'rxjs/Observable';

import { Items } from '../../providers/providers';

import { Item } from '../../models/item';

@Component({
  selector: 'page-item-detail',
  templateUrl: 'item-detail.html'
})
export class ItemDetailPage {
  item: Item;
  currentItems: any[];

  constructor(public navCtrl: NavController, public modalCtrl: ModalController, public items: Items, navParams: NavParams) {
    this.item = navParams.get('item') || items.defaultItem;
    this.currentItems = navParams.get('currentItems') || items.query();
  }

  deleteItem() {
    // TODO: Confirm deletion
    this.items.delete(this.item).subscribe(res => {
      let index = this.currentItems.indexOf(this.item);
      this.currentItems.splice(index, 1);
      this.closeItem();
    });
  }
  
  // TODO: Move this to service?
  toggleFavorite() {
    let previous: boolean = this.item['favorite'];
    this.item['favorite'] = !this.item['favorite'];
    this.items.update(this.item)
      .catch((error:any) => {
        // Roll back our change
        this.item['favorite'] = previous;
        return Observable.throw(error.json().error || 'Server error');
      }) 
      .subscribe(res => console.log('favorite successfully toggled: now ' + this.item['favorite']));
  }

  editItem() {
    let previousValue: any = { ...this.item };
    let editModal = this.modalCtrl.create(ItemCreatePage, { item: this.item });
    editModal.onDidDismiss(item => {
      if (item) {
        this.items.update(item)
          .catch((error:any) => {
            // Roll back our change
            item = previousValue;
            return Observable.throw(error.json().error || 'Server error');
          }).subscribe(res => {
            let index = this.currentItems.indexOf(this.item);
            this.currentItems[index] = this.item = item;
            this.items.syncItems(this.currentItems);
          });
        }
    })
    editModal.present();
  }
  
  closeItem() {
    this.navCtrl.pop();
  }
}
