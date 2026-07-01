import Image from "next/image";
import MarketingPageShell from "@/components/MarketingPageShell";
import { UNIVERSITIES, universityIconSrc } from "@/lib/universities";

export default function UniversitiesPage() {
    return (
        <MarketingPageShell backHref="/signup" backLabel="Back to sign up" showFooter={false}>
            <div className="text-center mb-10">
                <h1 className="text-3xl font-bold text-cream tracking-tight">
                    Available at these universities
                </h1>
                <p className="text-cream-muted mt-3 text-sm max-w-lg mx-auto">
                    FloatDate is available to students with a supported university email
                    from one of the schools below. Sign up with your school email to join
                    your campus pool for weekly matches and Float Live.
                </p>
            </div>

            <ul className="space-y-8">
                {UNIVERSITIES.map((uni) => (
                    <li
                        key={uni.name}
                        className="glass-panel rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center gap-6"
                    >
                        <div className="relative w-full sm:w-40 h-24 shrink-0 glass-input rounded-xl overflow-hidden flex items-center justify-center">
                            <Image
                                src={universityIconSrc(uni.image)}
                                alt=""
                                width={160}
                                height={96}
                                unoptimized
                                className="object-contain max-h-20 w-auto"
                            />
                        </div>
                        <div>
                            <p className="text-lg font-semibold text-cream">{uni.name}</p>
                            <p className="text-sm text-cream-muted mt-1">
                                Register with @{uni.domain}
                            </p>
                        </div>
                    </li>
                ))}
            </ul>

            <p className="text-center text-xs text-cream-faint mt-10">
                List subject to change. Supported domains are verified at sign up.
            </p>
        </MarketingPageShell>
    );
}
