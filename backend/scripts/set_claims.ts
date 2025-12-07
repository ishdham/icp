import { auth } from '../src/config/firebase';

async function setRoles() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log("Usage: ts-node set_claims.ts <uid> <role>");
        process.exit(1);
    }

    const uid = args[0];
    const role = args[1];

    try {
        await auth.setCustomUserClaims(uid, { role });
        console.log(`Successfully set role '${role}' for user ${uid}`);
        process.exit(0);
    } catch (error) {
        console.error("Error setting claims:", error);
        process.exit(1);
    }
}

setRoles();
