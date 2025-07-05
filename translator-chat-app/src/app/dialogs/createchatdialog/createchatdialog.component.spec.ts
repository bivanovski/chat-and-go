import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreatechatdialogComponent } from './createchatdialog.component';

describe('CreatechatdialogComponent', () => {
  let component: CreatechatdialogComponent;
  let fixture: ComponentFixture<CreatechatdialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreatechatdialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreatechatdialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
