const fs = require('fs');
const glob = require('glob');

const filesToModify = [
  '.next/server/app/page.js',
  ...glob.sync('.next/static/chunks/app/page-*.js')
];

let successCount = 0;

filesToModify.forEach(file => {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf-8');
    
    // Remove shadow-[0_24px_56px_rgba(16,32,51,0.18)] from hero section
    content = content.replace(/shadow-\[0_24px_56px_rgba\(16,32,51,0\.18\)\]/g, '');
    // Remove shadow-[0_18px_44px_rgba(25,28,29,0.10)] from search planner
    content = content.replace(/shadow-\[0_18px_44px_rgba\(25,28,29,0\.10\)\]/g, '');

    fs.writeFileSync(file, content);
    successCount++;
});

console.log(`Shadow removed across ${successCount} files.`);
