import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MessageSkeletonComponent } from './message-skeleton.component';

describe('MessageSkeletonComponent', () => {
  let component: MessageSkeletonComponent;
  let fixture: ComponentFixture<MessageSkeletonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MessageSkeletonComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MessageSkeletonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
