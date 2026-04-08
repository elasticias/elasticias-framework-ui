import { Component } from '@angular/core';
import { AbstractScreenComponent } from './abstract-screen.component';

@Component({
  template: ''
})
export abstract class AbstractSubScreenComponent extends AbstractScreenComponent {
  protected readonly screenState = null;

  override ngOnInit(): void {
    super.ngOnInit();
  }

  override ngAfterViewInit(): void {
    super.ngAfterViewInit();
  }
}
