import Image from "next/image";
import Link from "next/link";

const UNIVERSITIES = [
    {
        name: "Wilfrid Laurier University",
        domain: "mylaurier.ca",
        image: "/assets/Universities-icons/laurier.png",
    },
    {
        name: "University of Waterloo",
        domain: "uwaterloo.ca",
        image: "/assets/Universities-icons/waterloo.avif",
    },
    {
        name: "University of Toronto",
        domain: "mail.utoronto.ca",
        image: "/assets/Universities-icons/uoft.jpg",
    },
    {
        name: "Western University",
        domain: "uwo.ca",
        image: "/assets/Universities-icons/western.png",
    },
    {
        name: "McMaster University",
        domain: "mcmaster.ca",
        image: "/assets/Universities-icons/mcmaster.png",
    },
    {
        name: "University of Ottawa",
        domain: "uottawa.ca",
        image: "/assets/Universities-icons/uottawa.png",
    },
    {
        name: "Queen's University",
        domain: "queensu.ca",
        image: "/assets/Universities-icons/queens.jpg",
    },
] as const;

export default function UniversitiesPage() {
    return (
        <div className="min-h-screen bg-zinc-50 px-4 py-12">
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">
                        Available at these universities
                    </h1>
                    <p className="text-zinc-500 mt-3 text-sm max-w-lg mx-auto">
                        FloatDate is available to students with a supported university email
                        from one of the schools below. Sign up with your school email to join
                        your campus pool for weekly matches and Float Live.
                    </p>
                    <Link
                        href="/signup"
                        className="inline-block mt-6 text-sm font-medium text-zinc-900 underline hover:text-zinc-600 transition"
                    >
                        ← Back to sign up
                    </Link>
                </div>

                <ul className="space-y-8">
                    {UNIVERSITIES.map((uni) => (
                        <li
                            key={uni.name}
                            className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center gap-6"
                        >
                            <div className="relative w-full sm:w-40 h-24 shrink-0 bg-zinc-50 rounded-xl overflow-hidden flex items-center justify-center border border-zinc-100">
                                <Image
                                    src={uni.image}
                                    alt=""
                                    width={160}
                                    height={96}
                                    className="object-contain max-h-20 w-auto"
                                />
                            </div>
                            <div>
                                <p className="text-lg font-semibold text-zinc-900">{uni.name}</p>
                                <p className="text-sm text-zinc-400 mt-1">
                                    Register with @{uni.domain}
                                </p>
                            </div>
                        </li>
                    ))}
                </ul>

                <p className="text-center text-xs text-zinc-400 mt-10">
                    List subject to change. Supported domains are verified at sign up.
                </p>
            </div>
        </div>
    );
}
