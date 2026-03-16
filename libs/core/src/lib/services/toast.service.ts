import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private static readonly DEFAULT_DELAY = 3000;
  private static readonly DEFAULT_DELAY_INFO = 5000;

  constructor(private messageService: MessageService) {}

  showInfo(message: string, title = 'Information', delay = ToastService.DEFAULT_DELAY_INFO): void {
    this.messageService.add({ severity: 'info', summary: title, detail: message, life: delay });
  }

  showSuccess(message = 'Opération effectuée avec succès !', title = 'Succès', delay = ToastService.DEFAULT_DELAY): void {
    this.messageService.add({ severity: 'success', summary: title, detail: message, life: delay });
  }

  showWarn(message: string, title = 'Avertissement', delay = ToastService.DEFAULT_DELAY): void {
    this.messageService.add({ severity: 'warn', summary: title, detail: message, life: delay });
  }

  showError(message = "Une erreur s'est produite lors du traitement de votre opération.", title = 'Erreur', delay = ToastService.DEFAULT_DELAY): void {
    this.messageService.add({ severity: 'error', summary: title, detail: message, life: delay });
  }
}
