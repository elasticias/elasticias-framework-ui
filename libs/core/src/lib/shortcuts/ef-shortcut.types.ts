/**
 * A single keyboard-shortcut registration.
 *
 * `keys` uses a small normalised syntax: lowercase modifier tokens joined
 * with `+`, in any order, for example `'mod+d'`, `'shift+/'`, `'e'`, `'enter'`.
 * `mod` is the one platform-aware token: it means Command on macOS and
 * Control everywhere else. Never register a literal `'meta'` or `'ctrl'`
 * to mean "the primary modifier". That is what `mod` is for.
 */
export interface EfShortcut {
    /** Stable identifier. Unique per registration. Two components each
     *  registering their own instance of "the same" shortcut (e.g. one per
     *  row of a table) use distinct ids so neither's disposer removes the
     *  other's entry. */
    id: string;

    /** The key combination, in the normalised syntax described above. */
    keys: string;

    /** Translation key for the human-readable label shown in the
     *  shortcuts overlay. */
    labelKey: string;

    /** Translation key for the group heading the overlay files this
     *  shortcut under (e.g. `'shortcut_group_row_actions'`). */
    group: string;

    /** Runs when the keys match and `when` (if given) allows it. */
    handler: () => void;

    /**
     * Optional guard. When present, the shortcut is registered, and
     * listed in the overlay, but its handler only runs while this
     * returns `true`. This is how a row-scoped shortcut (e.g. "press E
     * to edit this row") stays inert except while that row's menu is
     * open, without registering and unregistering on every open/close.
     */
    when?: () => boolean;
}

/** One heading in the shortcuts overlay, with the entries filed under it. */
export interface EfShortcutGroup {
    /** Translation key for the group heading. */
    group: string;
    shortcuts: EfShortcut[];
}
