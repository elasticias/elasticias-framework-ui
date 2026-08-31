import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    input,
    signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EfCardComponent } from '../../layout/ef-card/ef-card.component';
import { EfDialogComponent } from '../../layout/ef-dialog/ef-dialog.component';
import { EfButtonComponent } from '../../layout/ef-button/ef-button.component';
import { EfChangeHistoryEntry } from './ef-change-history.types';

interface OpMeta {
    cls: string;
}

/** Built-in color class per standardized operation code — keeps the box
 *  self-contained (no reference-data round-trip needed for the visual).
 *  Dots are plain solid circles; only the color varies. */
const OP_META: Record<string, OpMeta> = {
    created: { cls: 'op-created' },
    updated: { cls: 'op-updated' },
    status_changed: { cls: 'op-status' },
    deleted: { cls: 'op-deleted' },
    note: { cls: 'op-note' },
};
const DEFAULT_META: OpMeta = { cls: 'op-default' };

/**
 * Standardized change-history box. Drop it on any detail screen and feed it the
 * record's audit entries (from `GET /api/audit/{entityType}/{id}` via the NSwag
 * `AuditClient`). Renders a vertical timeline inside an {@link EfCardComponent},
 * resolving operation labels through `audit_op_*` i18n keys and field labels
 * through `audit_field_*` (falling back to the raw field key when unmapped).
 *
 * ```html
 * <ef-change-history [entries]="auditEntries()" />
 * ```
 */
@Component({
    selector: 'ef-change-history',
    standalone: true,
    imports: [
        CommonModule,
        TranslateModule,
        EfCardComponent,
        EfDialogComponent,
        EfButtonComponent,
    ],
    templateUrl: './ef-change-history.component.html',
    styleUrl: './ef-change-history.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EfChangeHistoryComponent {
    private readonly translate = inject(TranslateService);

    readonly entries = input<ReadonlyArray<EfChangeHistoryEntry>>([]);
    readonly titleKey = input<string>('audit_history_title');
    readonly emptyKey = input<string>('audit_empty');
    /** Cap the total rows considered (newest first). 0 = no cap. */
    readonly limit = input<number>(0);
    /** How many recent entries to show inline in the card. 0 = all. The rest
     *  are reachable via the "view details" dialog. */
    readonly previewLimit = input<number>(3);
    /** Render inside a collapsible card. */
    readonly collapsible = input(true);
    /** Initial collapsed state — expanded by default. */
    readonly startCollapsed = input(false);

    /** "Show more" dialog visibility. */
    readonly dialogVisible = signal(false);

    /** First `previewLimit` rows shown inline in the card. */
    readonly previewRows = computed(() => {
        const all = this.rows();
        const n = this.previewLimit();
        return n > 0 ? all.slice(0, n) : all;
    });

    /** True when the full list has more entries than the inline preview. */
    readonly hasMore = computed(() => this.rows().length > this.previewRows().length);

    openDialog(event?: Event): void {
        event?.stopPropagation();
        this.dialogVisible.set(true);
    }

    readonly rows = computed(() => {
        const list = this.entries() ?? [];
        const limited = this.limit() > 0 ? list.slice(0, this.limit()) : list;
        return limited.map((entry) => {
            const op = entry.operation ?? '';
            return {
                entry,
                meta: OP_META[op] ?? DEFAULT_META,
                operationLabel: this.resolveLabel(`audit_op_${op}`, op),
            };
        });
    });

    /** Resolve a field key to its label. Adding an `audit_field_<field>` key is
     *  OPTIONAL — when it's missing the raw field name is humanized
     *  (`clientCode` → "Client code"), so new entities/fields work with zero
     *  i18n maintenance. Add a key only for a properly localized (fr/ar) term. */
    fieldLabel(field: string | undefined): string {
        if (!field) return '';
        // Dotted paths (address.city, contacts.added) → underscore i18n key,
        // since ngx-translate treats dots as nested lookups.
        const key = `audit_field_${field.replace(/\./g, '_')}`;
        return this.resolveLabel(key, field);
    }

    /** Returns the translation when present, otherwise a humanized fallback of
     *  the source token (ngx-translate echoes the key on a miss). */
    private resolveLabel(key: string, source: string): string {
        const translated = this.translate.instant(key);
        return translated === key ? this.humanize(source) : translated;
    }

    /** `clientCode` / `status_changed` → "Client code" / "Status changed". */
    private humanize(token: string): string {
        const words = token
            .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
            .replace(/[._-]+/g, ' ')
            .trim()
            .toLowerCase();
        return words ? words.charAt(0).toUpperCase() + words.slice(1) : '';
    }

    /** Locale-stable dd/MM/yyyy HH:mm — avoids depending on Angular locale data
     *  registration (the app's default locale is fr-MA). */
    formatWhen(value: string | Date | null | undefined): string {
        if (!value) return '';
        const d = typeof value === 'string' ? new Date(value) : value;
        if (!d || isNaN(d.getTime())) return '';
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
}
