const fs = require('fs');
const glob = require('glob');

// We will find the compiled files
const filesToModify = [
  '.next/server/app/page.js',
  ...glob.sync('.next/static/chunks/app/page-*.js')
];

let successCount = 0;

filesToModify.forEach(file => {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf-8');
    
    // 1. Move the search planner down (from -mt-8 to mt-0)
    content = content.replace(/-mt-8/g, 'mt-0');
    content = content.replace(/sm:-mt-8/g, 'sm:mt-0');

    // 2. Replace the SVG with a cooler dark-theme map animation
    // The current SVG in the code might be minified React.createElement or JSX.
    // Let's just find the whole SVG tag or its React equivalent.
    // In compiled React (server side), it might be an HTML string or an array of React elements.
    // Let's use a regex to target the `<svg ...</svg>` string if it's SSR, or the React element structure.
    
    fs.writeFileSync(file, content);
    successCount++;
});

console.log(`Modified ${successCount} files.`);
