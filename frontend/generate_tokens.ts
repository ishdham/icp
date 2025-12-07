import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { firebaseConfig } from "./src/config/firebaseConfig";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function getOrCreateUser(email, password) {
    try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        return cred.user;
    } catch (e) {
        if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            return cred.user;
        }
        throw e;
    }
}

async function main() {
    try {
        // Admin User
        const adminUser = await getOrCreateUser("admin@icp.com", "password123");
        const adminToken = await adminUser.getIdToken(true);
        console.log("ADMIN_UID:", adminUser.uid);
        console.log("ADMIN_TOKEN:", adminToken);

        // Regular User
        const regularUser = await getOrCreateUser("user@icp.com", "password123");
        const regularToken = await regularUser.getIdToken(true);
        console.log("USER_UID:", regularUser.uid);
        console.log("USER_TOKEN:", regularToken);

        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

main();
