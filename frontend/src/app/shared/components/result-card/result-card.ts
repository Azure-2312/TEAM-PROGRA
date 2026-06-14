import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-result-card',
  standalone: true,
  imports: [],
  templateUrl: './result-card.html',
  styleUrl: './result-card.css'
})
export class ResultCard {
  @Input() result: string = '';
  @Input() confidence: string = '';
  @Input() color: string = 'green';
  @Input() icon: string = '✓';
}