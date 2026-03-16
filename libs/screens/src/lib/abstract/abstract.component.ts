import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';

@Component({ template: '' })
export abstract class AbstractComponent implements OnInit, OnDestroy {
  @Input() readOnly = false;

  protected destroyed$ = new Subject<void>();

  abstract ngOnInit(): void;

  abstract ngOnDestroy(): void;
}
