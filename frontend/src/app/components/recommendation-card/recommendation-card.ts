import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-recommendation-card',
  standalone: true,
  imports: [],
  templateUrl: './recommendation-card.html',
  styleUrl: './recommendation-card.scss'
})
export class RecommendationCard {
  @Input() title: string = '';
  @Input() message1: string = '';
  @Input() message2: string = '';
  @Input() buttonText: string = '';

  @Output() buttonClick = new EventEmitter<void>();

  onButtonClick(): void {
    this.buttonClick.emit();
  }
}