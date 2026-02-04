const fs = require('fs');
const path = require('path');

const filename = 'commission-cargo-firebase-adminsdk-fbsvc-5d1acb3134.json';
const filepath = path.join(process.cwd(), filename);

if (!fs.existsSync(filepath)) {
    console.log('FILE_NOT_FOUND:', filepath);
    process.exit(1);
}

const raw = fs.readFileSync(filepath);
console.log('RAW_SIZE:', raw.length);
console.log('FIRST_4_BYTES:', Array.from(raw.slice(0, 4)).map(b => b.toString(16)).join(' '));

try {
    const content = raw.toString('utf8');
    const data = JSON.parse(content);
    let pk = data.private_key || '';

    console.log('PK_LENGTH:', pk.length);
    console.log('PK_HEADER:', pk.substring(0, 40));
    console.log('PK_FOOTER:', pk.substring(pk.length - 40));

    const bad = [];
    for (let i = 0; i < pk.length; i++) {
        const c = pk.charCodeAt(i);
        // Printable ASCII are 32-126. We also allow \n (10) and \r (13).
        if (c > 126 || (c < 32 && c !== 10 && c !== 13)) {
            bad.push({ pos: i, charCode: c, hex: c.toString(16), char: pk[i] });
        }
    }

    if (bad.length > 0) {
        console.log('ILLEGAL_CHARACTERS_FOUND:', bad.length);
        console.log('EXAMPLES:', JSON.stringify(bad.slice(0, 10)));
    } else {
        console.log('NO_ILLEGAL_CHARACTERS_FOUND_IN_PK');
    }

    // Check if the whole file has weirdness
    const fileBad = [];
    for (let i = 0; i < content.length; i++) {
        const c = content.charCodeAt(i);
        if (c > 127) fileBad.push({ pos: i, code: c });
    }
    console.log('TOTAL_FILE_NON_ASCII:', fileBad.length);

} catch (e) {
    console.log('ERROR:', e.message);
}
