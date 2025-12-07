import { auth } from '../src/config/firebase';

// API Key from frontend config
const API_KEY = "AIzaSyAAAzYzXW_jkHJxVFSauBpu-HBr0I2XJgc";

async function generateToken(uid: string, role?: string) {
    try {
        // 1. Generate Custom Token
        const customToken = await auth.createCustomToken(uid, { role });
        console.log(`Generated Custom Token for ${uid}`);

        // 2. Exchange for ID Token
        const response = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: customToken,
                    returnSecureToken: true
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(JSON.stringify(data));
        }

        const idToken = data.idToken;
        console.log(`\nID Token for ${uid} (${role || 'REGULAR'}):`);
        console.log(idToken);
        return idToken;
    } catch (error: any) {
        console.error(`Error generating token for ${uid}:`, error.message || error);
    }
}

async function main() {
    console.log("Generating tokens...");

    // Admin Token
    await generateToken('USER-ADMIN-01', 'ADMIN');

    // Regular User Token
    await generateToken('USER-101', 'REGULAR');
}

main();
