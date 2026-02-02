// src/lib/firebase.ts
// Firebase Admin SDK initialization

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let app: App;
let db: Firestore;

function getFirebaseApp(): App {
    if (getApps().length === 0) {
        // Initialize Firebase Admin
        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

        if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
            throw new Error(
                'Missing Firebase credentials. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in your .env file.'
            );
        }

        app = initializeApp({
            credential: cert({
                projectId: process.env.FIREBASE_PROJECT_ID || 'commission-cargo',
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey,
            }),
        });
    } else {
        app = getApps()[0];
    }
    return app;
}

export function getDb(): Firestore {
    if (!db) {
        getFirebaseApp();
        db = getFirestore();
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
