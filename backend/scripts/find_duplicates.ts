
import { db } from '../src/config/firebase';

async function findDuplicates() {
    try {
        console.log('Scanning for duplicates...');

        // 1. Partners
        console.log('\n--- Partners ---');
        const partnersSnapshot = await db.collection('partners').get();
        const partnersByName = new Map<string, any[]>();

        partnersSnapshot.forEach(doc => {
            const data = doc.data();
            const name = data.organizationName;
            if (!partnersByName.has(name)) {
                partnersByName.set(name, []);
            }
            partnersByName.get(name)?.push({ id: doc.id, createdAt: data.createdAt });
        });

        let duplicatePartnersCount = 0;
        partnersByName.forEach((entries, name) => {
            if (entries.length > 1) {
                duplicatePartnersCount++;
                console.log(`Duplicate Partner: "${name}"`);
                entries.forEach(entry => {
                    console.log(`  - ID: ${entry.id}, CreatedAt: ${entry.createdAt}`);
                });
            }
        });

        if (duplicatePartnersCount === 0) {
            console.log('No duplicate partners found.');
        } else {
            console.log(`Found ${duplicatePartnersCount} duplicate partners.`);
        }

        // 2. Solutions
        console.log('\n--- Solutions ---');
        const solutionsSnapshot = await db.collection('solutions').get();
        const solutionsByName = new Map<string, any[]>();

        solutionsSnapshot.forEach(doc => {
            const data = doc.data();
            const name = data.name;
            if (!solutionsByName.has(name)) {
                solutionsByName.set(name, []);
            }
            solutionsByName.get(name)?.push({ id: doc.id, createdAt: data.createdAt });
        });

        let duplicateSolutionsCount = 0;
        solutionsByName.forEach((entries, name) => {
            if (entries.length > 1) {
                duplicateSolutionsCount++;
                console.log(`Duplicate Solution: "${name}"`);
                entries.forEach(entry => {
                    console.log(`  - ID: ${entry.id}, CreatedAt: ${entry.createdAt}`);
                });
            }
        });

        if (duplicateSolutionsCount === 0) {
            console.log('No duplicate solutions found.');
        } else {
            console.log(`Found ${duplicateSolutionsCount} duplicate solutions.`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error finding duplicates:', error);
        process.exit(1);
    }
}

findDuplicates();
