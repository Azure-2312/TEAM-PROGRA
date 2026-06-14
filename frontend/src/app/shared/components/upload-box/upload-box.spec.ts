import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UploadBox } from './upload-box';

describe('UploadBox', () => {
  let component: UploadBox;
  let fixture: ComponentFixture<UploadBox>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UploadBox],
    }).compileComponents();

    fixture = TestBed.createComponent(UploadBox);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
