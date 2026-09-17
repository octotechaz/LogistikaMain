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
    
    // We target the SVG JSX string generation directly inside React elements
    // In minified build it often looks like: viewBox:"0 0 1240 520"... <path d="M-40...
    
    const originalPathsRegex = /<path\s+d="M-40\s+362C178\s+188\s+284\s+482\s+510\s+312S812\s+76\s+1040\s+212s248\s+18\s+330-132"[^>]*><\/path><path\s+d="M-28\s+154c186-78\s+276\s+116\s+454\s+50s258-218\s+440-148\s+192\s+258\s+402\s+158"[^>]*><\/path><circle\s+cx="510"\s+cy="312"\s+r="8"[^>]*><\/circle><circle\s+cx="866"\s+cy="56"\s+r="6"[^>]*><\/circle><circle\s+cx="1040"\s+cy="212"\s+r="6"[^>]*><\/circle>/g;

    const minimalistReplacement = `<path d="M-40 362C178 188 284 482 510 312S812 76 1040 212s248 18 330-132" fill="none" stroke="currentColor" stroke-width="2" stroke-opacity="0.3"></path><circle cx="510" cy="312" r="6" fill="#f97316"></circle><circle cx="1040" cy="212" r="6" fill="#f97316"></circle>`;

    if (originalPathsRegex.test(content)) {
        content = content.replace(originalPathsRegex, minimalistReplacement);
        fs.writeFileSync(file, content);
        successCount++;
        console.log(`Replaced in ${file}`);
    } else {
        // Fallback: It might be built with jsxRuntime.jsx calls instead of a raw template literal.
        // Let's aggressively wipe out the second path and 866 circle.
        if (content.includes('M-28 154c186-78')) {
            content = content.replace(/\{d:"M-28 154c186-78 276 116 454 50s258-218 440-148 192 258 402 158"[^}]*\}/g, '{d:"", fill:"none"}');
            content = content.replace(/\{cx:"866",cy:"56",r:"6"[^}]*\}/g, '{cx:"0",cy:"0",r:"0",fill:"none"}');
            fs.writeFileSync(file, content);
            successCount++;
            console.log(`Replaced (JSX struct) in ${file}`);
        }
    }
});

console.log(`SVG logic applied across ${successCount} files.`);
