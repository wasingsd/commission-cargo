// src/lib/firebase.ts
// Firebase Admin SDK initialization

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

let app: App;
let db: Firestore;

function getFirebaseApp(): App {
    if (getApps().length === 0) {
        // Try to load from service account file first (more robust on Windows)
        const serviceAccountPath = path.join(process.cwd(), 'commission-cargo-firebase-adminsdk-fbsvc-5d1acb3134.json');

        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
            app = initializeApp({
                credential: cert(serviceAccount),
            });
        } else {
            // Fallback to environment variables
            let privateKey = process.env.FIREBASE_PRIVATE_KEY;

            if (privateKey) {
                // Handle cases where the key might be wrapped in quotes
                if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
                    privateKey = privateKey.substring(1, privateKey.length - 1);
                }
                // Handle both literal \n and actual newlines
                privateKey = privateKey.replace(/\\n/g, '\n');
            }

            if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
                throw new Error(
                    'Missing Firebase credentials. No service account file found and environment variables are missing.'
                );
            }

            app = initializeApp({
                credential: cert({
                    projectId: process.env.FIREBASE_PROJECT_ID?.trim(),
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL?.trim(),
                    privateKey: privateKey.trim(),
                }),
            });
        }
    } else {
        app = getApps()[0];
    }
    return app;
}

export function getDb(): Firestore {
    if (!db) {
        getFirebaseApp();
        db = getFirestore();
        // Prevent "Cannot use undefined as a Firestore value" errors
        db.settings({ ignoreUndefinedProperties: true });
    }
    return db;
}

// Collection names as constants
export const Collections = {
    USERS: 'users',
    SALESPERSONS: 'salespersons',
    CUSTOMERS: 'customers',
    RATE_CARDS: 'rateCards',
    SHIPMENTS: 'shipments',
    AUDIT_LOGS: 'auditLogs',
} as const;

export { app, db };
