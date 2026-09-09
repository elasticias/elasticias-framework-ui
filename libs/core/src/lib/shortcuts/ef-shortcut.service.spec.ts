import { Component, inject } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EfShortcutService } from './ef-shortcut.service';
import { isMacPlatform } from './format-shortcut';

/** Fires a bubbling keydown from `target` (appended to the body so it
 *  actually bubbles up to the document, where the service listens) and
 *  returns the event so a test can inspect `defaultPrevented`. */
function fireKeydown(
    target: Element,
    init: Partial<KeyboardEventInit> & { code: string },
): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: init.key ?? '',
        ...init,
    });
    target.dispatchEvent(event);
    return event;
}

/** The modifier this environment's own platform detection calls "mod",
 *  so the test exercises the real mapping rather than assuming one OS. */
function modInit(): Partial<KeyboardEventInit> {
    return isMacPlatform ? { metaKey: true } : { ctrlKey: true };
}

describe('EfShortcutService', () => {
    let service: EfShortcutService;
    let host: HTMLDivElement;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(EfShortcutService);
        host = document.createElement('div');
        document.body.appendChild(host);
    });

    afterEach(() => {
        host.remove();
    });

    it('resolves mod to Command on macOS and Control everywhere else', () => {
        const handler = vi.fn();
        service.register({ id: 'test.mod', keys: 'mod+d', labelKey: 'x', group: 'g', handler });

        fireKeydown(host, { code: 'KeyD', key: 'd', ...modInit() });

        expect(handler).toHaveBeenCalledTimes(1);
    });

    it('ignores a keystroke while the target is typing', () => {
        const handler = vi.fn();
        service.register({ id: 'test.typing', keys: 'e', labelKey: 'x', group: 'g', handler });

        const input = document.createElement('input');
        host.appendChild(input);
        fireKeydown(input, { code: 'KeyE', key: 'e' });

        expect(handler).not.toHaveBeenCalled();
    });

    // `isContentEditable` is part of the same guard (see `isTypingTarget`)
    // but jsdom does not implement it (the property reads `undefined`
    // regardless of the `contenteditable` attribute), so it cannot be
    // exercised in this test environment — verified manually instead.

    it('gates the handler on `when`', () => {
        let active = false;
        const handler = vi.fn();
        service.register({
            id: 'test.when',
            keys: 'e',
            labelKey: 'x',
            group: 'g',
            handler,
            when: () => active,
        });

        fireKeydown(host, { code: 'KeyE', key: 'e' });
        expect(handler).not.toHaveBeenCalled();

        active = true;
        fireKeydown(host, { code: 'KeyE', key: 'e' });
        expect(handler).toHaveBeenCalledTimes(1);
    });

    it('removes the registration when the disposer runs', () => {
        const handler = vi.fn();
        const dispose = service.register({
            id: 'test.dispose',
            keys: 'e',
            labelKey: 'x',
            group: 'g',
            handler,
        });

        dispose();
        fireKeydown(host, { code: 'KeyE', key: 'e' });

        expect(handler).not.toHaveBeenCalled();
        expect(service.list().flatMap(g => g.shortcuts)).not.toContainEqual(
            expect.objectContaining({ id: 'test.dispose' }),
        );
    });

    it('prevents the default only when a registration matches', () => {
        service.register({ id: 'test.pd', keys: 'e', labelKey: 'x', group: 'g', handler: vi.fn() });

        const matched = fireKeydown(host, { code: 'KeyE', key: 'e' });
        expect(matched.defaultPrevented).toBe(true);

        const unmatched = fireKeydown(host, { code: 'KeyZ', key: 'z' });
        expect(unmatched.defaultPrevented).toBe(false);
    });

    it('lists registrations grouped, deduplicating identical entries', () => {
        service.register({ id: 'a', keys: 'mod+d', labelKey: 'common_duplicate', group: 'g', handler: vi.fn() });
        service.register({ id: 'b', keys: 'mod+d', labelKey: 'common_duplicate', group: 'g', handler: vi.fn() });

        const group = service.list().find(g => g.group === 'g');
        expect(group?.shortcuts.length).toBe(1);
    });

    describe('auto-dispose via DestroyRef', () => {
        @Component({ selector: 'ef-test-host', standalone: true, template: '' })
        class TestHostComponent {
            private readonly shortcuts = inject(EfShortcutService);

            constructor() {
                this.shortcuts.register({
                    id: 'test.auto-dispose',
                    keys: 'e',
                    labelKey: 'x',
                    group: 'g',
                    handler: vi.fn(),
                });
            }
        }

        it('unregisters when the registering context is destroyed', () => {
            const fixture: ComponentFixture<TestHostComponent> =
                TestBed.createComponent(TestHostComponent);
            fixture.detectChanges();

            expect(
                service.list().flatMap(g => g.shortcuts).some(s => s.id === 'test.auto-dispose'),
            ).toBe(true);

            fixture.destroy();

            expect(
                service.list().flatMap(g => g.shortcuts).some(s => s.id === 'test.auto-dispose'),
            ).toBe(false);
        });
    });
});
