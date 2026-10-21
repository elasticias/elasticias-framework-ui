import { Injectable, InjectionToken, OnDestroy, inject, signal } from '@angular/core';
import { StorageUtils } from '@elasticias/utils';

/**
 * Idle sign-out timings. Keep `timeoutMs` equal to the server's cookie idle
 * expiry (`AddElasticiasCookieSession` in Elasticias.Framework), so neither
 * side outlives the other.
 */
export interface EfSessionIdleConfig {
    /** How long a signed-in user may go without input. */
    timeoutMs: number;
    /** How long before the sign-out the warning opens (ef-session-idle-dialog). */
    warningMs: number;
}

export const EF_SESSION_IDLE_DEFAULTS: EfSessionIdleConfig = {
    timeoutMs: 30 * 60 * 1000,
    warningMs: 60 * 1000,
};

export const EF_SESSION_IDLE_CONFIG = new InjectionToken<EfSessionIdleConfig>('EF_SESSION_IDLE_CONFIG');

/** Last user input, in epoch ms. In localStorage so every tab shares it. */
const LAST_ACTIVITY_KEY = 'SESSION_LAST_ACTIVITY';
/** Every second, for the countdown. A check is one localStorage read. */
const CHECK_INTERVAL_MS = 1000;
/** Input arrives many times a second; the shared timestamp needs far less. */
const WRITE_THROTTLE_MS = 15 * 1000;
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;

/**
 * Signs the user out after `timeoutMs` without input in any tab, and counts
 * down the last `warningMs` for `ef-session-idle-dialog`.
 *
 * A server-side cookie expiry cannot do this alone: an app that polls (a
 * grants or profile refresh) keeps a sliding cookie alive while nobody is at
 * the desk.
 *
 * Elapsed time is measured against the wall clock on every check, not by a
 * single long timer, because a background tab or a sleeping phone suspends
 * timers and would otherwise sign out hours late.
 *
 * The app owns the session: it calls `start()` after a sign-in the server
 * confirmed, `resume()` when it restores one from cache, `stop()` when it
 * ends, and decides what the `onIdle` callback does.
 */
@Injectable({ providedIn: 'root' })
export class EfSessionIdleService implements OnDestroy {
    private readonly config = inject(EF_SESSION_IDLE_CONFIG, { optional: true }) ?? EF_SESSION_IDLE_DEFAULTS;
    private onIdle: (() => void) | null = null;
    private checkTimer: ReturnType<typeof setInterval> | null = null;
    private lastWrite = 0;
    /** Set from the idle sign-out until stop(), so a second guard run cannot fire it again. */
    private ending = false;
    private readonly _secondsLeft = signal<number | null>(null);

    /**
     * Seconds until the idle sign-out while the warning is due, otherwise
     * null. Shared clock, so a tab where someone is working closes the
     * warning in every other tab.
     */
    readonly secondsLeft = this._secondsLeft.asReadonly();

    /** After a sign-in the server just confirmed: the clock starts now. */
    start(onIdle: () => void): void {
        this.ending = false;
        this.markActive(true);
        this.watch(onIdle);
    }

    /**
     * On a reload served from the cached profile, with no request to the
     * server yet: a session left idle past the limit ends before it is used.
     *
     * @returns false when the session is ending, so the caller does not hand
     * the cached profile to a guard that would render the app meanwhile.
     */
    resume(onIdle: () => void): boolean {
        if (this.ending) return false;
        if (this.onIdle) return true;
        if (this.idleFor() >= this.config.timeoutMs) {
            this.ending = true;
            onIdle();
            return false;
        }
        if (!this.lastActivity()) this.markActive(true);
        this.watch(onIdle);
        return true;
    }

    /**
     * The warning's "stay signed in". Input does not count while the warning
     * is open, so moving the mouse past it cannot dismiss it unread.
     */
    stayActive(): void {
        if (this._secondsLeft() === null) return;
        this.markActive(true);
        this._secondsLeft.set(null);
    }

    stop(): void {
        this.ending = false;
        this._secondsLeft.set(null);
        if (!this.onIdle) return;
        this.onIdle = null;
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
            this.checkTimer = null;
        }
        ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, this.onActivity, true));
        document.removeEventListener('visibilitychange', this.onVisibility);
    }

    ngOnDestroy(): void {
        this.stop();
    }

    private watch(onIdle: () => void): void {
        const watching = !!this.onIdle;
        this.onIdle = onIdle;
        if (watching) return;

        // Capture, so a scroll inside a panel counts as well as one on the page.
        ACTIVITY_EVENTS.forEach((e) =>
            window.addEventListener(e, this.onActivity, { capture: true, passive: true }),
        );
        document.addEventListener('visibilitychange', this.onVisibility);
        this.checkTimer = setInterval(this.check, CHECK_INTERVAL_MS);
    }

    private readonly onActivity = () => {
        if (this._secondsLeft() === null) this.markActive(false);
    };

    private readonly onVisibility = () => {
        if (document.visibilityState === 'visible') this.check();
    };

    private readonly check = () => {
        const left = this.config.timeoutMs - this.idleFor();
        if (left > 0) {
            this._secondsLeft.set(left <= this.config.warningMs ? Math.ceil(left / 1000) : null);
            return;
        }
        const onIdle = this.onIdle;
        this.stop();
        this.ending = true;
        onIdle?.();
    };

    private markActive(force: boolean): void {
        const now = Date.now();
        if (!force && now - this.lastWrite < WRITE_THROTTLE_MS) return;
        this.lastWrite = now;
        StorageUtils.setLocal(LAST_ACTIVITY_KEY, now);
    }

    /** Latest input in any tab; 0 when none is recorded. */
    private lastActivity(): number {
        return Math.max(StorageUtils.getLocal<number>(LAST_ACTIVITY_KEY) ?? 0, this.lastWrite);
    }

    /** No record reads as active now. */
    private idleFor(): number {
        const last = this.lastActivity();
        return last ? Date.now() - last : 0;
    }
}
