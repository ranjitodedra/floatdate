import { prisma } from "../src/lib/db";
import { getPreviousWeekStart } from "../src/lib/week-cycle";

async function main() {
    const adminEmail = "ranjitodedra.dev@gmail.com";
    const admin = await prisma.user.findUnique({
        where: { email: adminEmail },
    });

    if (!admin) {
        console.error("Admin user not found. Please ensure the user exists.");
        return;
    }

    // Try to find another user to match with
    let otherUser = await prisma.user.findFirst({
        where: {
            email: { not: adminEmail }
        }
    });

    if (!otherUser) {
        console.error("No other user found in the database. Cannot create a match.");
        return;
    }

    const previousWeekStart = getPreviousWeekStart();

    // Check if a match already exists
    let match = await prisma.match.findFirst({
        where: {
            weekStart: previousWeekStart,
            OR: [
                { userAId: admin.id },
                { userBId: admin.id }
            ]
        }
    });

    if (!match) {
        console.log("Creating a sample match for previous cycle...");
        match = await prisma.match.create({
            data: {
                weekStart: previousWeekStart,
                userAId: admin.id,
                userBId: otherUser.id,
                similarityScore: 0.88,
                explanation: JSON.stringify(["You both love hiking", "You both value humor"]),
            }
        });
    }

    // Check if feedback already exists
    const existingFeedback = await prisma.matchFeedback.findFirst({
        where: { matchId: match.id, userId: admin.id }
    });

    if (existingFeedback) {
        console.log("Updating existing feedback...");
        await prisma.matchFeedback.update({
            where: { id: existingFeedback.id },
            data: {
                howItWent: "great_conversation",
                feedbackText: "We had an amazing chat! Thanks for setting this up."
            }
        });
    } else {
        console.log("Creating new feedback...");
        await prisma.matchFeedback.create({
            data: {
                matchId: match.id,
                userId: admin.id,
                howItWent: "great_conversation",
                feedbackText: "We had an amazing chat! Thanks for setting this up."
            }
        });
    }

    console.log("Sample feedback successfully injected.");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
