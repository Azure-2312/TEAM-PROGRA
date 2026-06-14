import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-analysis-item',
  standalone: true,
  imports: [],
  templateUrl: './analysis-item.html',
  styleUrl: './analysis-item.css',
})
export class AnalysisItem {
  @Input() image: string = '';
  @Input() title: string = '';
  @Input() result: string = '';
  @Input() date: string = '';
  @Input() color: string = '';
}