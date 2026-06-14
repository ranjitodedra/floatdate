export type VerificationStatus = "approved" | "pending" | "rejected";
export type VerificationMethod = "email_domain" | "document";

export const VERIFICATION_STATUS = {
    APPROVED: "approved",
    PENDING: "pending",
    REJECTED: "rejected",
} as const;

export const VERIFICATION_METHOD = {
    EMAIL_DOMAIN: "email_domain",
    DOCUMENT: "document",
} as const;

export const SUPPORT_EMAIL = "support@floatdate.com";
