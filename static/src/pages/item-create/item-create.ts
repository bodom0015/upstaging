import { Component, ViewChild } from '@angular/core';
import { Validators, FormBuilder, FormGroup, FormArray } from '@angular/forms';
import { NavController, NavParams, ViewController } from 'ionic-angular';

import { Camera } from '@ionic-native/camera';


@Component({
  selector: 'page-item-create',
  templateUrl: 'item-create.html'
})
export class ItemCreatePage {
  @ViewChild('fileInput') fileInput;

  isReadyToSave: boolean;

  item: any;
  isFavorite: boolean = false;

  form: FormGroup;

  constructor(public navCtrl: NavController, public viewCtrl: ViewController, public formBuilder: FormBuilder, public camera: Camera, params: NavParams) {
    this.item = params.get('item') || {};
    
    let chordFormArray = [];
    for (let chord of this.item['chords'] || []) {
      let setName = chord['setName'];
      let chordSet = chord['chordSet']
      const addrCtrl = this.initChords(setName, chordSet);
      chordFormArray.push(addrCtrl);
    }
    
    let formGroup = {
      // If we were given an item, pass on its id
      albumArt: [this.item.albumArt || ''],
      title: [this.item.title || '', Validators.required],
      artist: [this.item.artist || ''],
      album: [this.item.album || ''],
      favorite: [this.item.favorite || false],
      capo: [this.item.capo || '0' ],
      tuning: [this.item.tuning || 'Standard'],
      lyrics: [this.item.lyrics || ''],
      chords: this.formBuilder.array(chordFormArray)
    };
    
    if (this.item['_id']) {
      formGroup['_id'] = this.item['_id'];
    }
    
    this.form = this.formBuilder.group(formGroup);

    // Watch the form for changes, and
    this.form.valueChanges.subscribe((v) => {
      this.isReadyToSave = this.isValid();
    });
  }

  ionViewDidLoad() {

  }
  
  /**
   * Ensure that main from and all sub-forms are valid
   */
  isValid() {
    /*
    if (!this.form.valid) {
      return false;
    } else {
      const control = <FormArray>this.form.controls['chords'];
      for (let i = 0; i < control.controls.length; i++) {
        let group = control.controls[i];
        if (!group.valid) {
          return false;
        }
      }
    }
    
    return true;*/
    return this.form.valid;
  }
  
  initChords(name?: string, value?: string) {
    // initialize our address
    let group = this.formBuilder.group({
        setName: [name || '', Validators.required],
        chordSet: [value || '', Validators.required]
    });
    
    group.valueChanges.subscribe((v) => {
      this.isReadyToSave = this.isValid();
    });
      
    return group;
  }
  
  addChordLine(event) {
    event.stopPropagation();
    
    const control = <FormArray>this.form.controls['chords'];
    const addrCtrl = this.initChords();
    control.push(addrCtrl);
    
    this.isReadyToSave = this.isValid();
  }
  
  removeChordLine(index, event) {
    event.stopPropagation();
    
    const control = <FormArray>this.form.controls['chords'];
    control.removeAt(index);
    
    this.isReadyToSave = this.isValid();
  }

  /**
   * The user cancelled, so we dismiss without sending data back.
   */
  cancel() {
    this.viewCtrl.dismiss();
  }

  /**
   * The user is done and wants to create the item, so return it
   * back to the presenter.
   */
  done() {
    if (!this.form.valid) { return; }
    this.viewCtrl.dismiss(this.form.value);
  }
}

/*

  getPicture() {
    if (Camera['installed']()) {
      this.camera.getPicture({
        destinationType: this.camera.DestinationType.DATA_URL,
        targetWidth: 96,
        targetHeight: 96
      }).then((data) => {
        this.form.patchValue({ 'albumArt': 'data:image/jpg;base64,' + data });
      }, (err) => {
        alert('Unable to take photo');
      })
    } else {
      this.fileInput.nativeElement.click();
    }
  }

  processWebImage(event) {
    let reader = new FileReader();
    reader.onload = (readerEvent) => {

      let imageData = (readerEvent.target as any).result;
      this.form.patchValue({ 'albumArt': imageData });
    };

    reader.readAsDataURL(event.target.files[0]);
  }

  getProfileImageStyle() {
    return 'url(' + this.form.controls['albumArt'].value + ')'
  }

*/