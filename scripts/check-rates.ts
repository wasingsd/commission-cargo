import { firestore } from '../src/lib/firestore';

async function check() {
    try {
        const active = await firestore.rateCards.findActive();
        if (!active) {
            console.log('No active rate card found');
            return;
        }
        console.log('Active Rate Card ID:', active.id);
        console.log('Name:', active.name);

        const full = await firestore.rateCards.findById(active.id, true);
        console.log('Rates:', JSON.stringify(full?.rows, null, 2));
    } catch (e) {
        console.error(e);
    }
}

check();
