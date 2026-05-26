import { prisma } from "./db";
import blossom from "edmonds-blossom";
import {
    generateMatchExplanationV2,
    isMatchReasoningV2Enabled,
} from "./match-reasoning-v2";
import { serializeMatchExplanationV2 } from "./match-explanation";

// ---------- Types ----------
type DimensionVec = Record<string, number>;

interface UserForMatching {
    id: string;
    gender: string;
    genderPref: string;
    city: string;
    universityId: string;
    createdAt: Date;
}

interface Answer {
    questionId: string;
    value: unknown;
}

// ---------- Constants ----------
const DIMENSION_WEIGHTS: DimensionVec = {
    attachment: 2.0,
    values: 2.0,
    lifestyle: 1.5,
    communication: 1.5,
    interests: 1.0,
};

const DIMENSIONS = Object.keys(DIMENSION_WEIGHTS);

export const MIN_SIMILARITY_THRESHOLD = 0.35;
const JITTER_AMOUNT = 0.02;

const EXPLANATION_LABELS: Record<string, string> = {
    attachment: "similar emotional openness",
    values: "aligned core values",
    lifestyle: "compatible lifestyle preferences",
    communication: "matching communication styles",
    interests: "shared interests",
};

// ---------- Reason Generator System ----------
// Each generator receives both users' answers and produces a tailored reason
// or null if that question isn't a useful discriminator for this pair.

type ReasonCategory = "shared" | "complementary" | "behavioral" | "ranking";

interface GeneratedReason {
    reason: string;
    dimension: string;
    score: number;
    category: ReasonCategory;
}

type ReasonGenerator = (
    answerA: unknown,
    answerB: unknown,
    options: string[]
) => GeneratedReason | null;

// Helper: get normalized value for likert/binary
function norm(value: unknown, type: string, options: string[]): number {
    return normalizeAnswer(value, type, options);
}

// Helper: find overlapping top-N items in two rankings
function topOverlap(arrA: string[], arrB: string[], n: number): string[] {
    const topA = new Set(arrA.slice(0, n));
    return arrB.slice(0, n).filter((item) => topA.has(item));
}

// Helper: short label (strip trailing parentheticals and keep it punchy)
function shortLabel(s: string): string {
    return s.replace(/\s*\(.*\)$/, "").replace(/ & /g, " and ");
}

// ---------- Question-Specific Generators ----------
const REASON_GENERATORS: Record<string, { gen: ReasonGenerator; dim: string }> = {
    // ── Big Five ─────────────────────────────────────────
    bf_01: {
        dim: "attachment",
        gen: (a, b, opts) => {
            const nA = norm(a, "likert", opts), nB = norm(b, "likert", opts);
            const close = 1 - Math.abs(nA - nB);
            if (close > 0.7 && nA < 0.4) return { reason: "Neither of you sweats the small stuff. you don't spiral over relationship what-ifs", dimension: "attachment", score: close, category: "shared" };
            if (close > 0.7 && nA > 0.6) return { reason: "You're both emotionally tuned in. you actually notice when something feels off", dimension: "attachment", score: close, category: "shared" };
            return null;
        },
    },
    bf_02: {
        dim: "lifestyle",
        gen: (a, b, opts) => {
            const nA = norm(a, "likert", opts), nB = norm(b, "likert", opts);
            const close = 1 - Math.abs(nA - nB);
            if (close > 0.7 && nA > 0.6) return { reason: "You both follow through on commitments. if you say you'll be there, you mean it", dimension: "lifestyle", score: close, category: "shared" };
            if (close > 0.7 && nA < 0.4) return { reason: "Neither of you is rigid about schedules. you both leave room for life to happen", dimension: "lifestyle", score: close, category: "shared" };
            if (close < 0.3) return { reason: "One of you loves a plan, the other rides the wave. you'll balance each other out", dimension: "lifestyle", score: 0.6, category: "complementary" };
            return null;
        },
    },
    bf_03_rev: {
        dim: "communication",
        gen: (a, b, opts) => {
            const nA = norm(a, "likert", opts), nB = norm(b, "likert", opts);
            const close = 1 - Math.abs(nA - nB);
            if (close > 0.7 && nA < 0.4) return { reason: "You both let things go once they're resolved. no scorekeeping", dimension: "communication", score: close, category: "shared" };
            return null;
        },
    },
    bf_04: {
        dim: "interests",
        gen: (a, b, opts) => {
            const nA = norm(a, "likert", opts), nB = norm(b, "likert", opts);
            const close = 1 - Math.abs(nA - nB);
            if (close > 0.7 && nA > 0.6) return { reason: "You're both the type to light up a room. energy won't be an issue", dimension: "interests", score: close, category: "shared" };
            if (close > 0.7 && nA < 0.4) return { reason: "You both prefer the background over the spotlight. cozy > loud", dimension: "interests", score: close, category: "shared" };
            if (close < 0.3) return { reason: "One of you owns the room, the other observes it. you'll see the world from two angles", dimension: "interests", score: 0.55, category: "complementary" };
            return null;
        },
    },
    bf_05: {
        dim: "interests",
        gen: (a, b, opts) => {
            const nA = norm(a, "likert", opts), nB = norm(b, "likert", opts);
            const close = 1 - Math.abs(nA - nB);
            if (close > 0.7 && nA > 0.6) return { reason: "You're both deep thinkers. expect 2 AM conversations about the meaning of everything", dimension: "interests", score: close, category: "shared" };
            return null;
        },
    },
    bf_06_scen: {
        dim: "attachment",
        gen: (a, b) => {
            if (typeof a === "string" && a === b) return { reason: "When a partner runs late, you'd both stay calm. no panic spirals", dimension: "attachment", score: 1.0, category: "shared" };
            return null;
        },
    },

    // ── Attachment ────────────────────────────────────────
    att_01: {
        dim: "attachment",
        gen: (a, b, opts) => {
            const nA = norm(a, "likert", opts), nB = norm(b, "likert", opts);
            const close = 1 - Math.abs(nA - nB);
            if (close > 0.7 && nA < 0.4) return { reason: "Neither of you needs constant reassurance. you trust without asking", dimension: "attachment", score: close, category: "shared" };
            return null;
        },
    },
    att_02: {
        dim: "attachment",
        gen: (a, b, opts) => {
            const nA = norm(a, "likert", opts), nB = norm(b, "likert", opts);
            const close = 1 - Math.abs(nA - nB);
            if (close > 0.7 && nA < 0.4) return { reason: "You're both comfortable being vulnerable. walls aren't your thing", dimension: "attachment", score: close, category: "shared" };
            return null;
        },
    },
    att_03: {
        dim: "attachment",
        gen: (a, b, opts) => {
            const nA = norm(a, "likert", opts), nB = norm(b, "likert", opts);
            const close = 1 - Math.abs(nA - nB);
            if (close > 0.7 && nA > 0.6) return { reason: "Getting close to someone comes naturally to both of you", dimension: "attachment", score: close, category: "shared" };
            return null;
        },
    },
    att_04_rev: {
        dim: "attachment",
        gen: (a, b, opts) => {
            const nA = norm(a, "likert", opts), nB = norm(b, "likert", opts);
            const close = 1 - Math.abs(nA - nB);
            if (close > 0.7 && nA > 0.6) return { reason: "You both feel secure in relationships. no one's watching the door", dimension: "attachment", score: close, category: "shared" };
            return null;
        },
    },
    att_05_beh: {
        dim: "attachment",
        gen: (a, b) => {
            if (typeof a === "string" && a === b) {
                if (a === "Yes") return { reason: "When stressed, you both need space to recharge before talking it out", dimension: "attachment", score: 1.0, category: "behavioral" };
                return { reason: "You both reach for each other when things get hard. comfort is a team sport", dimension: "attachment", score: 1.0, category: "behavioral" };
            }
            return null;
        },
    },
    att_06_scen: {
        dim: "attachment",
        gen: (a, b) => {
            if (typeof a === "string" && a === b) return { reason: "After a disagreement, you'd both give space without it turning into a crisis", dimension: "attachment", score: 1.0, category: "shared" };
            return null;
        },
    },

    // ── Conflict Resolution ──────────────────────────────
    conf_01: {
        dim: "communication",
        gen: (a, b) => {
            if (typeof a === "string" && a === b) {
                if (a === "Keep the peace") return { reason: "You both value peace over being right. fights stay short", dimension: "communication", score: 1.0, category: "shared" };
                return { reason: "You both care about getting to the truth, even if it's uncomfortable", dimension: "communication", score: 1.0, category: "shared" };
            }
            return null;
        },
    },
    conf_02_scen: {
        dim: "communication",
        gen: (a, b) => {
            if (typeof a === "string" && a === b) {
                if ((a as string).includes("Wait")) return { reason: "You'd both wait for the right moment to bring up money stuff. no ambushes", dimension: "communication", score: 1.0, category: "shared" };
                if ((a as string).includes("Directly") || (a as string).includes("immediately")) return { reason: "You're both direct when something's off. no festering resentment", dimension: "communication", score: 1.0, category: "shared" };
                return { reason: "You'd handle a surprise purchase the same way. no guessing games", dimension: "communication", score: 1.0, category: "shared" };
            }
            return null;
        },
    },
    conf_03_beh: {
        dim: "communication",
        gen: (a, b) => {
            if (typeof a === "string" && a === b) {
                if (a === "Yes") return { reason: "You both know when to step away from a heated moment. cool heads prevail", dimension: "communication", score: 1.0, category: "behavioral" };
                return { reason: "Neither of you walks out mid-argument. you both stay and work through it", dimension: "communication", score: 1.0, category: "behavioral" };
            }
            return null;
        },
    },
    conf_04_rev: {
        dim: "communication",
        gen: (a, b, opts) => {
            const nA = norm(a, "likert", opts), nB = norm(b, "likert", opts);
            const close = 1 - Math.abs(nA - nB);
            if (close > 0.7 && nA > 0.6) return { reason: "Once a fight is over, it's over for both of you. no lingering grudges", dimension: "communication", score: close, category: "shared" };
            return null;
        },
    },

    // ── Emotional Regulation ─────────────────────────────
    emo_01: {
        dim: "communication",
        gen: (a, b, opts) => {
            const nA = norm(a, "likert", opts), nB = norm(b, "likert", opts);
            const close = 1 - Math.abs(nA - nB);
            if (close > 0.7 && nA > 0.6) return { reason: "You both think before you speak when emotions run high", dimension: "communication", score: close, category: "shared" };
            return null;
        },
    },
    emo_02_beh: {
        dim: "communication",
        gen: (a, b) => {
            if (typeof a === "string" && a === b) {
                if (a === "No") return { reason: "Neither of you takes a bad day out on the people closest to you", dimension: "communication", score: 1.0, category: "behavioral" };
            }
            return null;
        },
    },
    emo_03_scen: {
        dim: "communication",
        gen: (a, b) => {
            if (typeof a === "string" && a === b) {
                if ((a as string).includes("deep breath")) return { reason: "Bad day? You'd both take a breath and ask for help. no silent treatment", dimension: "communication", score: 1.0, category: "shared" };
                return { reason: "A tough day at work wouldn't blow up your evening. you'd handle it the same way", dimension: "communication", score: 0.9, category: "shared" };
            }
            return null;
        },
    },
    emo_04: {
        dim: "communication",
        gen: (a, b, opts) => {
            const nA = norm(a, "likert", opts), nB = norm(b, "likert", opts);
            const close = 1 - Math.abs(nA - nB);
            if (close > 0.7 && nA > 0.6) return { reason: "You both bounce back fast. a bad moment doesn't ruin a good day", dimension: "communication", score: close, category: "shared" };
            return null;
        },
    },
    emo_05_rev: {
        dim: "communication",
        gen: (a, b, opts) => {
            const nA = norm(a, "likert", opts), nB = norm(b, "likert", opts);
            const close = 1 - Math.abs(nA - nB);
            if (close > 0.7 && nA < 0.4) return { reason: "You both feel grounded in your emotions. no rollercoasters", dimension: "communication", score: close, category: "shared" };
            return null;
        },
    },

    // ── Communication Style ──────────────────────────────
    comm_01: {
        dim: "communication",
        gen: (a, b) => {
            if (Array.isArray(a) && Array.isArray(b)) {
                const overlap = topOverlap(a as string[], b as string[], 2);
                if (overlap.length >= 1) {
                    const label = shortLabel(overlap[0]);
                    return { reason: `For tough conversations, you'd both reach for the same approach. ${label.toLowerCase()}`, dimension: "communication", score: 0.9, category: "ranking" };
                }
            }
            return null;
        },
    },
    comm_02_scen: {
        dim: "communication",
        gen: (a, b) => {
            if (typeof a === "string" && a === b) {
                if ((a as string).includes("Directly")) return { reason: "They also want someone who calls things out directly. no passive-aggressive hints", dimension: "communication", score: 1.0, category: "shared" };
                if ((a as string).includes("joke")) return { reason: "You'd both use humor to soften hard truths. same wavelength", dimension: "communication", score: 1.0, category: "shared" };
                return { reason: "You communicate annoyances the same way. fewer misunderstandings", dimension: "communication", score: 0.9, category: "shared" };
            }
            return null;
        },
    },
    comm_03_beh: {
        dim: "communication",
        gen: (a, b, opts) => {
            const nA = norm(a, "likert", opts), nB = norm(b, "likert", opts);
            const close = 1 - Math.abs(nA - nB);
            if (close > 0.7 && nA > 0.6) return { reason: "You both actually ask about each other's day and listen. not just nod along", dimension: "communication", score: close, category: "behavioral" };
            return null;
        },
    },
    comm_04_rev: {
        dim: "communication",
        gen: (a, b, opts) => {
            const nA = norm(a, "likert", opts), nB = norm(b, "likert", opts);
            const close = 1 - Math.abs(nA - nB);
            if (close > 0.7 && nA < 0.4) return { reason: "You're both comfortable saying what you need. no mind-reading required", dimension: "communication", score: close, category: "shared" };
            return null;
        },
    },

    // ── Core Values ──────────────────────────────────────
    val_02: {
        dim: "values",
        gen: (a, b) => {
            if (Array.isArray(a) && Array.isArray(b)) {
                const overlap = topOverlap(a as string[], b as string[], 2);
                if (overlap.length >= 2) {
                    return { reason: `"${shortLabel(overlap[0])}" and "${shortLabel(overlap[1])}" both made your top life priorities`, dimension: "values", score: 1.0, category: "ranking" };
                }
                if (overlap.length === 1) {
                    return { reason: `You both put "${shortLabel(overlap[0])}" near the top of what matters most right now`, dimension: "values", score: 0.85, category: "ranking" };
                }
            }
            return null;
        },
    },
    val_03_scen: {
        dim: "values",
        gen: (a, b) => {
            if (typeof a === "string" && a === b) {
                if ((a as string).includes("career")) return { reason: "You'd both chase the career move. ambition is a shared language", dimension: "values", score: 1.0, category: "shared" };
                if ((a as string).includes("family")) return { reason: "Family proximity matters to both of you. roots run deep", dimension: "values", score: 1.0, category: "shared" };
                return { reason: "You'd navigate the career-vs-family tradeoff the same way", dimension: "values", score: 0.9, category: "shared" };
            }
            return null;
        },
    },
    val_04_beh: {
        dim: "values",
        gen: (a, b) => {
            if (typeof a === "string" && a === b) {
                if (a === "Yes") return { reason: "You both show up for your community. service is part of who you are", dimension: "values", score: 1.0, category: "behavioral" };
            }
            return null;
        },
    },

    // ── Relationship Beliefs ─────────────────────────────
    bel_01: {
        dim: "values",
        gen: (a, b, opts) => {
            const nA = norm(a, "likert", opts), nB = norm(b, "likert", opts);
            const close = 1 - Math.abs(nA - nB);
            if (close > 0.7 && nA < 0.4) return { reason: "You both believe great relationships are built, not found. effort isn't a red flag", dimension: "values", score: close, category: "shared" };
            return null;
        },
    },
    bel_02: {
        dim: "values",
        gen: (a, b, opts) => {
            const nA = norm(a, "likert", opts), nB = norm(b, "likert", opts);
            const close = 1 - Math.abs(nA - nB);
            if (close > 0.7 && nA > 0.6) return { reason: "You both see relationships as something you grow, not something you stumble into", dimension: "values", score: close, category: "shared" };
            return null;
        },
    },
    bel_03_scen: {
        dim: "values",
        gen: (a, b) => {
            if (typeof a === "string" && a === b) {
                if ((a as string).includes("perfectly fine")) return { reason: "Different hobbies? No problem for either of you. space is healthy", dimension: "values", score: 1.0, category: "shared" };
                if ((a as string).includes("new shared")) return { reason: "If interests don't overlap, you'd both go find new ones together", dimension: "values", score: 1.0, category: "shared" };
                return { reason: "You see relationship bumps through the same lens", dimension: "values", score: 0.85, category: "shared" };
            }
            return null;
        },
    },
    bel_04_rev: {
        dim: "values",
        gen: (a, b, opts) => {
            const nA = norm(a, "likert", opts), nB = norm(b, "likert", opts);
            const close = 1 - Math.abs(nA - nB);
            if (close > 0.7 && nA < 0.4) return { reason: "Early effort doesn't scare either of you. you know good things take work", dimension: "values", score: close, category: "shared" };
            return null;
        },
    },

    // ── Long-term Goals ──────────────────────────────────
    goals_01_filter: {
        dim: "values",
        gen: (a, b) => {
            if (typeof a === "string" && a === b) return { reason: "You're aligned on the kids question. no surprises down the road", dimension: "values", score: 1.0, category: "shared" };
            return null;
        },
    },
    goals_02_filter: {
        dim: "values",
        gen: (a, b) => {
            if (typeof a === "string" && a === b) return { reason: "You're on the same page about where a relationship should go", dimension: "values", score: 1.0, category: "shared" };
            return null;
        },
    },
    goals_03_beh: {
        dim: "values",
        gen: (a, b) => {
            if (typeof a === "string" && a === b) {
                if (a === "Yes") return { reason: "You're both actively building toward a five-year goal. direction, not drift", dimension: "values", score: 1.0, category: "behavioral" };
            }
            return null;
        },
    },
    goals_04_scen: {
        dim: "values",
        gen: (a, b) => {
            if (typeof a === "string" && a === b) {
                if ((a as string).includes("Invest")) return { reason: "Unexpected windfall? You'd both invest it. future-minded thinkers", dimension: "values", score: 1.0, category: "shared" };
                if ((a as string).includes("down payment")) return { reason: "You'd both put a windfall toward a home. nesting instincts match", dimension: "values", score: 1.0, category: "shared" };
                return { reason: "You'd spend an unexpected $50K the same way. your money brains align", dimension: "values", score: 0.9, category: "shared" };
            }
            return null;
        },
    },
    goals_05: {
        dim: "values",
        gen: (a, b, opts) => {
            const nA = norm(a, "likert", opts), nB = norm(b, "likert", opts);
            const close = 1 - Math.abs(nA - nB);
            if (close > 0.7 && nA > 0.6) return { reason: "You'd both relocate for each other's dreams. adventure over comfort zone", dimension: "values", score: close, category: "shared" };
            if (close > 0.7 && nA < 0.4) return { reason: "You both value staying rooted. home base matters", dimension: "values", score: close, category: "shared" };
            return null;
        },
    },

    // ── Socioeconomic ────────────────────────────────────
    socio_02: {
        dim: "lifestyle",
        gen: (a, b) => {
            if (typeof a === "string" && a === b) {
                if ((a as string).includes("Strict")) return { reason: "You're both serious about saving. no arguments about the credit card bill", dimension: "lifestyle", score: 1.0, category: "shared" };
                if ((a as string).includes("Moderate")) return { reason: "You both budget but leave room for fun. no financial guilt trips", dimension: "lifestyle", score: 1.0, category: "shared" };
                if ((a as string).includes("Live for today")) return { reason: "You both believe money is for living. experience over spreadsheets", dimension: "lifestyle", score: 1.0, category: "shared" };
                return { reason: "Your money styles match. fewer fights about spending", dimension: "lifestyle", score: 0.9, category: "shared" };
            }
            return null;
        },
    },
    socio_04_beh: {
        dim: "lifestyle",
        gen: (a, b) => {
            if (typeof a === "string" && a === b) {
                if (a === "Yes") return { reason: "You both actually track your spending. rare, and very compatible", dimension: "lifestyle", score: 1.0, category: "behavioral" };
            }
            return null;
        },
    },
    socio_05_scen: {
        dim: "lifestyle",
        gen: (a, b) => {
            if (typeof a === "string" && a === b) {
                if ((a as string).includes("Luxury")) return { reason: "You both want the good stuff when you travel. five stars or bust", dimension: "lifestyle", score: 1.0, category: "shared" };
                if ((a as string).includes("Mid-range")) return { reason: "Your travel style is the same mix of comfort and exploration", dimension: "lifestyle", score: 1.0, category: "shared" };
                if ((a as string).includes("Budget")) return { reason: "Backpacks and street food. you'd travel the same way", dimension: "lifestyle", score: 1.0, category: "shared" };
                return { reason: "You'd plan a vacation the same way. no travel-style clashes", dimension: "lifestyle", score: 0.9, category: "shared" };
            }
            return null;
        },
    },

    // ── Lifestyle Habits ─────────────────────────────────
    habits_02_beh: {
        dim: "lifestyle",
        gen: (a, b) => {
            if (typeof a === "string" && a === b) {
                if (a === "Yes") return { reason: "You're both regulars at the gym. expect someone who gets the routine", dimension: "lifestyle", score: 0.9, category: "behavioral" };
            }
            return null;
        },
    },
    habits_03_beh: {
        dim: "lifestyle",
        gen: (a, b) => {
            if (typeof a === "string" && a === b) {
                if (a === "Yes") return { reason: "You're both early risers. no one's dragging the other out of bed", dimension: "lifestyle", score: 0.9, category: "behavioral" };
                return { reason: "You both love sleeping in on weekends. lazy mornings together", dimension: "lifestyle", score: 0.9, category: "behavioral" };
            }
            if (typeof a === "string" && typeof b === "string" && a !== b) {
                return { reason: "One morning person, one night owl. you'll each get quiet time", dimension: "lifestyle", score: 0.5, category: "complementary" };
            }
            return null;
        },
    },
    habits_04: {
        dim: "interests",
        gen: (a, b) => {
            if (Array.isArray(a) && Array.isArray(b)) {
                const overlap = topOverlap(a as string[], b as string[], 2);
                if (overlap.length >= 1) {
                    const label = shortLabel(overlap[0]);
                    return { reason: `"${label}" is a top weekend pick for both of you`, dimension: "interests", score: 0.95, category: "ranking" };
                }
            }
            return null;
        },
    },
    habits_05: {
        dim: "lifestyle",
        gen: (a, b, opts) => {
            const nA = norm(a, "likert", opts), nB = norm(b, "likert", opts);
            const close = 1 - Math.abs(nA - nB);
            if (close > 0.7 && nA > 0.6) return { reason: "You both like things tidy. no future arguments about dishes in the sink", dimension: "lifestyle", score: close, category: "shared" };
            if (close > 0.7 && nA < 0.4) return { reason: "Neither of you stresses about a little mess. lived-in is fine", dimension: "lifestyle", score: close, category: "shared" };
            return null;
        },
    },
    habits_06_beh: {
        dim: "lifestyle",
        gen: (a, b) => {
            if (typeof a === "string" && a === b) {
                if (a === "No") return { reason: "Neither of you drinks heavily. your social lives don't revolve around alcohol", dimension: "lifestyle", score: 1.0, category: "behavioral" };
                return { reason: "You both enjoy a drink. no one feels judged for ordering another round", dimension: "lifestyle", score: 0.9, category: "behavioral" };
            }
            return null;
        },
    },

    // ── Time Orientation ─────────────────────────────────
    time_01: {
        dim: "lifestyle",
        gen: (a, b, opts) => {
            const nA = norm(a, "likert", opts), nB = norm(b, "likert", opts);
            const close = 1 - Math.abs(nA - nB);
            if (close > 0.7 && nA > 0.6) return { reason: "You're both present-moment people. spontaneity over spreadsheets", dimension: "lifestyle", score: close, category: "shared" };
            if (close > 0.7 && nA < 0.4) return { reason: "You're both planners. the future isn't scary, it's a project", dimension: "lifestyle", score: close, category: "shared" };
            if (close < 0.3) return { reason: "They plan ahead, you live in the moment (or vice versa). you'll stretch each other", dimension: "lifestyle", score: 0.5, category: "complementary" };
            return null;
        },
    },
    time_02: {
        dim: "lifestyle",
        gen: (a, b, opts) => {
            const nA = norm(a, "likert", opts), nB = norm(b, "likert", opts);
            const close = 1 - Math.abs(nA - nB);
            if (close > 0.7 && nA > 0.6) return { reason: "You both weigh the long game when making big decisions. strategic minds", dimension: "lifestyle", score: close, category: "shared" };
            return null;
        },
    },
    time_03_scen: {
        dim: "lifestyle",
        gen: (a, b) => {
            if (typeof a === "string" && a === b) {
                if ((a as string).includes("detailed")) return { reason: "Free weekend? You'd both plan it out. itinerary lovers unite", dimension: "lifestyle", score: 1.0, category: "shared" };
                if ((a as string).includes("loose")) return { reason: "You'd both keep a free weekend flexible. loose plans, good vibes", dimension: "lifestyle", score: 1.0, category: "shared" };
                if ((a as string).includes("fly")) return { reason: "No plans, no stress. you'd both wing a free weekend and love it", dimension: "lifestyle", score: 1.0, category: "shared" };
            }
            return null;
        },
    },

    // ── Social Energy ────────────────────────────────────
    social_01: {
        dim: "interests",
        gen: (a, b, opts) => {
            const nA = norm(a, "likert", opts), nB = norm(b, "likert", opts);
            const close = 1 - Math.abs(nA - nB);
            if (close > 0.7 && nA > 0.6) return { reason: "You both get energized by a full room. social batteries match", dimension: "interests", score: close, category: "shared" };
            if (close > 0.7 && nA < 0.4) return { reason: "You both need recharge time after socializing. no guilt for leaving early", dimension: "interests", score: close, category: "shared" };
            return null;
        },
    },
    social_02_beh: {
        dim: "interests",
        gen: (a, b) => {
            if (typeof a === "string" && a === b) {
                if (a === "Yes") return { reason: "You both actively seek out new people. your social worlds will mix well", dimension: "interests", score: 0.9, category: "behavioral" };
            }
            return null;
        },
    },
    social_03: {
        dim: "interests",
        gen: (a, b) => {
            if (typeof a === "string" && a === b) {
                if ((a as string).includes("few close")) return { reason: "You both prefer a small inner circle over a wide network. depth over breadth", dimension: "interests", score: 1.0, category: "shared" };
                return { reason: "You both cast a wide social net. your calendars will stay full", dimension: "interests", score: 1.0, category: "shared" };
            }
            return null;
        },
    },
    social_04: {
        dim: "interests",
        gen: (a, b) => {
            if (typeof a === "string" && a === b) {
                if (a === "Yes") return { reason: "You're both open to dating someone with opposite social energy. flexibility matters", dimension: "interests", score: 0.9, category: "shared" };
            }
            return null;
        },
    },

    // ── Deal-breakers ────────────────────────────────────
    dealbreak_01_filter: {
        dim: "values",
        gen: (a, b) => {
            if (typeof a === "string" && a === b) {
                if ((a as string).includes("love pets")) return { reason: "You're both pet people. expect to fight over who the dog loves more", dimension: "values", score: 1.0, category: "shared" };
                return { reason: "You're aligned on the pet question. no dealbreaker surprises there", dimension: "values", score: 0.85, category: "shared" };
            }
            return null;
        },
    },
    dealbreak_04_scen: {
        dim: "values",
        gen: (a, b) => {
            if (typeof a === "string" && a === b) {
                if ((a as string).includes("healthy")) return { reason: "Ex still in the picture? You'd both be cool with it. maturity match", dimension: "values", score: 1.0, category: "shared" };
                if ((a as string).includes("boundaries")) return { reason: "You'd both want clear boundaries with exes. same comfort zone", dimension: "values", score: 1.0, category: "shared" };
                return { reason: "You handle the ex question the same way. one less thing to navigate", dimension: "values", score: 0.85, category: "shared" };
            }
            return null;
        },
    },

    // ── Attraction Style ─────────────────────────────────
    attr_01: {
        dim: "interests",
        gen: (a, b, opts) => {
            const nA = norm(a, "likert", opts), nB = norm(b, "likert", opts);
            const close = 1 - Math.abs(nA - nB);
            if (close > 0.7 && nA < 0.4) return { reason: "Personality first for both of you. looks are a bonus, not the headline", dimension: "interests", score: close, category: "shared" };
            return null;
        },
    },
    attr_02: {
        dim: "interests",
        gen: (a, b, opts) => {
            const nA = norm(a, "likert", opts), nB = norm(b, "likert", opts);
            const close = 1 - Math.abs(nA - nB);
            if (close > 0.7 && nA > 0.6) return { reason: "You're both slow-burn types. attraction grows over real connection, not just a spark", dimension: "interests", score: close, category: "shared" };
            return null;
        },
    },
    attr_03_scen: {
        dim: "interests",
        gen: (a, b) => {
            if (typeof a === "string" && a === b) {
                if ((a as string).includes("conversational")) return { reason: "No spark in the convo? You'd both pass. chemistry starts with words", dimension: "interests", score: 1.0, category: "shared" };
                if ((a as string).includes("nerves")) return { reason: "You'd both give a second chance if first-date nerves got in the way", dimension: "interests", score: 1.0, category: "shared" };
                return { reason: "You weigh physical attraction vs conversation chemistry the same way", dimension: "interests", score: 0.85, category: "shared" };
            }
            return null;
        },
    },
    attr_04: {
        dim: "interests",
        gen: (a, b) => {
            if (Array.isArray(a) && Array.isArray(b)) {
                const overlap = topOverlap(a as string[], b as string[], 2);
                if (overlap.length >= 2) {
                    return { reason: `"${shortLabel(overlap[0])}" and "${shortLabel(overlap[1])}" both made your top 2 chemistry drivers`, dimension: "interests", score: 1.0, category: "ranking" };
                }
                if (overlap.length === 1) {
                    return { reason: `"${shortLabel(overlap[0])}" is what sparks chemistry for both of you`, dimension: "interests", score: 0.85, category: "ranking" };
                }
            }
            return null;
        },
    },
};

// ---------- Normalization ----------
export function normalizeAnswer(
    value: unknown,
    type: string,
    options: string[]
): number {
    switch (type) {
        case "likert": {
            const num = Number(value);
            if (isNaN(num)) return 0.5;
            // Likert value is 1-indexed from QuestionCard (1 to N)
            return (num - 1) / Math.max(options.length - 1, 1);
        }
        case "binary": {
            // value is the option string, e.g. "Yes" / "No"
            if (typeof value === "string") {
                const idx = options.indexOf(value);
                return idx >= 0 ? idx / Math.max(options.length - 1, 1) : 0.5;
            }
            return value ? 1 : 0;
        }
        case "multiple_choice":
        case "scenario": {
            if (typeof value === "string") {
                const idx = options.indexOf(value);
                return idx >= 0 ? idx / Math.max(options.length - 1, 1) : 0.5;
            }
            return 0.5;
        }
        case "ranking": {
            // Spearman rank correlation: compare user ranking to reference order
            if (Array.isArray(value) && options.length > 0) {
                const userRanking = value as string[];
                let displacement = 0;
                for (let i = 0; i < userRanking.length; i++) {
                    const refIdx = options.indexOf(userRanking[i]);
                    if (refIdx >= 0) {
                        displacement += Math.abs(i - refIdx);
                    }
                }
                const n = userRanking.length;
                const maxDisplacement = (n * (n - 1)) / 2;
                return maxDisplacement > 0 ? 1 - displacement / maxDisplacement : 0.5;
            }
            return 0.5;
        }
        default:
            return 0.5;
    }
}

// ---------- Vector Construction ----------
export function buildVector(
    answers: { questionId: string; value: unknown }[],
    questions: {
        id: string;
        weightDimension: string;
        weight: number;
        type: string;
        options: unknown;
    }[]
): DimensionVec {
    const vec: DimensionVec = {};

    for (const dim of DIMENSIONS) {
        const qs = questions.filter((q) => q.weightDimension === dim);
        const totalW = qs.reduce((s, q) => s + q.weight, 0);
        let wSum = 0;

        for (const q of qs) {
            const a = answers.find((a) => a.questionId === q.id);
            if (!a) continue;
            const opts = Array.isArray(q.options) ? q.options : [];
            wSum += q.weight * normalizeAnswer(a.value, q.type, opts as string[]);
        }

        vec[dim] = totalW > 0 ? wSum / totalW : 0.5;
    }

    return vec;
}

// ---------- Similarity ----------
export function similarity(a: DimensionVec, b: DimensionVec): number {
    const totalW = DIMENSIONS.reduce((s, d) => s + DIMENSION_WEIGHTS[d], 0);
    const dist = DIMENSIONS.reduce(
        (s, d) => s + DIMENSION_WEIGHTS[d] * Math.abs((a[d] ?? 0.5) - (b[d] ?? 0.5)),
        0
    );
    return 1 - dist / totalW;
}

// ---------- Explanation ----------
export function explain(a: DimensionVec, b: DimensionVec): string {
    const sorted = DIMENSIONS.slice().sort(
        (x, y) =>
            Math.abs((a[x] ?? 0.5) - (b[x] ?? 0.5)) -
            Math.abs((a[y] ?? 0.5) - (b[y] ?? 0.5))
    );
    const top2 = sorted.slice(0, 2);
    return `You were matched because of your ${EXPLANATION_LABELS[top2[0]]} and ${EXPLANATION_LABELS[top2[1]]}.`;
}

// ---------- Detailed Explanation ----------
interface Question {
    id: string;
    questionText?: string;
    weightDimension: string;
    weight: number;
    type: string;
    options: unknown;
}

interface HistoricalMatchExplanation {
    userAId: string;
    userBId: string;
    weekStart: Date;
    explanation: string;
}

export function explainDetailed(
    answersA: Answer[],
    answersB: Answer[],
    questions: Question[],
    vecA: DimensionVec,
    vecB: DimensionVec
): string[] {
    // 1. Run all generators → collect scored reasons
    const candidates: GeneratedReason[] = [];

    for (const question of questions) {
        const gen = REASON_GENERATORS[question.id];
        if (!gen) continue;

        const answerA = answersA.find((a) => a.questionId === question.id);
        const answerB = answersB.find((a) => a.questionId === question.id);
        if (!answerA || !answerB) continue;

        const options = Array.isArray(question.options) ? (question.options as string[]) : [];
        const result = gen.gen(answerA.value, answerB.value, options);

        if (result) {
            // Boost score by question weight
            result.score *= question.weight;
            candidates.push(result);
        }
    }

    // 2. Sort by score (highest first)
    candidates.sort((a, b) => b.score - a.score);

    // 3. Select 2–4 diverse reasons
    const selected: GeneratedReason[] = [];
    const usedDimensions = new Set<string>();
    const usedCategories = new Set<string>();

    // First pass: pick top reasons from distinct dimensions
    for (const c of candidates) {
        if (selected.length >= 4) break;
        if (!usedDimensions.has(c.dimension)) {
            selected.push(c);
            usedDimensions.add(c.dimension);
            usedCategories.add(c.category);
        }
    }

    // Second pass: fill to at least 3 if possible, preferring new categories
    if (selected.length < 3) {
        for (const c of candidates) {
            if (selected.length >= 3) break;
            if (!selected.includes(c)) {
                // Prefer different category if possible
                if (!usedCategories.has(c.category) || selected.length < 2) {
                    selected.push(c);
                    usedCategories.add(c.category);
                }
            }
        }
    }

    // Third pass: still short? take anything remaining
    if (selected.length < 2) {
        for (const c of candidates) {
            if (selected.length >= 2) break;
            if (!selected.includes(c)) {
                selected.push(c);
            }
        }
    }

    // 4. Fallback: if we still have fewer than 2, use dimension-level labels
    if (selected.length < 2) {
        const sortedDims = DIMENSIONS.slice().sort(
            (x, y) =>
                Math.abs((vecA[x] ?? 0.5) - (vecB[x] ?? 0.5)) -
                Math.abs((vecA[y] ?? 0.5) - (vecB[y] ?? 0.5))
        );

        for (const dim of sortedDims) {
            if (selected.length >= 2) break;
            const label = EXPLANATION_LABELS[dim];
            if (label && !selected.some((s) => s.reason.includes(label))) {
                selected.push({
                    reason: `You share ${label} that set you apart`,
                    dimension: dim,
                    score: 0,
                    category: "shared",
                });
            }
        }
    }

    return selected.slice(0, 4).map((s) => s.reason);
}

// ---------- Hard Filters ----------
export function passesHardFilters(a: UserForMatching, b: UserForMatching): boolean {
    // Must be from the same university
    if (a.universityId !== b.universityId) return false;

    // Mutual gender preference
    const aAcceptsB =
        a.genderPref === "any" || a.genderPref === b.gender;
    const bAcceptsA =
        b.genderPref === "any" || b.genderPref === a.gender;

    if (!aAcceptsB || !bAcceptsA) return false;

    // Same city
    if (a.city.toLowerCase() !== b.city.toLowerCase()) return false;

    return true;
}

// ---------- Maximum Weight Matching (Blossom) ----------
export function findOptimalPairs(
    users: UserForMatching[],
    vectors: Record<string, DimensionVec>,
    pastPairs: Set<string>,
    jitter: boolean = true
): Array<{ userAId: string; userBId: string; score: number }> {
    if (users.length < 2) return [];

    // Map user IDs to integer indices for the blossom algorithm
    const idToIdx = new Map<string, number>();
    users.forEach((u, i) => idToIdx.set(u.id, i));

    // Build weighted edge list: [nodeA, nodeB, weight]
    // Only create edges for compatible pairs above the minimum threshold
    const edges: Array<[number, number, number]> = [];
    const realScores = new Map<string, number>(); // Store real scores without jitter

    for (let i = 0; i < users.length; i++) {
        for (let j = i + 1; j < users.length; j++) {
            const a = users[i];
            const b = users[j];

            // Hard filters: gender preference + city
            if (!passesHardFilters(a, b)) continue;

            // Past pair exclusion: never re-match
            if (pastPairs.has(`${a.id}-${b.id}`)) continue;

            // Compute similarity
            const score = similarity(vectors[a.id], vectors[b.id]);

            // Minimum threshold: skip low-quality edges
            if (score < MIN_SIMILARITY_THRESHOLD) continue;

            // Store the real score for output
            realScores.set(`${i}-${j}`, score);

            // Add controlled jitter for tie-breaking variety
            const weight = jitter
                ? score + (Math.random() - 0.5) * JITTER_AMOUNT
                : score;

            edges.push([i, j, weight]);
        }
    }

    if (edges.length === 0) return [];

    // Run Edmonds' Blossom algorithm for maximum weight matching
    const blossomResult: number[] = blossom(edges);

    // Convert blossom result to match pairs
    // blossomResult[i] = j means node i is matched with node j (-1 = unmatched)
    const result: Array<{ userAId: string; userBId: string; score: number }> = [];
    const seen = new Set<number>();

    for (let i = 0; i < blossomResult.length; i++) {
        const j = blossomResult[i];
        if (j === -1 || seen.has(i) || seen.has(j)) continue;

        seen.add(i);
        seen.add(j);

        // Use real score (without jitter) for the output
        const lo = Math.min(i, j);
        const hi = Math.max(i, j);
        const realScore = realScores.get(`${lo}-${hi}`) ?? 0;

        result.push({
            userAId: users[lo].id,
            userBId: users[hi].id,
            score: realScore,
        });
    }

    return result;
}

export function buildMatchExplanationForPair(input: {
    answersA: Answer[];
    answersB: Answer[];
    questions: Question[];
    vecA: DimensionVec;
    vecB: DimensionVec;
    similarityScore: number;
    weekStart: Date;
    historicalMatches?: HistoricalMatchExplanation[];
    pairKey?: string;
}): string {
    if (isMatchReasoningV2Enabled()) {
        try {
            const result = generateMatchExplanationV2({
                answersA: input.answersA,
                answersB: input.answersB,
                questions: input.questions,
                vecA: input.vecA,
                vecB: input.vecB,
                similarityScore: input.similarityScore,
                weekStart: input.weekStart,
                historicalMatches: input.historicalMatches ?? [],
                pairKey: input.pairKey,
            });

            return serializeMatchExplanationV2(result.explanation);
        } catch (error) {
            console.error("V2 match reasoning failed; falling back to legacy reasons:", error);
        }
    }

    const reasons = explainDetailed(
        input.answersA,
        input.answersB,
        input.questions,
        input.vecA,
        input.vecB
    );

    return JSON.stringify(reasons);
}

// ---------- Main Matching Pipeline ----------
export async function runWeeklyMatching(weekStart: Date, universityId?: string) {
    // 1. Get all opted-in users for this week who completed setup
    const optIns = await prisma.weeklyOptIn.findMany({
        where: {
            weekStart,
            ...(universityId ? { user: { universityId } } : {}),
        },
        include: {
            user: {
                select: {
                    id: true,
                    gender: true,
                    genderPref: true,
                    city: true,
                    universityId: true,
                    createdAt: true,
                    completedSetup: true,
                },
            },
        },
    });

    const users = optIns
        .filter((o) => o.user.completedSetup)
        .map((o) => o.user);

    // 2. Get all past match pairs to avoid rematching
    const allMatches = await prisma.match.findMany({
        select: { userAId: true, userBId: true, weekStart: true, explanation: true },
    });
    const pastPairs = new Set(
        allMatches.flatMap((m) => [`${m.userAId}-${m.userBId}`, `${m.userBId}-${m.userAId}`])
    );

    // 3. Build vectors for all users and store answers
    const questions = await prisma.question.findMany();
    const vectors: Record<string, DimensionVec> = {};
    const allAnswers: Record<string, Answer[]> = {};

    for (const user of users) {
        const answers = await prisma.answer.findMany({
            where: { userId: user.id },
            select: { questionId: true, value: true },
        });
        vectors[user.id] = buildVector(answers, questions);
        allAnswers[user.id] = answers;
    }

    // 4. Determine carry-forward priority (unmatched from previous cycle)
    //    Users who opted in last week but didn't get matched get sorted first.
    const prevWeekStart = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000);

    const prevOptIns = await prisma.weeklyOptIn.findMany({
        where: { weekStart: prevWeekStart },
        select: { userId: true },
    });

    const prevMatches = await prisma.match.findMany({
        where: { weekStart: prevWeekStart },
        select: { userAId: true, userBId: true },
    });

    const prevMatchedIds = new Set(
        prevMatches.flatMap((m) => [m.userAId, m.userBId])
    );

    // Priority = opted in last week AND not matched last week AND opted in this week
    const priorityUserIds = new Set(
        prevOptIns
            .filter((o) => !prevMatchedIds.has(o.userId))
            .map((o) => o.userId)
    );

    // Sort: priority users first, then by signup date (older first)
    const sortedUsers = users.sort((a, b) => {
        const aPri = priorityUserIds.has(a.id) ? 0 : 1;
        const bPri = priorityUserIds.has(b.id) ? 0 : 1;
        if (aPri !== bPri) return aPri - bPri;
        return a.createdAt.getTime() - b.createdAt.getTime();
    });

    // 5. Maximum Weight Matching (Blossom algorithm)
    const optimalPairs = findOptimalPairs(sortedUsers, vectors, pastPairs);

    const matches: {
        userAId: string;
        userBId: string;
        similarityScore: number;
        explanation: string;
        weekStart: Date;
    }[] = [];

    for (const pair of optimalPairs) {
        const pairHistory = allMatches.filter(
            (match) =>
                match.weekStart.getTime() < weekStart.getTime() &&
                (match.userAId === pair.userAId ||
                    match.userBId === pair.userAId ||
                    match.userAId === pair.userBId ||
                    match.userBId === pair.userBId)
        );
        const explanationStr = buildMatchExplanationForPair({
            answersA: allAnswers[pair.userAId],
            answersB: allAnswers[pair.userBId],
            questions,
            vecA: vectors[pair.userAId],
            vecB: vectors[pair.userBId],
            similarityScore: pair.score,
            weekStart,
            historicalMatches: pairHistory,
            pairKey: `${pair.userAId}:${pair.userBId}:${weekStart.toISOString()}`,
        });

        matches.push({
            userAId: pair.userAId,
            userBId: pair.userBId,
            similarityScore: pair.score,
            explanation: explanationStr,
            weekStart,
        });
    }

    // 6. Save matches to DB
    for (const match of matches) {
        await prisma.match.create({
            data: match,
        });
    }

    return {
        matched: matches.length * 2,
        unmatched: users.length - matches.length * 2,
        priorityUsers: users.filter((u) => priorityUserIds.has(u.id)).length,
        matches,
    };
}
