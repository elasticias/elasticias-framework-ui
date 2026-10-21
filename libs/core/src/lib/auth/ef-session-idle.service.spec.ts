import { TestBed } from '@angular/core/testing';
import { StorageUtils } from '@elasticias/utils';
import { EF_SESSION_IDLE_CONFIG, EfSessionIdleService } from './ef-session-idle.service';

const MIN = 60_000;
const KEY = 'SESSION_LAST_ACTIVITY';

/**
 * Two services stand for two tabs: they share localStorage, which is how
 * tabs share the idle clock. Fake timers move Date.now() with the 1 s check
 * interval, so `advance` is plain elapsed time.
 */
describe('EfSessionIdleService', () => {
    let now: number;

    const tab = () => TestBed.runInInjectionContext(() => new EfSessionIdleService());
    const advance = (ms: number) => vi.advanceTimersByTime(ms);
    const input = () => window.dispatchEvent(new Event('pointerdown'));

    beforeEach(() => {
        vi.useFakeTimers();
        now = new Date('2026-10-20T09:00:00Z').getTime();
        vi.setSystemTime(now);
        localStorage.clear();
        TestBed.configureTestingModule({
            providers: [{ provide: EF_SESSION_IDLE_CONFIG, useValue: { timeoutMs: 30 * MIN, warningMs: MIN } }],
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('signs out 30 minutes after the last input, once', () => {
        const onIdle = vi.fn();
        const s = tab();
        s.start(onIdle);

        advance(29 * MIN + 58_000);
        expect(onIdle).not.toHaveBeenCalled();

        advance(2_000);
        expect(onIdle).toHaveBeenCalledTimes(1);

        advance(MIN);
        expect(onIdle).toHaveBeenCalledTimes(1);
        s.stop();
    });

    it('keeps every tab alive while someone works in one of them', () => {
        const a = vi.fn();
        const b = vi.fn();
        const tabA = tab();
        const tabB = tab();
        tabA.start(a);
        tabB.resume(b);

        advance(20 * MIN);
        input();
        advance(20 * MIN);
        expect(a).not.toHaveBeenCalled();
        expect(b).not.toHaveBeenCalled();

        advance(11 * MIN);
        expect(a).toHaveBeenCalledTimes(1);
        expect(b).toHaveBeenCalledTimes(1);
    });

    it('counts down the last minute and closes the warning in every tab on stay', () => {
        const tabA = tab();
        const tabB = tab();
        tabA.start(vi.fn());
        tabB.resume(vi.fn());

        advance(28 * MIN);
        expect(tabA.secondsLeft()).toBeNull();

        advance(MIN + 15_000);
        expect(tabA.secondsLeft()).toBe(45);
        expect(tabB.secondsLeft()).toBe(45);

        tabB.stayActive();
        advance(1000);
        expect(tabA.secondsLeft()).toBeNull();
        expect(tabB.secondsLeft()).toBeNull();
        tabA.stop();
        tabB.stop();
    });

    it('does not let input dismiss an open warning', () => {
        const onIdle = vi.fn();
        const s = tab();
        s.start(onIdle);

        advance(29 * MIN + 15_000);
        input();
        advance(1000);
        expect(s.secondsLeft()).toBe(44);

        advance(44_000);
        expect(onIdle).toHaveBeenCalledTimes(1);
        expect(s.secondsLeft()).toBeNull();
    });

    it('ends a session restored after a long absence before it is used', () => {
        StorageUtils.setLocal(KEY, now - 2 * 60 * MIN);
        const onIdle = vi.fn();

        expect(tab().resume(onIdle)).toBe(false);
        expect(onIdle).toHaveBeenCalledTimes(1);
    });

    it('fires once when both route guards resume the same stale session', () => {
        StorageUtils.setLocal(KEY, now - 2 * 60 * MIN);
        const onIdle = vi.fn();
        const s = tab();

        expect(s.resume(onIdle)).toBe(false);
        expect(s.resume(onIdle)).toBe(false);
        expect(onIdle).toHaveBeenCalledTimes(1);
    });

    it('does not fire again for a guard run during the sign-out itself', () => {
        const onIdle = vi.fn();
        const s = tab();
        s.start(onIdle);
        advance(31 * MIN);

        expect(s.resume(onIdle)).toBe(false);
        expect(onIdle).toHaveBeenCalledTimes(1);
    });

    it('restarts the clock on a fresh sign-in over a stale record', () => {
        StorageUtils.setLocal(KEY, now - 2 * 60 * MIN);
        const onIdle = vi.fn();
        const s = tab();
        s.start(onIdle);

        advance(10 * MIN);
        expect(onIdle).not.toHaveBeenCalled();
        s.stop();
    });

    it('still times out a restored session with no recorded input', () => {
        const onIdle = vi.fn();
        tab().resume(onIdle);

        advance(31 * MIN);
        expect(onIdle).toHaveBeenCalledTimes(1);
    });

    it('stops listening once stopped', () => {
        const onIdle = vi.fn();
        const s = tab();
        s.start(onIdle);
        s.stop();

        advance(31 * MIN);
        expect(onIdle).not.toHaveBeenCalled();
    });
});
