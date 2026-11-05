/**
 * Images imported from a file, reduced and written out as base64 WebP.
 *
 * Browser only: decoding and encoding go through a canvas.
 *
 * @author Claude
 */

/** Separator between the header of a data url and its base64 payload. */
const PAYLOAD_SEPARATOR = ",";

/** The head of a data url carrying an image in base64, whatever its format. */
const IMAGE_DATA_HEAD = /^data:image\/[\w.+-]+;base64,/i;

/**
 * Base64 alone, without the head of a data url, long enough to be a file
 * rather than a word: the shortest image worth pasting is far past it.
 */
const BARE_BASE64 = /^[A-Za-z0-9+/]{64,}={0,2}$/;

/** Whitespace a copied base64 string often carries, line breaks included. */
const BASE64_SPACING = /\s+/g;

/** Base64 writes three bytes as four characters. */
const BASE64_RATIO = 3 / 4;

/** A decoded image, with the dimensions it will be stored at. */
export interface DecodedImage {
    bitmap: ImageBitmap;
    width: number;
    height: number;
}

/**
 * Decodes a file into an image, and works out the size it will be stored at.
 *
 * @param file File chosen by the reader, or an image pasted as base64.
 * @param maxSide Longest side the stored image may keep, in pixels.
 * @returns The decoded image and its reduced dimensions.
 * @throws When the file is not an image the browser can decode.
 * @author Claude
 */
export const decodeImage = async ( file: Blob, maxSide: number ): Promise<DecodedImage> =>
{
    const bitmap = await createImageBitmap( file );
    const scale = Math.min( 1, maxSide / Math.max( bitmap.width, bitmap.height ) );

    return {
        bitmap,
        width: Math.max( 1, Math.round( bitmap.width * scale ) ),
        height: Math.max( 1, Math.round( bitmap.height * scale ) )
    };
};

/**
 * Encodes a decoded image as a base64 WebP data url.
 *
 * A browser that cannot encode WebP hands back a PNG instead, which the dataset
 * accepts just the same.
 *
 * @param image Image returned by `decodeImage`.
 * @param quality WebP quality, between 0 and 1.
 * @returns The data url.
 * @throws When the browser gives no drawing context.
 * @author Claude
 */
export const encodeImage = ( image: DecodedImage, quality: number ): string =>
{
    const canvas = document.createElement( "canvas" );
    canvas.width = image.width;
    canvas.height = image.height;

    const context = canvas.getContext( "2d" );

    if ( !context )
    {
        throw new Error( "No 2d context to encode the image with." );
    }

    context.drawImage( image.bitmap, 0, 0, image.width, image.height );

    return canvas.toDataURL( "image/webp", quality );
};

/**
 * Tells whether an image source is an imported file rather than an address.
 *
 * @param src Image source.
 * @returns True for a data url.
 * @author Claude
 */
export const isImportedImage = ( src: string ): boolean => src.startsWith( "data:" );

/**
 * Measures the bytes an imported image stands for.
 *
 * @param dataUrl A base64 data url.
 * @returns The size of the decoded payload, in bytes.
 * @author Claude
 */
export const imageSize = ( dataUrl: string ): number =>
{
    const payload = dataUrl.length - dataUrl.indexOf( PAYLOAD_SEPARATOR ) - 1;

    return Math.round( payload * BASE64_RATIO );
};

/**
 * Recognises an image pasted as base64 where an address was expected.
 *
 * A data url with an image head is taken as it is; bare base64 gets a neutral
 * head, the decoder telling the format from the bytes themselves.
 *
 * @param text What was typed or pasted.
 * @returns The data url to import, or `null` when the text is no base64 image.
 * @author Claude
 */
export const pastedImage = ( text: string ): string | null =>
{
    const compact = text.replaceAll( BASE64_SPACING, "" );

    if ( IMAGE_DATA_HEAD.test( compact ) )
    {
        return compact;
    }

    return BARE_BASE64.test( compact ) ? `data:application/octet-stream;base64,${ compact }` : null;
};

/**
 * Turns a data url back into the bytes it holds, for the import dialog.
 *
 * @param dataUrl A base64 data url.
 * @returns Its bytes, or an empty blob when the url cannot be read, which the
 * dialog then reports as an unreadable image.
 * @author Claude
 */
export const dataUrlBlob = async ( dataUrl: string ): Promise<Blob> =>
{
    try
    {
        const response = await fetch( dataUrl );

        return await response.blob();
    }
    catch
    {
        return new Blob();
    }
};
