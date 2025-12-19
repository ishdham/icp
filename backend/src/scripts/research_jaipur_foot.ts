
import dotenv from 'dotenv';
// Load environment variables immediately
dotenv.config();

import { aiService } from '../container';

async function main() {
    console.log("=== Starting Manual Research for 'Jaipur Foot' ===");

    try {
        // 1. Research phase
        console.log("\n1. Calling researchSolution...");
        const researchStart = Date.now();
        const researchResult = await aiService.researchSolution("Jaipur Foot");
        console.log(`\nResearch completed in ${(Date.now() - researchStart) / 1000}s`);

        console.log("\n--- Research Output ---");
        console.log(researchResult.researchText);
        console.log("-----------------------\n");

        // 2. Extraction phase
        console.log("2. Calling extractStructuredData...");
        const extractStart = Date.now();
        const structuredData = await aiService.extractStructuredData(researchResult.researchText);
        console.log(`\nExtraction completed in ${(Date.now() - extractStart) / 1000}s`);

        console.log("\n--- Structured JSON ---");
        console.log(JSON.stringify(structuredData, null, 2));
        console.log("-----------------------\n");

    } catch (error) {
        console.error("An error occurred:", error);
    }
}

main();
