
import 'dotenv/config';
import { getDb, Collections } from '../src/lib/firebase';

async function checkData() {
    const db = getDb();

    const salespersons = await db.collection(Collections.SALESPERSONS).get();
    console.log(`Salespersons count: ${salespersons.size}`);
    salespersons.docs.forEach(doc => {
        console.log(` - ${doc.id}: ${JSON.stringify(doc.data())}`);
    });

    const customers = await db.collection(Collections.CUSTOMERS).get();
    console.log(`Customers count: ${customers.size}`);
    if (customers.size > 0) {
        const sample = customers.docs[0].data();
        console.log(` - Sample Customer: ${JSON.stringify(sample)}`);
    }
}

checkData();
