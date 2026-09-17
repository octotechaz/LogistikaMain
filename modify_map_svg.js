const fs = require('fs');
const glob = require('glob');

const filesToModify = [
  '.next/server/app/page.js',
  ...glob.sync('.next/static/chunks/app/page-*.js')
];

// Glowing animated route with map grid background and connecting glowing nodes
const coolMapAnimationSvg = `<svg class="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-60" viewBox="0 0 1240 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.05)" stroke-width="1"/>
    </pattern>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
    <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f97316" stop-opacity="0.2"/>
      <stop offset="50%" stop-color="#f97316" stop-opacity="1"/>
      <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.8"/>
    </linearGradient>
  </defs>

  <rect width="100%" height="100%" fill="url(#grid)" />

  <style>
    @keyframes dash {
      to {
        stroke-dashoffset: -1000;
      }
    }
    @keyframes pulse-1 {
      0%, 100% { transform: scale(1); opacity: 0.8; }
      50% { transform: scale(1.6); opacity: 0.2; }
    }
    @keyframes pulse-2 {
      0%, 100% { transform: scale(1); opacity: 0.8; }
      50% { transform: scale(1.6); opacity: 0.2; }
    }
    .flow-line {
      stroke-dasharray: 12, 12;
      animation: dash 20s linear infinite;
    }
    .node-pulse-1 {
      transform-origin: 220px 340px;
      animation: pulse-1 2.5s ease-in-out infinite;
    }
    .node-pulse-2 {
      transform-origin: 620px 180px;
      animation: pulse-2 2.5s ease-in-out infinite 0.8s;
    }
    .node-pulse-3 {
      transform-origin: 1020px 260px;
      animation: pulse-1 2.5s ease-in-out infinite 1.6s;
    }
  </style>

  <!-- Route Lines -->
  <path d="M 220 340 Q 420 420 620 180 T 1020 260" fill="none" stroke="rgba(249, 115, 22, 0.2)" stroke-width="6" filter="url(#glow)"/>
  <path class="flow-line" d="M 220 340 Q 420 420 620 180 T 1020 260" fill="none" stroke="url(#routeGrad)" stroke-width="3"/>

  <!-- City/Node 1 (Baku) -->
  <circle class="node-pulse-1" cx="220" cy="340" r="14" fill="#f97316" />
  <circle cx="220" cy="340" r="6" fill="#ffffff" filter="url(#glow)"/>

  <!-- City/Node 2 (Ganja) -->
  <circle class="node-pulse-2" cx="620" cy="180" r="14" fill="#f97316" />
  <circle cx="620" cy="180" r="6" fill="#ffffff" filter="url(#glow)"/>

  <!-- City/Node 3 (Tbilisi/Transit) -->
  <circle class="node-pulse-3" cx="1020" cy="260" r="14" fill="#38bdf8" />
  <circle cx="1020" cy="260" r="6" fill="#ffffff" filter="url(#glow)"/>
</svg>`;

// We will find the exact SVG section and swap it out
filesToModify.forEach(file => {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf-8');
    
    // Replace SVG
    const svgRegex = /<svg class="pointer-events-none absolute inset-0 -z-10 h-full w-full[^>]*>[\s\S]*?<\/svg>/g;
    content = content.replace(svgRegex, coolMapAnimationSvg.replace(/\n\s*/g, ' '));
    
    fs.writeFileSync(file, content);
});

console.log('Map SVG updated successfully with interactive smooth-glowing dark route design.');
