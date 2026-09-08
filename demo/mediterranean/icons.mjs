// Original, consistent 24px vector drawings. Decorative uses stay out of the accessibility tree.
const shapes={
 arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',
 phone:'<path d="m7 3-3 2c-2 5 10 17 15 15l2-3-5-4-2 2c-2-1-4-3-5-5l2-2-4-5Z"/>',
 leaf:'<path d="M20 3c1 10-2 17-9 17-5 0-8-5-5-9 3-4 8-2 14-8Z"/><path d="M4 22 16 10"/>',
 home:'<path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-7h6v7"/>',
 sofa:'<path d="M5 12V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v4M5 19v2m14-2v2M3 12a2 2 0 0 1 4 0v3h10v-3a2 2 0 0 1 4 0v7H3v-7Zm9-7v8"/>',
 armchair:'<path d="M7 11V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v4M5 19v2m14-2v2M3 12a2 2 0 0 1 4 0v3h10v-3a2 2 0 0 1 4 0v7H3v-7Z"/>',
 dining:'<path d="M7 4h10v9H7zM5 17h14M6 17l-1 5m13-5 1 5M7 13l-2 4m12-4 2 4M10 4v9m4-9v9"/>',
 office:'<rect x="7" y="3" width="10" height="10" rx="3"/><path d="M12 13v8m-6-6h12M3 10v5h3m15-5v5h-3M6 22l6-3 6 3"/>',
 bed:'<path d="M3 10V5m18 5V5M3 18v3m18-3v3M3 9h18v9H3zM5 9V6h6v3m2 0V6h6v3M3 14h18"/>',
 shield:'<path d="M12 2 21 6v6c0 5-6 9-9 10-3-1-9-5-9-10V6l9-4Z"/><path d="m8 12 3 3 5-6"/>',
 layers:'<path d="m2 8 10-5 10 5-10 5L2 8Zm0 5 10 5 10-5M2 18l10 5 10-5"/>',
 drop:'<path d="M12 2c-2 4-7 8-7 13a7 7 0 0 0 14 0c0-5-5-9-7-13Z"/><path d="M9 15c0 2 1 3 3 3"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/>',
 time:'<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>',
 pin:'<path d="M19 10c0 6-7 12-7 12S5 16 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/>',
 check:'<path d="m5 12 5 5L20 7"/>',
 star:'<path d="m12 2 3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-7Z"/>',
 textile:'<path d="M4 3v18M9 3v18m6-18v18m5-18v18M2 6h20M2 12h20M2 18h20"/>',
 microscope:'<path d="m9 3 7 4-5 9-7-4 5-9Zm-2 12-1 2m9-7a6 6 0 0 1-3 11M3 21h18M3 17h8"/>',
 sparkle:'<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 book:'<path d="M12 5C8 2 4 3 2 4v16c3-2 7-1 10 1 3-2 7-3 10-1V4c-2-1-6-2-10 1Zm0 0v16"/>',
 wind:'<path d="M3 8h12a3 3 0 1 0-3-3M2 12h18a3 3 0 1 1-3 3M4 16h5a3 3 0 1 1-3 3"/>',
 mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>'
};
export function icon(name,extra=''){return `<svg class="med-icon ${extra}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${shapes[name]||shapes.sparkle}</svg>`;}
export {shapes};
