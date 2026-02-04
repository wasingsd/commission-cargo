const fs = require('fs');
const path = require('path');
const serviceAccountPath = path.join(process.cwd(), 'commission-cargo-firebase-adminsdk-fbsvc-5d1acb3134.json');

if (fs.existsSync(serviceAccountPath)) {
    const content = fs.readFileSync(serviceAccountPath, 'utf8');
    try {
        const json = JSON.parse(content);
        const pk = json.private_key || '';
        console.log('JSON_FOUND: YES');
        console.log('PK_LENGTH:', pk.length);
        console.log('PK_HEADER:', pk.substring(0, 30));
        console.log('PK_FOOTER:', pk.substring(pk.length - 30));

        const chars = [];
        for (let i = 0; i < pk.length; i++) {
            if (pk.charCodeAt(i) > 127) chars.push({ i, c: pk.charCodeAt(i) });
        }
        console.log('NON_ASCII:', JSON.stringify(chars));
    } catch (e) {
        console.log('JSON_PARSE_ERROR:', e.message);
    }
} else {
    console.log('JSON_FOUND: NO');
}
