const fs = require('fs');
const path = require('path');

const basePath = "g:\\ECOCLEAN\\NEW";

// Get all HTML files except index.html, booking-section-hu.html, and content-gyor.html
const files = fs.readdirSync(basePath)
    .filter(file => file.endsWith('.html'))
    .filter(file => !['index.html', 'booking-section-hu.html', 'content-gyor.html', 'matractisztitas-gyor.html'].includes(file));

console.log(`Found ${files.length} HTML files to process\n`);

let processedCount = 0;
let skippedCount = 0;

files.forEach(filename => {
    const filePath = path.join(basePath, filename);

    try {
        // Read file with UTF-8 encoding
        let content = fs.readFileSync(filePath, 'utf8');

        // Check if dividers already exist
        if (content.includes('section-divider')) {
            console.log(`⊘ Skipped: ${filename} (already has dividers)`);
            skippedCount++;
            return;
        }

        // Add divider after each </section> tag, except:
        // - The last section before </footer>
        // - Sections that are followed immediately by another section without whitespace

        // Strategy: Add divider after every </section> that is NOT followed by </footer> within next 200 chars
        const updatedContent = content.replace(
            /<\/section>(\s*(?!<footer))/g,
            (match, whitespace) => {
                // Check if this is right before footer
                const afterMatch = content.substring(content.indexOf(match) + match.length, content.indexOf(match) + match.length + 300);
                if (afterMatch.trim().startsWith('<footer')) {
                    return match; // Don't add divider before footer
                }
                return `</section>\n\n    <div class="section-divider"></div>${whitespace}`;
            }
        );

        // Write back with UTF-8 encoding
        fs.writeFileSync(filePath, updatedContent, 'utf8');

        console.log(`✓ Updated: ${filename}`);
        processedCount++;
    } catch (error) {
        console.error(`✗ Error updating ${filename}:`, error.message);
    }
});

console.log(`\n✅ Processing complete!`);
console.log(`   Processed: ${processedCount} files`);
console.log(`   Skipped: ${skippedCount} files`);
console.log(`   Total: ${files.length} files`);
