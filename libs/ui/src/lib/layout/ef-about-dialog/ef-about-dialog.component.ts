import { ChangeDetectionStrategy, Component, computed, inject, input, model } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { EF_BUILD_INFO, EfBuildPackage } from '@elasticias/core';
import { EfDialogComponent, EfDialogAction } from '../ef-dialog/ef-dialog.component';

/**
 * The server half of the deployment, as an app fetches it from its own API.
 * Every field is optional: the dialog renders the group only for what it was
 * given, so an app with no such endpoint simply omits the input.
 */
export interface EfAboutServer {
    /** Hosting environment — may differ from the build's own environment. */
    environment?: string;
    /** Runtime description, e.g. `.NET 10.0.6`. */
    runtime?: string;
    /** Version of the API itself. */
    version?: string;
    /** Shared framework assemblies loaded by the API. */
    packages?: EfBuildPackage[];
}

/**
 * "About this app" — which build is running and what shared packages it
 * was compiled against.
 *
 * Reads `EF_BUILD_INFO` optionally and renders the build rows only when the
 * app provided it, so a consumer that wired no stamp still gets a usable
 * dialog with its product identity.
 *
 * It is deliberately a dialog rather than a screen: the information is
 * consulted (to paste a commit into an issue, to check which release a
 * tenant is on) and dismissed, never navigated to.
 *
 * ```html
 * <ef-about-dialog [(visible)]="aboutOpen" product="Crescilio" [edition]="tenantName()" />
 * ```
 */
@Component({
    selector: 'ef-about-dialog',
    standalone: true,
    templateUrl: './ef-about-dialog.component.html',
    styleUrl: './ef-about-dialog.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TranslateModule, EfDialogComponent],
})
export class EfAboutDialogComponent {
    /** Two-way open state. */
    readonly visible = model(false);

    /** Product name, shown large under the mark. */
    readonly product = input('');

    /** One muted line under the product — a tenant, a plan, an edition. */
    readonly edition = input('');

    /** Which organisation this deployment serves, as a labelled row. */
    readonly organisation = input('');

    /** What the API reports about itself. Leave empty to hide the group. */
    readonly server = input<EfAboutServer>({});

    /** Outbound link, already carrying whatever query the app wants on it. */
    readonly websiteUrl = input('');

    /** What the link reads as — a domain, not a sentence. */
    readonly websiteLabel = input('');

    /** Brand mark. A logo wins over the initial when both are set; empty
     *  means "none", the same way `edition` and `initial` read. */
    readonly logoUrl = input('');
    readonly initial = input('');

    /** Copyright holder on the last line. */
    readonly owner = input('Elasticias');

    protected readonly info = inject(EF_BUILD_INFO, { optional: true });

    protected readonly year = new Date().getFullYear();

    protected readonly packages = computed<EfBuildPackage[]>(() => this.info?.packages ?? []);

    /**
     * A released build is known by its version; an unreleased one has no
     * version to be known by. Same split as `ef-build-stamp`: printing an
     * empty row is worse than printing none.
     */
    protected readonly rows = computed<{ labelKey: string; value: string }[]>(() => {
        const i = this.info;
        return [
            { labelKey: 'common_about_organisation', value: this.organisation() },
            { labelKey: 'common_about_version', value: i?.version ? `v${i.version}` : '' },
            { labelKey: 'common_about_environment', value: i?.environment ?? '' },
            { labelKey: 'common_about_branch', value: i?.branch ?? '' },
            { labelKey: 'common_about_commit', value: i?.commit ?? '' },
            { labelKey: 'common_about_date', value: i?.date ?? '' },
        ].filter(row => !!row.value);
    });

    /** The API's own identity, above the assemblies it loaded. */
    protected readonly serverRows = computed<{ labelKey: string; value: string }[]>(() => {
        const s = this.server();
        return [
            { labelKey: 'common_about_environment', value: s.environment ?? '' },
            { labelKey: 'common_about_runtime', value: s.runtime ?? '' },
            { labelKey: 'common_about_version', value: s.version ?? '' },
        ].filter(row => !!row.value);
    });

    protected readonly serverPackages = computed<EfBuildPackage[]>(
        () => this.server().packages ?? [],
    );

    protected readonly hasServer = computed(
        () => this.serverRows().length > 0 || this.serverPackages().length > 0,
    );

    /** A footer button, not only the header ✕: a thumb needs a real target. */
    protected readonly closeAction: EfDialogAction[] = [
        { labelKey: 'common_close', severity: 'ghost' },
    ];
}
