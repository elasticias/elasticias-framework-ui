import { ChangeDetectionStrategy, Component, ElementRef, inject, input, model } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { EfStatusChipComponent } from '../../feedback/ef-status-chip/ef-status-chip.component';

/** One tile of an `ef-recipient-choices` group. */
export interface EfRecipientChoice {
    value: string;
    /** Literal title (host data, such as an address label). */
    title?: string | null;
    /** Translation key for the title, wins over `title`. */
    titleKey?: string | null;
    description?: string | null;
    descriptionKey?: string | null;
    /** Translation key of a small chip after the title ("Par défaut"). */
    badgeKey?: string | null;
}

/**
 * Radio cards for the recipient dialog: saved addresses and payment methods.
 * `ef-radio` draws a plain label per option; these choices need a title, a
 * second line and a chip, as on the checkout. A `role="radiogroup"` of
 * `role="radio"` buttons, one tab stop (roving), arrow keys move and select,
 * each tile at least 48px tall.
 */
@Component({
    selector: 'ef-recipient-choices',
    standalone: true,
    imports: [TranslateModule, EfStatusChipComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div
            class="ef-recipient-choices"
            role="radiogroup"
            [attr.aria-labelledby]="labelledBy() || null"
            [attr.aria-required]="required() ? 'true' : null"
        >
            @for (c of choices(); track c.value; let i = $index) {
                <button
                    type="button"
                    role="radio"
                    class="ef-recipient-choice"
                    [class.is-checked]="c.value === value()"
                    [attr.aria-checked]="c.value === value() ? 'true' : 'false'"
                    [attr.data-value]="c.value"
                    [tabindex]="tabIndexOf(c, i)"
                    [disabled]="disabled()"
                    (click)="value.set(c.value)"
                    (keydown)="onKey($event, i)"
                >
                    <span class="ef-recipient-choice__dot" aria-hidden="true"></span>
                    <span class="ef-recipient-choice__text">
                        <span class="ef-recipient-choice__title">
                            {{ c.titleKey ? (c.titleKey | translate) : c.title }}
                            @if (c.badgeKey) {
                                <ef-status-chip color="onhold" [labelKey]="c.badgeKey" hideDot />
                            }
                        </span>
                        @if (c.descriptionKey || c.description) {
                            <span class="ef-recipient-choice__desc">
                                {{ c.descriptionKey ? (c.descriptionKey | translate) : c.description }}
                            </span>
                        }
                    </span>
                </button>
            }
        </div>
    `,
    styles: `
        :host {
            display: block;
            min-width: 0;
        }
        .ef-recipient-choices {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            gap: var(--s-2);
        }
        .ef-recipient-choice {
            appearance: none;
            display: flex;
            align-items: flex-start;
            gap: var(--s-3);
            min-width: 0;
            min-height: var(--hit-touch);
            padding: 12px;
            border: 1px solid var(--rule);
            border-radius: var(--r-md);
            background: var(--paper-alt);
            color: var(--text);
            font: inherit;
            text-align: start;
            cursor: pointer;
        }
        .ef-recipient-choice:hover:not(:disabled) {
            border-color: var(--ink-400);
        }
        .ef-recipient-choice:focus-visible {
            outline: 2px solid var(--tenant-400);
            outline-offset: 2px;
        }
        .ef-recipient-choice.is-checked {
            border-color: var(--tenant-500);
            background: var(--tenant-50);
        }
        .ef-recipient-choice:disabled {
            cursor: not-allowed;
            opacity: 0.7;
        }
        .ef-recipient-choice__dot {
            flex: none;
            width: 18px;
            height: 18px;
            margin-top: 1px;
            border: 2px solid var(--ink-400);
            border-radius: 50%;
            background: var(--paper-alt);
        }
        .is-checked .ef-recipient-choice__dot {
            border-color: var(--tenant-500);
            box-shadow: inset 0 0 0 3px var(--paper-alt);
            background: var(--tenant-500);
        }
        .ef-recipient-choice__text {
            display: grid;
            gap: 2px;
            min-width: 0;
        }
        .ef-recipient-choice__title {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: var(--s-2);
            font-weight: 700;
            min-width: 0;
        }
        .ef-recipient-choice__desc {
            color: var(--text-mute);
            font-size: 13px;
            overflow-wrap: anywhere;
        }
    `,
})
export class EfRecipientChoicesComponent {
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    readonly choices = input<EfRecipientChoice[]>([]);
    readonly value = model<string>('');
    readonly labelledBy = input<string>('');
    readonly required = input(false);
    readonly disabled = input(false);

    /** Roving tab stop: the checked tile, or the first when none is. */
    protected tabIndexOf(c: EfRecipientChoice, index: number): number {
        const current = this.value();
        const anyChecked = this.choices().some(x => x.value === current);
        return (anyChecked ? c.value === current : index === 0) ? 0 : -1;
    }

    protected onKey(event: KeyboardEvent, index: number): void {
        const list = this.choices();
        if (!list.length) return;
        const rtl = getComputedStyle(this.host.nativeElement).direction === 'rtl';
        let step = 0;
        if (event.key === 'ArrowDown') step = 1;
        else if (event.key === 'ArrowUp') step = -1;
        else if (event.key === 'ArrowRight') step = rtl ? -1 : 1;
        else if (event.key === 'ArrowLeft') step = rtl ? 1 : -1;
        if (!step) return;
        event.preventDefault();
        const next = (index + step + list.length) % list.length;
        this.value.set(list[next].value);
        const buttons = this.host.nativeElement.querySelectorAll<HTMLButtonElement>('[role="radio"]');
        buttons[next]?.focus();
    }
}
