
import * as admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function testStorage() {
    console.log('Initializing Firebase Admin...');
    if (!admin.apps.length) {
        try {
            admin.initializeApp({
                credential: admin.credential.applicationDefault(),
                storageBucket: 'icp-demo-480309.firebasestorage.app'
            });
            console.log('Firebase initialized.');
        } catch (e) {
            console.error('Failed to initialize Firebase:', e);
            process.exit(1);
        }
    }

    const bucket = admin.storage().bucket();
    console.log(`Using bucket: ${bucket.name}`);

    const filename = `test-upload-${Date.now()}.txt`;
    const file = bucket.file(`test/${filename}`);
    const content = 'Hello, Firebase Storage!';

    console.log(`Attempting to upload file: ${file.name}...`);

    try {
        await file.save(content, {
            contentType: 'text/plain',
            public: true // Try to make it public immediately
        });
        console.log('File uploaded successfully.');

        // Verify public access
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
        console.log(`Public URL: ${publicUrl}`);

        console.log('Attempting verify makePublic explicitly...');
        await file.makePublic();
        console.log('makePublic() succeeded.');

    } catch (error) {
        console.error('Storage test failed:', error);
    }
}

testStorage();
