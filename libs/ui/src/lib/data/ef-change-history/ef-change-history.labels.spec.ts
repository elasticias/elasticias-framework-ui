import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { auditEntityKeySegment, EfChangeHistoryComponent } from './ef-change-history.component';

/**
 * Field labels: `audit_field_<entity>_<field>`, then `audit_field_<field>`,
 * then the humanized path. A trailing two-letter culture segment
 * (`notes.ar`, written by ChangeDiff for a LocalizedText) is shown as
 * "<label> (<culture name>)".
 */
const KEYS = {
    audit_field_notes: 'Notes',
    audit_field_product_notes: 'Notes olfactives',
    audit_field_contacts_added: 'Contact ajouté',
    audit_field_title_fr: 'Titre en français',
    ef_localized_input_culture_fr: 'Français',
    ef_localized_input_culture_ar: 'Arabe',
};

function make(entityType?: string | null) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [EfChangeHistoryComponent, TranslateModule.forRoot()] });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('fr', KEYS);
    translate.use('fr');
    const fixture = TestBed.createComponent(EfChangeHistoryComponent);
    if (entityType !== undefined) fixture.componentRef.setInput('entityType', entityType);
    fixture.detectChanges();
    return fixture.componentInstance;
}

describe('ef-change-history field labels', () => {
    it('prefers the entity key, then the global key, then the humanized path', () => {
        const product = make('Product');
        expect(product.fieldLabel('notes')).toBe('Notes olfactives');
        expect(product.fieldLabel('contacts.added')).toBe('Contact ajouté');
        expect(product.fieldLabel('clientCode')).toBe('Client code');
    });

    it('uses the global key without an entity type', () => {
        expect(make().fieldLabel('notes')).toBe('Notes');
        expect(make(null).fieldLabel('notes')).toBe('Notes');
    });

    it('labels a culture segment with the culture name', () => {
        const product = make('Product');
        expect(product.fieldLabel('notes.ar')).toBe('Notes olfactives (Arabe)');
        expect(make('Client').fieldLabel('notes.fr')).toBe('Notes (Français)');
    });

    it('humanizes the base path, not the culture, when no key exists', () => {
        expect(make('EmailTemplate').fieldLabel('htmlBody.ar')).toBe('Html body (Arabe)');
    });

    it('shows the code of a culture the bundle does not name', () => {
        expect(make().fieldLabel('subject.de')).toBe('Subject (de)');
    });

    it('lets an exact key for the whole path win over the culture split', () => {
        expect(make().fieldLabel('title.fr')).toBe('Titre en français');
    });

    it('does not read an upper-case or longer last segment as a culture', () => {
        expect(make().fieldLabel('size.FR')).toBe('Size fr');
        expect(make().fieldLabel('contacts.added')).toBe('Contact ajouté');
    });

    it('renders the culture label in the timeline', () => {
        TestBed.configureTestingModule({ imports: [EfChangeHistoryComponent, TranslateModule.forRoot()] });
        const translate = TestBed.inject(TranslateService);
        translate.setTranslation('fr', KEYS);
        translate.use('fr');
        const fixture = TestBed.createComponent(EfChangeHistoryComponent);
        fixture.componentRef.setInput('entityType', 'Product');
        fixture.componentRef.setInput('entries', [{ operation: 'updated', changes: [{ field: 'notes.ar', oldValue: 'a', newValue: 'b' }] }]);
        fixture.detectChanges();
        expect((fixture.nativeElement as HTMLElement).querySelector('.ch-field')?.textContent).toBe('Notes olfactives (Arabe)');
    });
});

describe('auditEntityKeySegment', () => {
    it.each([
        ['Product', 'product'],
        ['EmailTemplate', 'email_template'],
        ['StoreProduct', 'store_product'],
        ['POSSession', 'pos_session'],
        ['SalesOrder2', 'sales_order2'],
        ['email_template', 'email_template'],
        ['', ''],
    ])('%s gives %s', (type, segment) => {
        expect(auditEntityKeySegment(type)).toBe(segment);
    });
});
