import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-chart-card',
  standalone: true,
  imports: [],
  templateUrl: './chart-card.html',
  styleUrl: './chart-card.scss',
})
export class ChartCard {
  @Input() title: string = '';
}