import { Injectable, Injector, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';

/**
 * Toast severities — mapped 1:1 to the Comptoir status spectrum:
 * `info` → processing, `success` → delivered, `warn` → pending,
 * `error` → cancelled.
 */
export type EfToastSeverity = 'info' | 'success' | 'warn' | 'error';

/** Optional inline action button rendered at the end of a toast. */
export interface EfToastAction {
    /** Translation key for the button label — preferred. */
    labelKey?: string;
    /** Direct label fallback when `labelKey` is empty. */
    label?: string;

    /** Visual tone — `'ghost'` (default) or `'primary'` for the
     *  destructive / confirm action. */
    severity?: 'ghost' | 'primary';

    /** Click handler. */
    command?: () => void;

    /** Auto-close the toast after the click runs (default `true`). */
    dismissOnClick?: boolean;
}

/**
 * Toast options accepted by `EfToastService.show()`. Either a literal
 * `title` / `text` or their `*Key` translation variants — keys win
 * unless empty.
 */
export interface EfToastOptions {
    severity?: EfToastSeverity;
    title?: string;
    titleKey?: string;
    text?: string;
    textKey?: string;
    /** Auto-dismiss in ms; `0` = sticky (no auto-dismiss). */
    life?: number;
    actions?: EfToastAction[];
}

/** Active toast — instance held in `EfToastService.toasts`. */
export interface EfToast {
    id: number;
    severity: EfToastSeverity;
    title: string;
    text: string;
    life: number;
    actions?: EfToastAction[];
}

/**
 * Comptoir toast service — V2 successor to the legacy `ToastService`.
 *
 * Owns a signal-based queue (`toasts`) consumed by
 * `<ef-toast-region>`, AND forwards every toast to PrimeNG's
 * `MessageService` for back-compat with `<p-toast>` (still used by
 * ClientApp v1). Either renderer picks the toasts up; both work.
 *
 * Default i18n keys (override per-call via `titleKey` / `textKey`):
 * - `ef_toast_info_title`, `ef_toast_info_default`
 * - `ef_toast_success_title`, `ef_toast_success_default`
 * - `ef_toast_warn_title`, `ef_toast_warn_default`
 * - `ef_toast_error_title`, `ef_toast_error_default`
 *
 * Default lifespans: info 5s, success 4s, warn 6s, error 8s.
 */
@Injectable({ providedIn: 'root' })
export class EfToastService {
    private static readonly LIFE_INFO = 5000;
    private static readonly LIFE_SUCCESS = 4000;
    private static readonly LIFE_WARN = 6000;
    private static readonly LIFE_ERROR = 8000;

    /**
     * Lazy holders. Resolving TranslateService eagerly at construction
     * time pulls in HttpClient → HTTP_INTERCEPTORS → AuthorizeInterceptor
     * → AuthorizeService → ToastService → cycle. We defer to the first
     * actual translate / message-publish call.
     */
    private readonly injector = inject(Injector);
    private _translate?: TranslateService;
    private _messageService?: MessageService | null;
    private _messageServiceResolved = false;

    private nextId = 1;

    /** Live queue — `<ef-toast-region>` renders this. */
    readonly toasts = signal<ReadonlyArray<EfToast>>([]);

    /* ── Convenience methods (back-compat with the legacy
         ToastService signature: `(message?, title?, life?)`). ── */

    showInfo(message?: string, title?: string, life: number = EfToastService.LIFE_INFO): void {
        this.show({
            severity: 'info',
            title: title ?? this.t('ef_toast_info_title'),
            text: message ?? this.t('ef_toast_info_default'),
            life,
        });
    }

    showSuccess(message?: string, title?: string, life: number = EfToastService.LIFE_SUCCESS): void {
        this.show({
            severity: 'success',
            title: title ?? this.t('ef_toast_success_title'),
            text: message ?? this.t('ef_toast_success_default'),
            life,
        });
    }

    showWarn(message?: string, title?: string, life: number = EfToastService.LIFE_WARN): void {
        this.show({
            severity: 'warn',
            title: title ?? this.t('ef_toast_warn_title'),
            text: message ?? this.t('ef_toast_warn_default'),
            life,
        });
    }

    showError(message?: string, title?: string, life: number = EfToastService.LIFE_ERROR): void {
        this.show({
            severity: 'error',
            title: title ?? this.t('ef_toast_error_title'),
            text: message ?? this.t('ef_toast_error_default'),
            life,
        });
    }

    /** Generic show — opts can mix `title`/`titleKey`, `text`/`textKey`. */
    show(opts: EfToastOptions): EfToast {
        const severity = opts.severity ?? 'info';
        const toast: EfToast = {
            id: this.nextId++,
            severity,
            title: this.resolve(opts.title, opts.titleKey, this.defaultTitleKey(severity)),
            text: this.resolve(opts.text, opts.textKey, undefined),
            life: opts.life ?? this.defaultLife(severity),
            actions: opts.actions,
        };

        // Collapse a burst of identical toasts into one. A dashboard fans
        // out to many independent queries, so one rejected filter used to
        // stack the same message once per widget -- seven copies of "a
        // validation error occurred", burying the screen. Only toasts that
        // are still on screen dedupe, so the same message shown again later
        // still appears.
        const duplicate = this.toasts().find(
            t =>
                t.severity === toast.severity &&
                t.title === toast.title &&
                t.text === toast.text,
        );
        if (duplicate) return duplicate;

        this.toasts.update(list => [...list, toast]);

        // Forward to PrimeNG MessageService so v1's <p-toast> still
        // catches the toast. Sticky in PrimeNG is `life: 0`.
        this.messageService?.add({
            severity: toast.severity,
            summary: toast.title,
            detail: toast.text,
            life: toast.life || undefined,
            sticky: toast.life === 0,
        });

        return toast;
    }

    private get messageService(): MessageService | null {
        if (!this._messageServiceResolved) {
            this._messageServiceResolved = true;
            this._messageService = this.injector.get(MessageService, null, { optional: true });
        }
        return this._messageService ?? null;
    }

    dismiss(id: number): void {
        this.toasts.update(list => list.filter(t => t.id !== id));
    }

    clear(): void {
        this.toasts.set([]);
        this.messageService?.clear();
    }

    /* (messageService getter is defined just below `show` to keep it
        close to where it's consumed.) */

    /* ── Internals ─────────────────────────────────────────────── */

    private resolve(
        literal: string | undefined,
        key: string | undefined,
        fallbackKey: string | undefined,
    ): string {
        if (literal != null) return literal;
        if (key) return this.t(key);
        if (fallbackKey) return this.t(fallbackKey);
        return '';
    }

    private t(key: string): string {
        // Lazy-resolve TranslateService — see the field comment above
        // for the AuthorizeService cycle this avoids.
        this._translate ??= this.injector.get(TranslateService);
        const value = this._translate.instant(key);
        // `instant()` returns the key when no translation is loaded;
        // fall through to empty string so untranslated toasts don't
        // surface internal keys to end users.
        return value === key ? '' : value;
    }

    private defaultLife(severity: EfToastSeverity): number {
        switch (severity) {
            case 'info':    return EfToastService.LIFE_INFO;
            case 'success': return EfToastService.LIFE_SUCCESS;
            case 'warn':    return EfToastService.LIFE_WARN;
            case 'error':   return EfToastService.LIFE_ERROR;
        }
    }

    private defaultTitleKey(severity: EfToastSeverity): string {
        return `ef_toast_${severity}_title`;
    }
}

/**
 * @deprecated Use `EfToastService` — same instance, new name. The
 * alias keeps existing imports compiling during the v1 → V2
 * migration.
 */
export { EfToastService as ToastService };
