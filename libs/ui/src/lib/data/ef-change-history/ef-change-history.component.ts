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
import { EfChangeHistoryEntry, EfChangeHistoryValueItem } from './ef-change-history.types';

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
 *
 * Values are shown raw by default (`Received → Confirmed`). To show a field's
 * values translated, pass `valueLists`: a map of field path to the
 * `{ code, label }` items of a reference list. Each old/new value that matches
 * an item `code` (case-insensitive) is shown as its `label` (translated when
 * the label is an i18n key); anything unmatched stays raw. The reserved key
 * `status` maps the `fromStatus` / `toStatus` of status-change entries.
 * On a V2 detail screen, `AbstractDetailScreenV2.auditValueLists()` builds this
 * map from `ScreenConfig.AUDIT_VALUE_LISTS`.
 *
 * ```html
 * <ef-change-history [entries]="auditEntries()" [valueLists]="auditValueLists()" />
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

    /** Optional field path to reference items, used to show a field's raw
     *  old/new values as translated labels. Unmapped fields and unmatched
     *  values stay raw. Key `status` covers `fromStatus` / `toStatus`. */
    readonly valueLists = input<Readonly<Record<string, ReadonlyArray<EfChangeHistoryValueItem>>> | null>(null);

    /** Optional formatter for an entry's free-text note. Return the text to show,
     *  or null to keep the raw note. Rendered as plain text (never HTML). A
     *  screen uses it to translate coded notes such as `order_email_resent:order_confirmed`. */
    readonly noteFormatter = input<((note: string) => string | null) | null>(null);

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

    /** The note as shown: the formatter's text, else the raw note. */
    noteText(note: string | null | undefined): string {
        if (!note) return '';
        const fn = this.noteFormatter();
        if (!fn) return note;
        return fn(note) ?? note;
    }

    /** Display value for a field's raw value: the matching list item's label
     *  (translated when it is an i18n key), else the raw value. */
    valueLabel(field: string | undefined, value: string | null | undefined): string {
        if (value == null || value === '') return '';
        const items = field ? this.valueLists()?.[field] : undefined;
        if (!items?.length) return value;
        const needle = String(value).toLowerCase();
        const hit = items.find((i) => String(i.code).toLowerCase() === needle);
        if (!hit?.label) return value;
        const translated = this.translate.instant(hit.label);
        return translated || hit.label;
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
