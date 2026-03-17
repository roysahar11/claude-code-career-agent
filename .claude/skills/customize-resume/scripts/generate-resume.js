#!/usr/bin/env node

/**
 * Resume HTML Generator
 *
 * Generates HTML resume from JSON data. Use the global html-to-pdf skill to convert to PDF.
 *
 * Usage:
 *   node generate-resume.js <resume-data.json> <output.html>
 *
 * Then convert to PDF:
 *   node ~/.claude/skills/html-to-pdf/scripts/convert.js <output.html> <output.pdf>
 */

const fs = require('fs');
const path = require('path');

// Get script directory for template path
const SCRIPT_DIR = __dirname;
const TEMPLATE_PATH = path.join(SCRIPT_DIR, '..', 'templates', 'resume-template.html');

/**
 * Renders flexible content that can be either a plain string or an array of structured items.
 * Each item can have: year, title, organization, description (all optional).
 */
function renderFlexibleContent(content, { inline = false } = {}) {
    if (!content) return '';
    if (typeof content === 'string') {
        return `<p class="flex-text">${content}</p>`;
    }
    if (Array.isArray(content) && content.length) {
        return content.map(item => {
            if (inline && (item.year || item.title)) {
                // Inline layout: year | title on one line, description below
                const parts = [];
                const rowParts = [];
                if (item.year) rowParts.push(`<span class="edu-year">${item.year}</span>`);
                if (item.title) rowParts.push(`<span class="edu-title">${item.title}</span>`);
                parts.push(`<div class="edu-row">${rowParts.join(' ')}</div>`);
                if (item.organization) parts.push(`<div class="flex-item-org">${item.organization}</div>`);
                if (item.description) parts.push(`<div class="edu-description">${item.description}</div>`);
                return `<div class="flex-item">${parts.join('\n                        ')}</div>`;
            }
            // Stacked layout (original)
            const parts = [];
            if (item.year) parts.push(`<div class="education-year">${item.year}</div>`);
            if (item.title) parts.push(`<div class="education-title">${item.title}</div>`);
            if (item.organization) parts.push(`<div class="flex-item-org">${item.organization}</div>`);
            if (item.description) parts.push(`<div class="flex-item-description">${item.description}</div>`);
            return `<div class="flex-item">${parts.join('\n                        ')}</div>`;
        }).join('');
    }
    return '';
}

function generateResumeHtml(dataPath, outputPath) {
    // Read the template
    let template = fs.readFileSync(TEMPLATE_PATH, 'utf8');

    // Read the resume data
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    // Generate sidebar sections — each only renders if it has content

    const skillsSectionHtml = data.skills && data.skills.length ? `
                <section>
                    <h2 class="sidebar-title">Technical Skills</h2>
                    ${data.skills.map(skill => `
                    <div class="skill-item">
                        <strong>${skill.category}:</strong> <span>${skill.items}</span>
                    </div>`).join('')}
                </section>` : '';

    const certsTitle = data.certificationsTitle || 'Certifications & Training';
    const certsSectionHtml = data.certifications && data.certifications.length ? `
                <section>
                    <h2 class="sidebar-title">${certsTitle}</h2>
                    ${data.certifications.map(cert => `
                    <div class="certification-item">${cert}</div>`).join('')}
                </section>` : '';

    const eduContentHtml = renderFlexibleContent(data.education, { inline: true });
    const eduSectionHtml = eduContentHtml ? `
                <section>
                    <h2 class="sidebar-title">Education</h2>
                    ${eduContentHtml}
                </section>` : '';

    // Generate experience HTML
    const expHtml = data.experience.map(exp => `
        <div class="experience-item">
            <div class="experience-title-row">
                <span class="experience-date">${exp.date}</span>
                <span class="experience-role">${exp.role}</span>
            </div>
            ${exp.company ? `<div class="experience-company">${exp.company}</div>` : ''}
            <ul class="experience-bullets">
                ${exp.bullets.map(b => `<li>${b}</li>`).join('\n                ')}
            </ul>
        </div>
    `).join('\n');

    // Generate hobbies section HTML (only if hobbies provided)
    const hobbiesTitle = data.hobbiesTitle || 'Other Expertise / Hobbies';
    const hobbiesSectionHtml = data.hobbies ? `
                <section>
                    <h2 class="sidebar-title">${hobbiesTitle}</h2>
                    <p class="hobbies">${data.hobbies}</p>
                </section>` : '';

    // Generate military service section HTML (optional, flexible content)
    const militaryContentHtml = renderFlexibleContent(data.militaryService);
    const militaryServiceSectionHtml = militaryContentHtml ? `
                <section>
                    <h2 class="sidebar-title">Military Service</h2>
                    ${militaryContentHtml}
                </section>` : '';

    // Replace all placeholders
    template = template
        .replace(/\{\{NAME\}\}/g, data.name)
        .replace(/\{\{TITLE\}\}/g, data.title)
        .replace(/\{\{PHONE\}\}/g, data.phone)
        .replace(/\{\{EMAIL\}\}/g, data.email)
        .replace(/\{\{LINKEDIN_URL\}\}/g, data.linkedin.url)
        .replace(/\{\{LINKEDIN_DISPLAY\}\}/g, data.linkedin.display)
        .replace(/\{\{GITHUB_URL\}\}/g, data.github.url)
        .replace(/\{\{GITHUB_DISPLAY\}\}/g, data.github.display)
        .replace(/\{\{SUMMARY\}\}/g, data.summary)
        .replace(/\{\{SKILLS_SECTION\}\}/g, skillsSectionHtml)
        .replace(/\{\{CERTIFICATIONS_SECTION\}\}/g, certsSectionHtml)
        .replace(/\{\{EDUCATION_SECTION\}\}/g, eduSectionHtml)
        .replace(/\{\{HOBBIES_SECTION\}\}/g, hobbiesSectionHtml)
        .replace(/\{\{MILITARY_SERVICE_SECTION\}\}/g, militaryServiceSectionHtml)
        .replace(/\{\{EXPERIENCE_CONTENT\}\}/g, expHtml);

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (outputDir && !fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write HTML file
    fs.writeFileSync(outputPath, template);

    console.log(`HTML generated: ${outputPath}`);
    return outputPath;
}

// Main
const args = process.argv.slice(2);
if (args.length < 2) {
    console.error('Usage: node generate-resume.js <resume-data.json> <output.html>');
    console.error('');
    console.error('Then convert to PDF:');
    console.error('  node ~/.claude/skills/html-to-pdf/scripts/convert.js <output.html> <output.pdf>');
    process.exit(1);
}

generateResumeHtml(args[0], args[1]);
