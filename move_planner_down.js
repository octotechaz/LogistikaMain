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
    
    // Add positive top margin to push it down further
    content = content.replace(/z-10 mt-0/g, 'z-10 mt-6');
    content = content.replace(/sm:mt-0/g, 'sm:mt-8');

    fs.writeFileSync(file, content);
    successCount++;
});

console.log(`Margin updated across ${successCount} files.`);
