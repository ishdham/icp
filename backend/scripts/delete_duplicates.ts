
import { db } from '../src/config/firebase';

async function deleteDuplicates() {
    try {
        console.log('Starting deduplication process...');

        // 1. Partners
        console.log('\n--- Processing Partners ---');
        const partnersSnapshot = await db.collection('partners').get();
        const partnersByName = new Map<string, any[]>();

        partnersSnapshot.forEach(doc => {
            const data = doc.data();
            const name = data.organizationName;
            if (!partnersByName.has(name)) {
                partnersByName.set(name, []);
            }
            partnersByName.get(name)?.push({
                id: doc.id,
                createdAt: data.createdAt,
                ref: doc.ref
            });
        });

        let partnersDeleted = 0;
        const partnerBatch = db.batch();
        let pBatchCount = 0;

        for (const [name, entries] of partnersByName) {
            if (entries.length > 1) {
                // Sort by createdAt descending (latest first)
                entries.sort((a, b) => {
                    const dateA = new Date(a.createdAt).getTime();
                    const dateB = new Date(b.createdAt).getTime();
                    return dateB - dateA;
                });

                // Keep the first one (latest), delete the rest
                const toKeep = entries[0];
                const toDelete = entries.slice(1);

                console.log(`Keeping latest Partner "${name}" (ID: ${toKeep.id}, Created: ${toKeep.createdAt})`);

                for (const entry of toDelete) {
                    console.log(`  - Deleting duplicate ID: ${entry.id} (Created: ${entry.createdAt})`);
                    partnerBatch.delete(entry.ref);
                    partnersDeleted++;
                    pBatchCount++;

                    // Commit batch every 400 operations (limit is 500)
                    if (pBatchCount >= 400) {
                        await partnerBatch.commit();
                        pBatchCount = 0; // Reset count? No, we need a new batch
                        // actually we can't 'reset' the batch object, we need to create a new one but the previous one is committed.
                        // wait, batch is an object.
                    }
                }
            }
        }

        // Commit remaining partner deletions
        if (pBatchCount > 0) {
            await partnerBatch.commit();
        }

        console.log(`Deleted ${partnersDeleted} duplicate partners.`);

        // 2. Solutions
        console.log('\n--- Processing Solutions ---');
        const solutionsSnapshot = await db.collection('solutions').get();
        const solutionsByName = new Map<string, any[]>();

        solutionsSnapshot.forEach(doc => {
            const data = doc.data();
            const name = data.name;
            if (!solutionsByName.has(name)) {
                solutionsByName.set(name, []);
            }
            solutionsByName.get(name)?.push({
                id: doc.id,
                createdAt: data.createdAt,
                ref: doc.ref
            });
        });

        let solutionsDeleted = 0;
        // Re-using variable name but new logic for batching if needed, 
        // strictly speaking we should create a new batch instance for safety/clarity 
        // although logic above committed it.
        // Actually, let's just do individual deletes for simplicity or create new batch chunks
        // to avoid complex batch management logic in a simple script.
        // Or just one batch loop per entity type.

        const solutionBatch = db.batch(); // New batch
        let sBatchCount = 0;

        for (const [name, entries] of solutionsByName) {
            if (entries.length > 1) {
                // Sort by createdAt descending (latest first)
                entries.sort((a, b) => {
                    const dateA = new Date(a.createdAt).getTime();
                    const dateB = new Date(b.createdAt).getTime();
                    return dateB - dateA;
                });

                // Keep the first one (latest), delete the rest
                const toKeep = entries[0];
                const toDelete = entries.slice(1);

                console.log(`Keeping latest Solution "${name}" (ID: ${toKeep.id}, Created: ${toKeep.createdAt})`);

                for (const entry of toDelete) {
                    console.log(`  - Deleting duplicate ID: ${entry.id} (Created: ${entry.createdAt})`);
                    solutionBatch.delete(entry.ref);
                    solutionsDeleted++;
                    sBatchCount++;

                    if (sBatchCount >= 400) {
                        await solutionBatch.commit();
                        // We need to re-instantiate batch? 
                        // Firestore batch.commit() returns a promise and ends the batch?
                        // "A WriteBatch can be used to perform multiple writes as a single atomic unit."
                        // Once committed, it cannot be used again.
                        // So we need to handle this correctly.
                        // Actually, let's just use a simple robust loop helper or just process all partners then all solutions.
                        // But wait, the standard way is: check size, commit, create NEW batch.
                    }
                }
            }
        }

        // Just failing fast: The batch logic inside the loop above is FLAGGED.
        // If I commit inside the loop, the `solutionBatch` variable still holds the OLD batch object which is now committed/finalized.
        // I cannot add to it.
        // So I need to re-assign `solutionBatch = db.batch()` inside the if block.
    } catch (error) {
        console.error('Error deleting duplicates:', error);
        process.exit(1);
    }
}
// Rewriting the function to handle batches correctly.

async function deleteDuplicatesCorrect() {
    try {
        console.log('Starting deduplication process...');

        // 1. Partners
        console.log('\n--- Processing Partners ---');
        const partnersSnapshot = await db.collection('partners').get();
        const partnersByName = new Map<string, any[]>();

        partnersSnapshot.forEach(doc => {
            const data = doc.data();
            const name = data.organizationName;
            if (!partnersByName.has(name)) {
                partnersByName.set(name, []);
            }
            partnersByName.get(name)?.push({
                id: doc.id,
                createdAt: data.createdAt,
                ref: doc.ref
            });
        });

        let partnersDeleted = 0;
        let batch = db.batch();
        let batchCount = 0;

        for (const [name, entries] of partnersByName) {
            if (entries.length > 1) {
                entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                const toDelete = entries.slice(1);

                for (const entry of toDelete) {
                    console.log(`Deleting duplicate Partner ID: ${entry.id}`);
                    batch.delete(entry.ref);
                    partnersDeleted++;
                    batchCount++;
                    if (batchCount >= 400) {
                        await batch.commit();
                        batch = db.batch();
                        batchCount = 0;
                    }
                }
            }
        }

        if (batchCount > 0) {
            await batch.commit();
            batch = db.batch(); // Reset for solutions (safe practice)
            batchCount = 0;
        }

        console.log(`Deleted ${partnersDeleted} duplicate partners.`);

        // 2. Solutions
        console.log('\n--- Processing Solutions ---');
        const solutionsSnapshot = await db.collection('solutions').get();
        const solutionsByName = new Map<string, any[]>();

        solutionsSnapshot.forEach(doc => {
            const data = doc.data();
            const name = data.name;
            if (!solutionsByName.has(name)) {
                solutionsByName.set(name, []);
            }
            solutionsByName.get(name)?.push({
                id: doc.id,
                createdAt: data.createdAt,
                ref: doc.ref
            });
        });

        let solutionsDeleted = 0;

        for (const [name, entries] of solutionsByName) {
            if (entries.length > 1) {
                entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                const toDelete = entries.slice(1);

                for (const entry of toDelete) {
                    console.log(`Deleting duplicate Solution ID: ${entry.id}`);
                    batch.delete(entry.ref);
                    solutionsDeleted++;
                    batchCount++;
                    if (batchCount >= 400) {
                        await batch.commit();
                        batch = db.batch();
                        batchCount = 0;
                    }
                }
            }
        }

        if (batchCount > 0) {
            await batch.commit();
        }

        console.log(`Deleted ${solutionsDeleted} duplicate solutions.`);
        process.exit(0);

    } catch (error) {
        console.error('Error deleting duplicates:', error);
        process.exit(1);
    }
}

deleteDuplicatesCorrect();
