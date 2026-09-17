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
    
    // Add rounded-[24px] to the hero section background
    content = content.replace(/bg-navy-900 px-5 pb-8 pt-8/g, 'bg-navy-900 rounded-[24px] px-5 pb-8 pt-8');

    fs.writeFileSync(file, content);
    successCount++;
});

console.log(`Radius added across ${successCount} files.`);
