
import 'dotenv/config';
import { getDb, Collections } from '../src/lib/firebase';
import { Firestore } from 'firebase-admin/firestore';

const KEEP_COLLECTIONS = new Set([
    Collections.USERS,
    Collections.SALESPERSONS,
    Collections.CUSTOMERS,
    Collections.RATE_CARDS,
]);

async function cleanupDatabase() {
    console.log('Starting database cleanup...');

    try {
        const db = getDb();
        const collections = await db.listCollections();

        console.log(`Found ${collections.length} collections.`);

        for (const collection of collections) {
            if (KEEP_COLLECTIONS.has(collection.id as any)) {
                console.log(`- Skipping (keeping): ${collection.id}`);
                continue;
            }

            console.log(`- Deleting: ${collection.id}...`);

            // Use recursiveDelete to clean up documents and subcollections efficiently
            await db.recursiveDelete(collection);

            console.log(`  ✓ Deleted: ${collection.id}`);
        }

        console.log('\nDatabase cleanup completed successfully.');

    } catch (error) {
        console.error('Error cleaning database:', error);
        process.exit(1);
    }
}

cleanupDatabase();
