import { Injectable, Injector, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ConfirmationService } from 'primeng/api';

/** What the user is being asked to approve. Drives the copy, the icon
 *  and the weight of the accept button. */
export type EfConfirmIntent = 'generic' | 'delete';

/**
 * Options accepted by `ConfirmDialogService.confirm()`.
 *
 * Every piece of text is a translation key, per the framework's i18n
 * convention — the service resolves them through `TranslateService` so
 * the dialog speaks the user's language rather than the author's. The
 * literal `message` / `header` escape hatches exist for text that is
 * already translated (a server message, say); a key always wins.
 */
export interface EfConfirmOptions {
    /** Kind of confirmation — `'delete'` supplies destructive defaults. */
    intent?: EfConfirmIntent;

    /**
     * Name of the thing being acted on, so the dialog can say *what* it
     * is about to destroy: "Delete client ANDALOCY PARFUMS?" rather than
     * "Delete?". Omit it and the generic message is used instead.
     */
    name?: string | null;

    /** Translation key for the message — preferred over `message`. */
    messageKey?: string;
    /** Already-translated message. Used when `messageKey` is empty. */
    message?: string;
    /** Extra interpolation params for `messageKey` (`name` is added). */
    messageParams?: Record<string, unknown>;

    /** Translation key for the dialog title. */
    headerKey?: string;
    /** Already-translated dialog title. */
    header?: string;

    /** Translation key for the accept button label. */
    acceptLabelKey?: string;
    /** Translation key for the reject button label. */
    rejectLabelKey?: string;

    /** PrimeNG icon class shown in the body tile. */
    icon?: string;

    /** Run when the user accepts. */
    accept?: () => void;
    /** Run when the user cancels or dismisses. */
    reject?: () => void;

    /** Originating event, so PrimeNG can anchor the dialog. */
    event?: Event;
}

/** Built-in fallbacks, used only when a translation is missing, so a
 *  consuming app that has not yet added the keys still gets a readable
 *  dialog instead of a raw key (or worse, an empty message under an
 *  irreversible action). */
const FALLBACKS: Record<string, string> = {
    ef_confirm_header: 'Confirmation',
    ef_confirm_message_generic: 'Are you sure you want to continue?',
    ef_confirm_accept: 'Confirm',
    ef_confirm_cancel: 'Cancel',
    ef_confirm_delete_header: 'Confirm deletion',
    ef_confirm_delete_accept: 'Delete',
    ef_confirm_delete_message: 'Are you sure you want to delete "{{name}}"? This action cannot be undone.',
    ef_confirm_delete_message_generic: 'Are you sure you want to delete this item? This action cannot be undone.',
};

/** Per-intent defaults. `confirm()` merges the caller's options over these. */
const INTENT_DEFAULTS: Record<EfConfirmIntent, Required<Pick<EfConfirmOptions,
    'headerKey' | 'acceptLabelKey' | 'rejectLabelKey' | 'icon'>> & { messageKey: string; namedMessageKey?: string }> = {
    generic: {
        headerKey: 'ef_confirm_header',
        acceptLabelKey: 'ef_confirm_accept',
        rejectLabelKey: 'ef_confirm_cancel',
        icon: 'pi pi-exclamation-triangle',
        messageKey: 'ef_confirm_message_generic',
    },
    delete: {
        headerKey: 'ef_confirm_delete_header',
        acceptLabelKey: 'ef_confirm_delete_accept',
        rejectLabelKey: 'ef_confirm_cancel',
        icon: 'pi pi-exclamation-triangle',
        messageKey: 'ef_confirm_delete_message_generic',
        namedMessageKey: 'ef_confirm_delete_message',
    },
};

/**
 * The app-wide confirmation modal, driven through PrimeNG's
 * `ConfirmationService` and rendered by `<ef-confirm-dialog>`.
 *
 * Two call shapes:
 *
 * ```ts
 * // Options — the one to reach for.
 * confirmDialogService.confirm({
 *     intent: 'delete',
 *     name: client.name,          // "Delete ANDALOCY PARFUMS?"
 *     accept: () => this.remove(),
 * });
 *
 * // Legacy positional form, kept so existing callers keep compiling.
 * confirmDialogService.confirm('Already-translated question?', onYes, onNo);
 * ```
 */
@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
    private readonly confirmationService = inject(ConfirmationService);

    /**
     * Lazy holder. Resolving `TranslateService` at construction time pulls
     * in HttpClient and, through the interceptor chain, services that
     * inject this one — the same cycle `EfToastService` documents. Defer
     * to the first actual `confirm()` call, which is always well after
     * bootstrap.
     */
    private readonly injector = inject(Injector);
    private _translate?: TranslateService;

    confirm(options: EfConfirmOptions): void;
    /** @deprecated Pass `EfConfirmOptions` — a literal message cannot be translated. */
    confirm(message: string, acceptCallback?: () => void, rejectCallback?: () => void, event?: Event): void;
    confirm(
        messageOrOptions: string | EfConfirmOptions,
        acceptCallback?: () => void,
        rejectCallback?: () => void,
        event?: Event,
    ): void {
        const options: EfConfirmOptions =
            typeof messageOrOptions === 'string'
                ? { message: messageOrOptions, accept: acceptCallback, reject: rejectCallback, event }
                : messageOrOptions;

        const defaults = INTENT_DEFAULTS[options.intent ?? 'generic'];
        const name = options.name?.toString().trim() || undefined;

        this.confirmationService.confirm({
            target: options.event?.target ?? undefined,
            message: this.resolveMessage(options, defaults, name),
            header: options.header ?? this.t(options.headerKey ?? defaults.headerKey),
            closable: true,
            closeOnEscape: true,
            icon: options.icon ?? defaults.icon,
            rejectButtonProps: {
                label: this.t(options.rejectLabelKey ?? defaults.rejectLabelKey),
                severity: 'secondary',
                outlined: true,
            },
            acceptButtonProps: {
                label: this.t(options.acceptLabelKey ?? defaults.acceptLabelKey),
                // Semantics. The visual weight comes from the style class
                // below, because `.es-confirm .p-confirmdialog-accept-button`
                // in `_patterns.scss` paints the button at a specificity a
                // severity class cannot reach.
                severity: options.intent === 'delete' ? 'danger' : undefined,
            },
            // `.btn.btn-danger` is declared after the `.es-confirm` accept
            // rule at equal specificity, so it is what finally colours a
            // destructive confirm red instead of ordinary primary ink.
            acceptButtonStyleClass: options.intent === 'delete' ? 'btn btn-danger' : undefined,
            accept: () => options.accept?.(),
            reject: () => options.reject?.(),
        });
    }

    /**
     * Sugar for `confirm({ intent: 'delete', ... })`.
     *
     * ```ts
     * confirmDialogService.confirmDelete({ name: row.label, accept: () => … });
     * ```
     */
    confirmDelete(options: Omit<EfConfirmOptions, 'intent'> = {}): void {
        this.confirm({ ...options, intent: 'delete' });
    }

    /* ── Internals ─────────────────────────────────────────────── */

    private resolveMessage(
        options: EfConfirmOptions,
        defaults: (typeof INTENT_DEFAULTS)[EfConfirmIntent],
        name: string | undefined,
    ): string {
        if (options.messageKey) {
            return this.t(options.messageKey, { ...options.messageParams, name: escapeHtml(name ?? '') });
        }
        if (options.message != null) return options.message;

        // A named message when we know what is being acted on, the generic
        // one otherwise — so a caller with no name still reads correctly.
        const key = name && defaults.namedMessageKey ? defaults.namedMessageKey : defaults.messageKey;
        return this.t(key, { ...options.messageParams, name: escapeHtml(name ?? '') });
    }

    private t(key: string, params?: Record<string, unknown>): string {
        this._translate ??= this.injector.get(TranslateService);
        const value = this._translate.instant(key, params);
        // `instant()` hands back the key when nothing is loaded for it.
        // Never show that to a user who is about to destroy something.
        if (value !== key) return value;
        const fallback = FALLBACKS[key];
        return fallback ? interpolate(fallback, params) : '';
    }
}

/**
 * PrimeNG renders the confirm message through `[innerHTML]`. Angular
 * sanitizes it, so this is not about script execution — it is about an
 * entity name containing `<`, `>` or `&` rendering as markup or being
 * silently swallowed. "Renault < Dacia" must read as itself.
 */
function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** Minimal `{{param}}` substitution for the built-in fallbacks, which
 *  never reach ngx-translate's own interpolator. */
function interpolate(template: string, params?: Record<string, unknown>): string {
    if (!params) return template;
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match: string, key: string) =>
        params[key] == null ? match : String(params[key]),
    );
}
