import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalysisItem } from './analysis-item';

describe('AnalysisItem', () => {
  let component: AnalysisItem;
  let fixture: ComponentFixture<AnalysisItem>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalysisItem],
    }).compileComponents();

    fixture = TestBed.createComponent(AnalysisItem);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
