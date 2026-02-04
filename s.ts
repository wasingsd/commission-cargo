import { firestore } from './src/lib/firestore';

async function check() {
    try {
        const active = await firestore.rateCards.findActive();
        if (!active) {
            console.log('NO_ACTIVE_RATE_CARD');
            return;
        }
        const full = await firestore.rateCards.findById(active.id, true);
        console.log('RATES_JSON_START');
        console.log(JSON.stringify(full?.rows || []));
        console.log('RATES_JSON_END');
    } catch (e: any) {
        console.log('ERROR: ' + e.message);
    }
}

check();
