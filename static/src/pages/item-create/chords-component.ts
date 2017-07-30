import { Component, Input } from '@angular/core';
import { NavController } from 'ionic-angular';
import { Validators, FormBuilder, FormGroup } from '@angular/forms';

@Component({
    //moduleId: module.id,
    selector: 'app-chords',
    template : `
      <form [formGroup]="chordsForm">
      <input type="text" placeholder="Name" formControlName="setName"/>
      <input type="text" placeholder="Chords" formControlName="chordSet"/>
      </form>
    `,
})
export class ChordsComponent {
    @Input('group')
    public chordsForm: FormGroup;
}