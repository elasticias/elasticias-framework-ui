import { Component, ElementRef, inject, Input, HostBinding } from '@angular/core';
import { BlockableUI } from 'primeng/api';

@Component({
  selector: 'ef-blockable-div',
  standalone: true,
  template: `<ng-content></ng-content>`,
})
export class EfBlockableDivComponent implements BlockableUI {
  @Input() style: { [key: string]: string } = {};
  @Input() cssClass = '';

  private readonly el = inject(ElementRef);

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
