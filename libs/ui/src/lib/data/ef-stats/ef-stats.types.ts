/**
 * One row in the stats stack — a label/value pair with optional unit
 * and an optional `big` flag that swaps the value to a Bricolage
 * display number (~22px).
 */
export interface EfStatsRow {
    labelKey?: string;
    label?: string;

    value: string | number;

    /** Small grey unit shown right of the value (e.g. `'MAD'`, `'cmds'`). */
    unit?: string;

    /** Render the value as a Bricolage display number. Used for the
     *  one or two headline metrics in a sidebar stats card. */
    big?: boolean;
}
