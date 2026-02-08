const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DB_FILE = path.join(__dirname, '../mock-db.json');

// 1. Read the current DB
if (!fs.existsSync(DB_FILE)) {
    console.error('No mock-db.json found!');
    process.exit(1);
}

const originalContent = fs.readFileSync(DB_FILE, 'utf-8');
const data = JSON.parse(originalContent);

// 2. Clear users (sensitive login info)
const originalUsers = data.users;
data.users = []; // Clear users completely
// Or maybe keep admin but clear password? Ideally clear all users for safety as requested "except login id"

// 3. Write sanitized DB
fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

try {
    console.log('Sanitized mock-db.json (removed users)...');

    // 4. Git operations
    execSync('git add .', { stdio: 'inherit' });
    execSync('git commit -m "Deploy: Update data (excluding sensitive login info)"', { stdio: 'inherit' });

    console.log('Pushing to main...');
    execSync('git push origin main', { stdio: 'inherit' });

    console.log('Deploy successful!');
} catch (error) {
    console.error('Deploy failed:', error.message);
} finally {
    // 5. Restore original DB
    console.log('Restoring mock-db.json with original users...');
    // We restore the memory object instead of originalContent to keep other updates if any happened (unlikely during this script)
    // Actually, we want to restore exact original users.
    data.users = originalUsers;
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    console.log('Restored.');
}
