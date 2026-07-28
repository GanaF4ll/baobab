import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-assistant-message',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './assistant-message.component.html',
  styleUrls: [],
})
export class AssistantMessageComponent {
  readonly message = input.required<any>();
}
