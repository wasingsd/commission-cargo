require('dotenv').config();
const pk = process.env.FIREBASE_PRIVATE_KEY || '';
console.log('LENGTH:', pk.length);
if (pk.length > 0) {
    console.log('STARTS_WITH:', pk.substring(0, 20));
    console.log('ENDS_WITH:', pk.substring(pk.length - 20));
    const chars = [];
    for (let i = 0; i < pk.length; i++) {
        const code = pk.charCodeAt(i);
        if (code > 127) {
            chars.push({ pos: i, code: code });
        }
    }
    console.log('NON_ASCII:', JSON.stringify(chars));
} else {
    console.log('PK_EMPTY');
}
