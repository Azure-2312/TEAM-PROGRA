import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecommendationCard } from './recommendation-card';

describe('RecommendationCard', () => {
  let component: RecommendationCard;
  let fixture: ComponentFixture<RecommendationCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecommendationCard],
    }).compileComponents();

    fixture = TestBed.createComponent(RecommendationCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
