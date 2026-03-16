import { Injectable } from '@angular/core';
import { ConfirmationService } from 'primeng/api';

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  constructor(private confirmationService: ConfirmationService) {}

  confirm(
    message: string,
    acceptCallback?: () => void,
    rejectCallback?: () => void,
    event?: Event
  ): void {
    this.confirmationService.confirm({
      target: event ? (event.target as EventTarget) : undefined,
      message,
      header: 'Confirmation',
      closable: true,
      closeOnEscape: true,
      icon: 'pi pi-exclamation-triangle',
      rejectButtonProps: {
        label: 'Annuler',
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: {
        label: 'Confirmer',
      },
      accept: () => acceptCallback?.(),
      reject: () => rejectCallback?.(),
    });
  }
}
