const fs = require('fs');
const str = fs.readFileSync('src/App.tsx').toString('utf8');
const lines = str.split('\n');

// Print lines 545-700 looking for where handleEndTurn's function body ends 
// and where the closing }; of handleActionClick might be
console.log('\n--- Lines 545-700 ---');
for (let i = 544; i < 700; i++) {
    console.log(`L${i+1}: ${lines[i]}`);
}
