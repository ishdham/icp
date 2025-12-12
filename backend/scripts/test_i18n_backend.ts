const API_URL = 'http://localhost:3000/v1';

async function testBackendTranslation() {
    console.log('--- Starting Backend Translation Test ---');

    try {
        // 1. Fetch a real solution ID
        console.log('1. Fetching list of solutions...');
        const listRes = await fetch(`${API_URL}/solutions`);
        const listData = await listRes.json() as any;

        if (!listData.items || listData.items.length === 0) {
            console.error('No solutions found to test.');
            return;
        }

        const candidate = listData.items[0];
        console.log(`   Found candidate: ${candidate.name} (ID: ${candidate.id})`);

        // 2. Fetch English Details
        console.log('\n2. Fetching Details (English)...');
        const enRes = await fetch(`${API_URL}/solutions/${candidate.id}`);
        const enData = await enRes.json() as any;
        console.log(`   EN Summary: ${enData.summary?.substring(0, 50)}...`);

        // 3. Fetch Hindi Details (Trigger Translation)
        console.log('\n3. Fetching Details (Hindi) - Triggering Translation...');
        const startTime = Date.now();
        const hiRes = await fetch(`${API_URL}/solutions/${candidate.id}?lang=hi`);
        const hiData = await hiRes.json() as any;
        const duration = Date.now() - startTime;

        console.log(`   Request took ${duration}ms`);
        console.log(`   HI Name: ${hiData.name}`);
        console.log(`   HI Summary: ${hiData.summary?.substring(0, 50)}...`);

        if (hiData.summary === enData.summary) {
            console.error('   FAIL: Hindi summary matches English summary! Translation did not happen or returned original.');
        } else {
            console.log('   PASS: Hindi summary is different.');
        }

        // 4. Verify Persistence (Second Call)
        console.log('\n4. Verifying Cache (Second Call)...');
        const startCache = Date.now();
        const hiRes2 = await fetch(`${API_URL}/solutions/${candidate.id}?lang=hi`);
        const durationCache = Date.now() - startCache;
        console.log(`   Request took ${durationCache}ms`);

        if (durationCache < 1000) {
            console.log('   PASS: Second call was fast (Cached).');
        } else {
            console.warn('   WARN: Second call was slow (Maybe not cached?).');
        }

    } catch (error: any) {
        console.error('Test Failed:', error.message);
    }
}

testBackendTranslation();
