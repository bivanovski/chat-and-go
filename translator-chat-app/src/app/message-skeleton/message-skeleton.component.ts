import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-message-skeleton',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './message-skeleton.component.html',
  styleUrls: ['./message-skeleton.component.scss']
})
export class MessageSkeletonComponent {
  @Input() isOutgoing = false;
}