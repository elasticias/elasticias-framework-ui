import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  EfDialogAction,
  EfDialogComponent,
} from '../../layout/ef-dialog/ef-dialog.component';

/**
 * Reusable PDF preview overlay — an `ef-dialog` hosting the browser's native
 * PDF viewer (an `<iframe>` fed a sanitized object URL) plus an optional action
 * bar (WhatsApp share · download · open in new tab · print · close).
 *
 * Self-contained: pass a `Blob` and a `fileName`, toggle which actions show.
 * The object URL is created/revoked automatically with the blob's lifetime.
 *
 * @example
 * <ef-pdf-preview
 *   [(visible)]="pdfVisible"
 *   [blob]="pdfBlob()"
 *   [fileName]="pdfName()"
 *   [showWhatsappShare]="true"
 *   [whatsappPhone]="customerPhone()" />
 */
@Component({
  selector: 'ef-pdf-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TranslateModule, EfDialogComponent],
  templateUrl: './ef-pdf-preview.component.html',
  styleUrl: './ef-pdf-preview.component.scss',
})
export class EfPdfPreviewComponent {
  private readonly sanitizer = inject(DomSanitizer);

  /** The PDF blob to preview. Setting it (re)creates the object URL. */
  blob = input<Blob | null>(null);
  /** File name shown in the header + used for download / share. */
  fileName = input<string>('document.pdf');
  /** Two-way dialog visibility. */
  visible = model<boolean>(false);
  /** Header title translation key. */
  titleKey = input<string>('pdf_preview.title');

  showDownload = input(true, { transform: booleanAttribute });
  showPrint = input(true, { transform: booleanAttribute });
  showOpenInNewTab = input(true, { transform: booleanAttribute });
  /** Show the WhatsApp share button (Web Share API → wa.me fallback). */
  showWhatsappShare = input(false, { transform: booleanAttribute });
  /** Optional recipient phone for the wa.me fallback (digits / +). */
  whatsappPhone = input<string>('');

  private readonly objectUrl = signal<string | null>(null);
  private currentUrl: string | null = null;

  readonly safeUrl = computed<SafeResourceUrl | null>(() => {
    const url = this.objectUrl();
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });

  /** Footer buttons, rendered by `ef-dialog`'s `[actions]`. `dismiss:false`
   *  keeps the preview open after download/print/share/open. */
  readonly actions = computed<EfDialogAction[]>(() => {
    const list: EfDialogAction[] = [
      {
        labelKey: 'common_close',
        icon: 'pi pi-times',
        severity: 'ghost',
        styleClass: 'btn-dialog-leading',
        dismiss: true,
      },
    ];
    if (this.showWhatsappShare()) {
      list.push({
        labelKey: 'pdf_preview.whatsapp',
        icon: 'pi pi-whatsapp',
        severity: 'ghost',
        styleClass: 'btn-whatsapp',
        dismiss: false,
        command: () => this.shareWhatsapp(),
      });
    }
    if (this.showDownload()) {
      list.push({
        labelKey: 'pdf_preview.download',
        icon: 'pi pi-download',
        severity: 'ghost',
        styleClass: 'btn-download',
        dismiss: false,
        command: () => this.download(),
      });
    }
    if (this.showOpenInNewTab()) {
      list.push({
        labelKey: 'pdf_preview.new_window',
        icon: 'pi pi-external-link',
        severity: 'ghost',
        dismiss: false,
        command: () => this.openInNewTab(),
      });
    }
    if (this.showPrint()) {
      list.push({
        labelKey: 'pdf_preview.print',
        icon: 'pi pi-print',
        severity: 'primary',
        dismiss: false,
        command: () => this.print(),
      });
    }
    return list;
  });

  constructor() {
    effect(() => {
      const blob = this.blob();
      this.revoke();
      this.currentUrl = blob ? URL.createObjectURL(blob) : null;
      this.objectUrl.set(this.currentUrl);
    });
    inject(DestroyRef).onDestroy(() => this.revoke());
  }

  private revoke(): void {
    if (this.currentUrl) {
      URL.revokeObjectURL(this.currentUrl);
      this.currentUrl = null;
    }
  }

  close(): void {
    this.visible.set(false);
  }

  download(): void {
    if (!this.currentUrl) return;
    const a = document.createElement('a');
    a.href = this.currentUrl;
    a.download = this.fileName();
    a.click();
  }

  openInNewTab(): void {
    if (this.currentUrl) window.open(this.currentUrl, '_blank');
  }

  print(): void {
    if (!this.currentUrl) return;
    const win = window.open(this.currentUrl, '_blank');
    win?.addEventListener('load', () => win.print());
  }

  shareWhatsapp(): void {
    const blob = this.blob();
    if (!blob) return;
    const file = new File([blob], this.fileName(), { type: 'application/pdf' });
    const nav = navigator as Navigator & {
      canShare?: (data?: unknown) => boolean;
    };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      nav
        .share({ files: [file], title: this.fileName() })
        .catch(() => this.openWhatsappWeb());
      return;
    }
    this.openWhatsappWeb();
  }

  private openWhatsappWeb(): void {
    const phone = (this.whatsappPhone() || '').replace(/[^0-9+]/g, '');
    const msg = encodeURIComponent(this.fileName());
    const url = phone
      ? `https://wa.me/${phone}?text=${msg}`
      : `https://wa.me/?text=${msg}`;
    window.open(url, '_blank');
  }
}
