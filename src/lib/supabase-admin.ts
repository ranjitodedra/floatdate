import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

export const VERIFICATION_DOCS_BUCKET = "verification-docs";
const MAX_DOC_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB
const SIGNED_URL_TTL_SECONDS = 60 * 15; // 15 minutes

let adminClient: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
    if (adminClient) return adminClient;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error(
            "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for storage operations"
        );
    }

    adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
    return adminClient;
}

const ALLOWED_IMAGE_TYPES = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
]);

function extensionForMime(mime: string): string {
    switch (mime) {
        case "image/jpeg":
        case "image/jpg":
            return "jpg";
        case "image/png":
            return "png";
        case "image/webp":
            return "webp";
        case "image/heic":
            return "heic";
        case "image/heif":
            return "heif";
        default:
            return "jpg";
    }
}

export function validateVerificationImage(file: File): string | null {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        return "Please upload an image file (JPEG, PNG, or WebP).";
    }
    if (file.size > MAX_DOC_SIZE_BYTES) {
        return "Image must be 8 MB or smaller.";
    }
    return null;
}

export async function uploadVerificationDoc(
    bytes: Buffer,
    mimeType: string
): Promise<string> {
    const supabase = getSupabaseAdmin();
    const ext = extensionForMime(mimeType);
    const path = `${randomUUID()}.${ext}`;

    const { error } = await supabase.storage
        .from(VERIFICATION_DOCS_BUCKET)
        .upload(path, bytes, {
            contentType: mimeType,
            upsert: false,
        });

    if (error) {
        throw new Error(`Failed to upload verification document: ${error.message}`);
    }

    return path;
}

export async function deleteVerificationDoc(path: string | null | undefined): Promise<void> {
    if (!path) return;

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.storage
        .from(VERIFICATION_DOCS_BUCKET)
        .remove([path]);

    if (error) {
        console.error(`Failed to delete verification document at ${path}:`, error.message);
    }
}

export async function createSignedDocUrl(
    path: string | null | undefined
): Promise<string | null> {
    if (!path) return null;

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage
        .from(VERIFICATION_DOCS_BUCKET)
        .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

    if (error) {
        console.error(`Failed to create signed URL for ${path}:`, error.message);
        return null;
    }

    return data.signedUrl;
}

export function isGmailAddress(email: string): boolean {
    const domain = email.toLowerCase().split("@")[1];
    return domain === "gmail.com";
}
