/** A product as the picker shows it. The caller maps its own DTO to this. */
export interface EfProductPickerItem {
    id: string;
    /** Internal reference, shown in a mono column. */
    reference?: string;
    title: string;
    /** Public image url, displayed as given (it comes from the backend). */
    thumbnailUrl?: string;
    /** One muted line of context ("Femme - publie"), already translated. */
    meta?: string;
    /** Shown but not pickable, for a product that is already in. */
    disabled?: boolean;
}

/** What the picker asks the caller's search function for. */
export interface EfProductPickerQuery {
    text: string;
    pageNumber: number;
    pageSize: number;
}
