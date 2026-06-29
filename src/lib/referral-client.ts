export const REF_STORAGE_KEY = "float_ref";

interface StoredRef {
    code: string;
    exp: number;
}

const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export function storeRef(code: string): void {
    if (typeof window === "undefined") return;
    const normalized = code.trim().toUpperCase();
    if (!normalized) return;
    const stored: StoredRef = {
        code: normalized,
        exp: Date.now() + EXPIRY_MS,
    };
    localStorage.setItem(REF_STORAGE_KEY, JSON.stringify(stored));
}

export function readStoredRef(): string | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem(REF_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as StoredRef;
        if (!parsed.code || !parsed.exp || Date.now() > parsed.exp) {
            localStorage.removeItem(REF_STORAGE_KEY);
            return null;
        }
        return parsed.code;
    } catch {
        localStorage.removeItem(REF_STORAGE_KEY);
        return null;
    }
}

export function clearStoredRef(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(REF_STORAGE_KEY);
}
