import { Component } from '@angular/core';
import { EditorPageComponent } from './editor/editor-page/editor-page.component';

@Component({
  selector: 'app-root',
  imports: [EditorPageComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
