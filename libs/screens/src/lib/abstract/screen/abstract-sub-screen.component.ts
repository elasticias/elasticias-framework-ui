import { Component, Injector } from '@angular/core';
import { AbstractScreenComponent } from './abstract-screen.component';

@Component({
  template: ''
})
export abstract class AbstractSubScreenComponent extends AbstractScreenComponent {

  constructor(injector: Injector) {
    super(injector, null);
  }

  override ngOnInit(): void {
    super.ngOnInit();
  }

  override ngAfterViewInit(): void {
    super.ngAfterViewInit();
  }
}
