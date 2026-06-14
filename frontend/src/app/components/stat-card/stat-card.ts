import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [],
  templateUrl: './stat-card.html',
  styleUrl: './stat-card.scss',
})
export class StatCard {
  @Input() title: string = '';
  @Input() value: string = '';
  @Input() subtitle: string = '';
  @Input() color: 'green' | 'red' | 'orange' | '' = '';
}