import { DEFAULT_CHARACTER_ENCODING } from "../constants";

// Returns true if the input is likely text, false if likely binary
export function isText(input: string | Buffer): boolean {
    let buf: Buffer;
    if (typeof input === 'string') {
        buf = Buffer.from(input, DEFAULT_CHARACTER_ENCODING);
    } else {
        buf = input;
    }

    // Empty buffers are considered text
    if (buf.length === 0) {
        return true;
    }

    // If the buffer contains null bytes, it's likely binary
    if (buf.includes(0)) {
        return false;
    }

    // For UTF-8 encoded text (including emoji and international characters),
    // convert to string first and check if there are non-printable characters
    const str = buf.toString(DEFAULT_CHARACTER_ENCODING);

    // Count the number of non-printable ASCII characters (excluding common whitespace)
    let nonPrintable = 0;
    const len = Math.min(str.length, 512); // Only check the first 512 characters for performance

    for (let i = 0; i < len; i++) {
        const charCode = str.charCodeAt(i);
        // Allow: tab (9), line feed (10), carriage return (13), printable ASCII (32-126)
        // Also allow all non-ASCII Unicode characters (charCode > 127)
        if (
            charCode !== 9 && charCode !== 10 && charCode !== 13 &&
            (charCode < 32 || (charCode > 126 && charCode < 128))
        ) {
            nonPrintable++;
        }
    }

    // If more than 10% of the checked characters are non-printable, consider it binary
    return nonPrintable / len < 0.1;
}
