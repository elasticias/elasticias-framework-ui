import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EfEnvironmentBadgeComponent } from './ef-environment-badge.component';

@Component({
    standalone: true,
    imports: [EfEnvironmentBadgeComponent],
    template: `<ef-environment-badge [environment]="env()" />`,
})
class HostComponent {
    readonly env = signal<string | null | undefined>(undefined);
}

/** A badge in production, or one that guesses, is the failure this exists to prevent. */
describe('EfEnvironmentBadgeComponent', () => {
    function render(env: string | null | undefined) {
        TestBed.configureTestingModule({ imports: [HostComponent, TranslateModule.forRoot()] });
        const fixture = TestBed.createComponent(HostComponent);
        fixture.componentInstance.env.set(env);
        fixture.detectChanges();
        return fixture.nativeElement.querySelector('.ef-env-badge') as HTMLElement | null;
    }

    it.each(['DEV', 'dev', 'STAGING'])('shows the code for %s', (env) => {
        const badge = render(env)!;
        expect(badge).not.toBeNull();
        expect(badge.querySelector('.ef-env-badge__code')!.textContent!.trim()).toBe(env.toUpperCase());
        expect(badge.getAttribute('data-env')).toBe(env.toUpperCase());
    });

    it.each(['PROD', 'prod', 'unknown', 'PRODUCTION', '', null, undefined])('renders nothing for %s', (env) => {
        expect(render(env)).toBeNull();
    });

    it('gives screen readers the full name, not the code', () => {
        const badge = render('STAGING')!;
        expect(badge.querySelector('.ef-env-badge__code')!.getAttribute('aria-hidden')).toBe('true');
        expect(badge.querySelector('.ef-env-badge__name')!.textContent).toContain('env_badge_label');
    });
});
