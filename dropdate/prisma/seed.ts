import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

// Map questions.json dimensions → 5 matching algorithm dimensions
const DIMENSION_MAP: Record<string, string> = {
    "Big Five personality traits": "attachment",
    "Attachment style (anxiety, avoidance, security)": "attachment",
    "Conflict resolution style": "communication",
    "Emotional regulation": "attachment",
    "Communication style": "communication",
    "Core values (family, ambition, religion, lifestyle)": "values",
    "Relationship beliefs (growth vs destiny)": "values",
    "Long-term goals (children, marriage, relocation)": "values",
    "Socioeconomic preferences": "lifestyle",
    "Behavioral lifestyle habits": "lifestyle",
    "Time orientation (future vs present)": "lifestyle",
    "Social energy (introversion/extroversion)": "interests",
    "Deal-breakers and hard constraints": "values",
    "Attraction style & experiential preferences": "interests",
};

// Map recommended_weight to numeric values
const WEIGHT_MAP: Record<string, number> = {
    high: 1.5,
    medium: 1.0,
    low: 0.5,
};

// Map input_type to the schema's type field
const TYPE_MAP: Record<string, string> = {
    likert_5: "likert",
    likert_7: "likert",
    binary: "binary",
    forced_choice: "binary",
    scenario: "multiple_choice",
    multiple_choice: "multiple_choice",
    ranking: "ranking",
    importance_weight: "likert",
    hard_filter: "multiple_choice",
};

interface QuestionJSON {
    id: string;
    text: string;
    input_type: string;
    options: string[];
    dimension: string;
    scoring_direction: string;
    concept_reference: string;
    recommended_weight: string;
}

async function main() {
    const questionsPath = path.join(__dirname, "..", "questions.json");
    const raw = fs.readFileSync(questionsPath, "utf-8");
    const questions: QuestionJSON[] = JSON.parse(raw);

    console.log(`Seeding ${questions.length} questions...`);

    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const mappedDimension = DIMENSION_MAP[q.dimension] || "interests";
        const mappedType = TYPE_MAP[q.input_type] || "multiple_choice";
        const weight = WEIGHT_MAP[q.recommended_weight] || 1.0;

        await prisma.question.upsert({
            where: { id: q.id },
            update: {
                orderIndex: i + 1,
                questionText: q.text,
                type: mappedType,
                options: q.options,
                weightDimension: mappedDimension,
                weight: weight,
            },
            create: {
                id: q.id,
                orderIndex: i + 1,
                questionText: q.text,
                type: mappedType,
                options: q.options,
                weightDimension: mappedDimension,
                weight: weight,
            },
        });
    }

    console.log(`✅ Seeded ${questions.length} questions successfully`);
}

main()
    .catch((e) => {
        console.error("Seed error:", e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
