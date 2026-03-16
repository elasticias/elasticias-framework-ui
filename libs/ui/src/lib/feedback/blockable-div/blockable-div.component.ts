import { Component, ElementRef, Input, HostBinding } from '@angular/core';
import { BlockableUI } from 'primeng/api';

@Component({
  selector: 'blockable-div',
  standalone: true,
  template: `<ng-content></ng-content>`,
})
export class BlockableDivComponent implements BlockableUI {
  @Input() style: { [key: string]: string } = {};
  @Input() cssClass: string = '';

  constructor(private el: ElementRef) {}

  getBlockableElement(): HTMLElement {
    return this.el.nativeElement;
  }

  @HostBinding('style') get componentStyle() {
    return this.style;
  }

  @HostBinding('class') get componentClass() {
    return this.cssClass;
  }
}
