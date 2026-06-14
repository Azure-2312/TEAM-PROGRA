import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResultCard } from './result-card';

describe('ResultCard', () => {
  let component: ResultCard;
  let fixture: ComponentFixture<ResultCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResultCard],
    }).compileComponents();

    fixture = TestBed.createComponent(ResultCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
