function parseAdminEmails(raw: string | undefined): string[] {
    return (raw ?? "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
}

/** Server-side admin allowlist from ADMIN_EMAILS. */
export function getAdminEmails(): string[] {
    return parseAdminEmails(process.env.ADMIN_EMAILS);
}

/** Client-accessible mirror of ADMIN_EMAILS for UI checks (signup form, etc.). */
export function getClientAdminEmails(): string[] {
    return parseAdminEmails(process.env.NEXT_PUBLIC_ADMIN_EMAILS);
}

export function isAdminEmail(email: string): boolean {
    const normalized = email.toLowerCase();
    const emails = new Set([...getAdminEmails(), ...getClientAdminEmails()]);
    return emails.has(normalized);
}

/** Client-side admin email check (reads NEXT_PUBLIC_ADMIN_EMAILS only). */
export function isAdminEmailClient(email: string): boolean {
    return getClientAdminEmails().includes(email.toLowerCase());
}
