const fs = require('fs');
const glob = require('glob');

const filesToModify = [
  '.next/server/app/page.js',
  ...glob.sync('.next/static/chunks/app/page-*.js')
];

let successCount = 0;

// The SVG we generated earlier using modify_map_svg.js, we will match and replace it
// with an even simpler static/minimalist background.
const minimalistSvg = `<svg class="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-30" viewBox="0 0 1240 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255, 255, 255, 0.1)" stroke-width="1"/></pattern><rect width="100%" height="100%" fill="url(#grid)" /><path d="M-40 362C178 188 284 482 510 312S812 76 1040 212s248 18 330-132" fill="none" stroke="rgba(249,115,22,0.6)" stroke-width="2" stroke-dasharray="10 12"></path><circle cx="510" cy="312" r="6" fill="#f97316"></circle><circle cx="1040" cy="212" r="6" fill="#f97316"></circle></svg>`;

filesToModify.forEach(file => {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf-8');
    
    // Replace SVG
    const svgRegex = /<svg class="pointer-events-none absolute inset-0 -z-10 h-full w-full[^>]*>[\s\S]*?<\/svg>/g;
    content = content.replace(svgRegex, minimalistSvg);
    
    fs.writeFileSync(file, content);
    successCount++;
});

console.log(`SVG simplified across ${successCount} files.`);
