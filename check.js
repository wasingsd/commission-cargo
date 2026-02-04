const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

async function check() {
    try {
        const serviceAccountPath = path.join(process.cwd(), 'commission-cargo-firebase-adminsdk-fbsvc-5d1acb3134.json');
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });

        const db = admin.firestore();
        const snapshot = await db.collection('rateCards').where('status', '==', 'ACTIVE').limit(1).get();

        if (snapshot.empty) {
            console.log('NO_ACTIVE_RATE_CARD');
            return;
        }

        const activeDoc = snapshot.docs[0];
        const rowsSnapshot = await activeDoc.ref.collection('rows').get();

        let output = '';
        rowsSnapshot.forEach(doc => {
            output += JSON.stringify(doc.data()) + '\n';
        });
        fs.writeFileSync('rates_output.txt', output);
        console.log('DONE');

    } catch (e) {
        fs.writeFileSync('rates_output.txt', 'ERROR: ' + e.message);
    }
}

check();
