import { TestBed } from '@angular/core/testing';
import { EfPermissionService } from './ef-permission.service';

describe('EfPermissionService per-screen grants', () => {
    let perms: EfPermissionService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        perms = TestBed.inject(EfPermissionService);
    });

    it('allows every screen until grants are first set (as before login)', () => {
        expect(perms.canScreen('SalesOrders')).toBe(true);
        expect(perms.canScreen('SalesOrders', 'Delete')).toBe(true);
    });

    it('requires Read by default', () => {
        perms.setScreenGrants({
            SalesOrders: { permissions: ['Read', 'Edit'] },
            CatalogProducts: { permissions: ['Create'] },
        });
        expect(perms.canScreen('SalesOrders')).toBe(true);
        expect(perms.canScreen('CatalogProducts')).toBe(false);
    });

    it('denies a screen that has no grant once grants are set', () => {
        perms.setScreenGrants({ SalesOrders: { permissions: ['Read'] } });
        expect(perms.canScreen('ProductCollections')).toBe(false);
    });

    it('denies a screen whose grant has no permissions', () => {
        perms.setScreenGrants({ SalesReports: {}, Other: { permissions: [] } });
        expect(perms.canScreen('SalesReports')).toBe(false);
        expect(perms.canScreen('Other')).toBe(false);
    });

    it('checks the requested verb', () => {
        perms.setScreenGrants({ SalesOrders: { permissions: ['Read', 'Edit'] } });
        expect(perms.canScreen('SalesOrders', 'Edit')).toBe(true);
        expect(perms.canScreen('SalesOrders', 'Delete')).toBe(false);
    });

    it('treats an empty grant set as no access, not as unset', () => {
        perms.setScreenGrants({});
        expect(perms.canScreen('SalesOrders')).toBe(false);
    });

    it('returns to the permissive default when cleared with null', () => {
        perms.setScreenGrants({});
        perms.setScreenGrants(null);
        expect(perms.canScreen('SalesOrders')).toBe(true);
    });

    it('reacts to grant changes through the signal', () => {
        perms.setScreenGrants({ A: { permissions: ['Read'] } });
        expect(perms.canScreen('A')).toBe(true);
        perms.setScreenGrants({ A: { permissions: [] } });
        expect(perms.canScreen('A')).toBe(false);
    });
});
