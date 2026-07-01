const MAX_STORED_CONTENT_LENGTH = 1000;

/**
 * Sanitize user-generated text before persisting.
 * React escapes on render; we strip angle brackets to reduce stored XSS risk.
 */
export function sanitizeStoredContent(
    content: string,
    maxLength: number = MAX_STORED_CONTENT_LENGTH
): string {
    return content
        .toString()
        .slice(0, maxLength)
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .trim();
}
