import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-user-message',
  imports: [DatePipe],
  templateUrl: './user-message.component.html',
  styleUrls: [],
})
export class UserMessageComponent {
  readonly message = input.required<any>();
}
