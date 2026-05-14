import "dotenv/config";
import { existsSync } from "fs";
import { spawnSync } from "child_process";
import path from "path";

function resolvePgDump(): string {
    if (process.env.PG_DUMP && existsSync(process.env.PG_DUMP)) {
        return process.env.PG_DUMP;
    }
    if (process.platform === "win32") {
        for (const ver of ["18", "17", "16", "15"]) {
            const p = path.join(
                "C:\\Program Files\\PostgreSQL",
                ver,
                "bin",
                "pg_dump.exe",
            );
            if (existsSync(p)) return p;
        }
    }
    return "pg_dump";
}

function main() {
    const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
    if (!url?.trim()) {
        console.error(
            "Missing DIRECT_URL or DATABASE_URL. Ensure .env exists in the project root.",
        );
        process.exit(1);
    }

    if (url.includes("6543") || /[?&]pgbouncer=true/i.test(url)) {
        console.warn(
            "Warning: URL looks like a Supabase pooler. For pg_dump, prefer DIRECT_URL (port 5432) from Supabase → Database.",
        );
    }

    const outArg = process.argv[2];
    const outFile = outArg
        ? path.resolve(process.cwd(), outArg)
        : path.join(process.cwd(), "floatdate_backup.dump");

    const pgDump = resolvePgDump();
    const result = spawnSync(
        pgDump,
        [url, "-Fc", "-f", outFile],
        { stdio: "inherit" },
    );

    if (result.status !== 0) {
        if (result.error && "code" in result.error && result.error.code === "ENOENT") {
            console.error(
                `Could not run pg_dump (${pgDump}). Install PostgreSQL client tools or set PG_DUMP to the full path of pg_dump.exe`,
            );
        }
        process.exit(result.status ?? 1);
    }

    console.log(`Wrote ${outFile}`);
}

main();
