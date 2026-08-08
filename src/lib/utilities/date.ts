/**
 * French date formatting helpers.
 *
 * Real timestamps (`createdAt`, `publishedAt`) are always ISO strings. In
 * universe dates may be free text such as `Juin 2043`, so every helper falls
 * back to returning the raw value untouched.
 *
 * @author Claude
 */

const LONG_DATE = new Intl.DateTimeFormat( "fr-FR", { day: "numeric", month: "long", year: "numeric" } );
const SHORT_DATE = new Intl.DateTimeFormat( "fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" } );
const TIME = new Intl.DateTimeFormat( "fr-FR", { hour: "2-digit", minute: "2-digit" } );
const RELATIVE = new Intl.RelativeTimeFormat( "fr-FR", { numeric: "auto" } );

/** Sort key used for entries whose in universe date cannot be parsed. */
const UNDATED_SORT_KEY = Number.MAX_SAFE_INTEGER;

/** First four digit run of a free text date, which we read as its year. */
const YEAR = /(\d{4})/;

/** Leading `2043`, `2043-06` or `2043-06-12` of an otherwise free text date. */
const ISO_DATE_PREFIX = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/;

/**
 * Parses a value into a Date, or null when it is not a usable date.
 *
 * @param value ISO string or free text.
 * @returns A valid Date, or null.
 * @author Claude
 */
const toDate = ( value: string | null | undefined ): Date | null =>
{
    if ( !value )
    {
        return null;
    }

    const parsed = new Date( value );
    return Number.isNaN( parsed.getTime() ) ? null : parsed;
};

/**
 * Formats a date as `12 juin 2043`.
 *
 * @param value ISO string or free text.
 * @returns The formatted date, or the raw value when unparsable.
 * @author Claude
 */
export const formatLongDate = ( value: string | null | undefined ): string =>
{
    const date = toDate( value );
    return date ? LONG_DATE.format( date ) : ( value ?? "" );
};

/**
 * Formats a date as `12/06/2043`.
 *
 * @param value ISO string or free text.
 * @returns The formatted date, or the raw value when unparsable.
 * @author Claude
 */
export const formatShortDate = ( value: string | null | undefined ): string =>
{
    const date = toDate( value );
    return date ? SHORT_DATE.format( date ) : ( value ?? "" );
};

/**
 * Formats the time part of a timestamp as `14:05`.
 *
 * @param value ISO string.
 * @returns The formatted time, or an empty string.
 * @author Claude
 */
export const formatTime = ( value: string | null | undefined ): string =>
{
    const date = toDate( value );
    return date ? TIME.format( date ) : "";
};

/**
 * Formats a timestamp as `12 juin 2043 à 14:05`.
 *
 * @param value ISO string.
 * @returns The formatted date and time, or the raw value.
 * @author Claude
 */
export const formatDateTime = ( value: string | null | undefined ): string =>
{
    const date = toDate( value );
    return date ? `${ LONG_DATE.format( date ) } à ${ TIME.format( date ) }` : ( value ?? "" );
};

/**
 * Expresses how long ago a timestamp happened, as `il y a 3 heures`.
 *
 * @param value ISO string.
 * @param now Reference timestamp in milliseconds, defaults to the current time.
 * @returns A relative expression, or an empty string when unparsable.
 * @author Claude
 */
export const relativeTime = ( value: string | null | undefined, now: number = Date.now() ): string =>
{
    const date = toDate( value );
    if ( !date )
    {
        return "";
    }

    const seconds = Math.round( ( date.getTime() - now ) / 1000 );
    const absolute = Math.abs( seconds );

    if ( absolute < 60 )
    {
        return "à l'instant";
    }
    if ( absolute < 3600 )
    {
        return RELATIVE.format( Math.round( seconds / 60 ), "minute" );
    }
    if ( absolute < 86400 )
    {
        return RELATIVE.format( Math.round( seconds / 3600 ), "hour" );
    }
    if ( absolute < 2592000 )
    {
        return RELATIVE.format( Math.round( seconds / 86400 ), "day" );
    }
    if ( absolute < 31536000 )
    {
        return RELATIVE.format( Math.round( seconds / 2592000 ), "month" );
    }

    return RELATIVE.format( Math.round( seconds / 31536000 ), "year" );
};

/**
 * Converts an ISO timestamp into the value of a `datetime-local` input.
 *
 * The input expects local time while the dataset stores UTC, so the offset has
 * to be applied rather than the string simply truncated.
 *
 * @param value ISO timestamp.
 * @returns A `YYYY-MM-DDTHH:mm` string, empty when unparsable.
 * @author Claude
 */
export const toDateTimeInput = ( value: string | null | undefined ): string =>
{
    const date = toDate( value );
    if ( !date )
    {
        return "";
    }

    const pad = ( part: number ): string => String( part ).padStart( 2, "0" );

    return (
        `${ date.getFullYear() }-${ pad( date.getMonth() + 1 ) }-${ pad( date.getDate() ) }`
        + `T${ pad( date.getHours() ) }:${ pad( date.getMinutes() ) }`
    );
};

/**
 * Converts the value of a `datetime-local` input back into an ISO timestamp.
 *
 * @param value Local date and time, as produced by the input.
 * @returns An ISO timestamp, defaulting to now when the value is empty.
 * @author Claude
 */
export const fromDateTimeInput = ( value: string ): string =>
{
    const date = value ? new Date( value ) : new Date();
    return Number.isNaN( date.getTime() ) ? new Date().toISOString() : date.toISOString();
};

/**
 * Extracts the year of an in universe date, even from free text.
 *
 * @param value ISO string or text containing a four digit year.
 * @returns The year, or null when none is found.
 * @author Claude
 */
export const extractYear = ( value: string | null | undefined ): number | null =>
{
    if ( !value )
    {
        return null;
    }

    const match = YEAR.exec( value );
    return match ? Number( match[ 1 ] ) : null;
};

/**
 * Builds a numeric sort key from an in universe date.
 *
 * Fully ISO dates sort by day, partial dates by the coarsest known unit, and
 * undated values are pushed to the end.
 *
 * @param value ISO string or free text.
 * @returns A comparable number.
 * @author Claude
 */
export const timelineSortKey = ( value: string | null | undefined ): number =>
{
    if ( !value )
    {
        return UNDATED_SORT_KEY;
    }

    const iso = ISO_DATE_PREFIX.exec( value );
    if ( iso )
    {
        const [ , year, month = "00", day = "00" ] = iso;
        return Number( `${ year }${ month }${ day }` );
    }

    const year = extractYear( value );
    return year === null ? UNDATED_SORT_KEY : Number( `${ year }0000` );
};

/**
 * Formats an in universe date for display, keeping free text as written.
 *
 * @param value ISO string or free text.
 * @returns A readable date.
 * @author Claude
 */
export const formatUniverseDate = ( value: string | null | undefined ): string =>
{
    if ( !value )
    {
        return "";
    }

    if ( /^\d{4}$/.test( value ) )
    {
        return value;
    }
    if ( /^\d{4}-\d{2}$/.test( value ) )
    {
        const date = toDate( `${ value }-01` );
        return date ? new Intl.DateTimeFormat( "fr-FR", { month: "long", year: "numeric" } ).format( date ) : value;
    }

    return formatLongDate( value );
};
