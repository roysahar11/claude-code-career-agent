#!/usr/bin/env node

/**
 * Resume Fit Checker & Auto-Scaler
 *
 * Checks if HTML content fits on one A4 page and auto-scales fonts.
 * Uses Puppeteer to measure actual rendered content height.
 *
 * Usage:
 *   node check-fit.js <input.html> [--fix]
 *
 * Options:
 *   --fix    Auto-adjust the HTML file to fit content optimally
 *
 * Returns:
 *   - Exit code 0: Content fits
 *   - Exit code 1: Content overflows
 *   - Prints scale factor and space info
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// A4 dimensions in pixels at 96 DPI
const A4_HEIGHT_MM = 297;
const A4_WIDTH_MM = 210;
const MM_TO_PX = 96 / 25.4; // 96 DPI
const A4_HEIGHT_PX = A4_HEIGHT_MM * MM_TO_PX;

// Padding from template (8mm top + 8mm bottom = 16mm)
const VERTICAL_PADDING_MM = 16;
const USABLE_HEIGHT_PX = (A4_HEIGHT_MM - VERTICAL_PADDING_MM) * MM_TO_PX;

// Font size constraints
const MIN_SCALE = 0.85;  // Don't go below 85% of base sizes
const MAX_SCALE = 1.17;  // Don't go above 117% of base sizes (higher causes header issues)
const TARGET_FILL = 1.00; // Target 100% page fill - margins provide buffer

async function measureContent(htmlPath) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Set viewport to A4 width
    await page.setViewport({
        width: Math.round(A4_WIDTH_MM * MM_TO_PX),
        height: Math.round(A4_HEIGHT_PX),
        deviceScaleFactor: 1
    });

    // Load the HTML file
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // Wait for fonts to load
    await page.evaluateHandle('document.fonts.ready');

    // Measure the actual content height by finding the lowest content element
    const measurements = await page.evaluate(() => {
        const pageEl = document.querySelector('.page');
        if (!pageEl) {
            return { error: 'No .page element found' };
        }

        // Get the actual usable height (clientHeight minus padding)
        const style = getComputedStyle(pageEl);
        const paddingTop = parseFloat(style.paddingTop);
        const paddingBottom = parseFloat(style.paddingBottom);
        const containerHeight = pageEl.clientHeight - paddingTop - paddingBottom;

        // Find the actual bottom of content (not flex-expanded containers)
        const pageRect = pageEl.getBoundingClientRect();
        const pageTop = pageRect.top + paddingTop;

        // Check both sidebar and main for the lowest content
        const sidebar = pageEl.querySelector('.sidebar');
        const main = pageEl.querySelector('.main');

        // Get sidebar content bottom
        let sidebarBottom = 0;
        const sidebarSections = sidebar.querySelectorAll('section');
        sidebarSections.forEach(section => {
            sidebarBottom = Math.max(sidebarBottom, section.getBoundingClientRect().bottom);
        });

        // Get main content bottom
        let mainBottom = 0;
        const lastExp = main.querySelector('.experience-item:last-child');
        if (lastExp) {
            mainBottom = lastExp.getBoundingClientRect().bottom;
        }

        const sidebarHeight = sidebarBottom - pageTop;
        const mainHeight = mainBottom - pageTop;
        let lowestBottom = Math.max(sidebarBottom, mainBottom);
        const columnDiff = Math.abs(sidebarHeight - mainHeight);

        // Also check for footer sections outside the grid (e.g., certifications-footer)
        const footerSections = pageEl.querySelectorAll('.certifications-footer');
        footerSections.forEach(section => {
            lowestBottom = Math.max(lowestBottom, section.getBoundingClientRect().bottom);
        });

        const contentHeight = lowestBottom - pageTop;

        // Get computed styles to understand current font sizes
        const bodyStyle = window.getComputedStyle(document.body);
        const baseFontSize = parseFloat(bodyStyle.fontSize);

        return {
            contentHeight: Math.round(contentHeight),
            containerHeight: Math.round(containerHeight),
            sidebarHeight: Math.round(sidebarHeight),
            mainHeight: Math.round(mainHeight),
            columnDiff: Math.round(columnDiff),
            baseFontSize,
            overflow: contentHeight > containerHeight,
            overflowPx: Math.round(contentHeight - containerHeight),
            spaceRemaining: Math.round(containerHeight - contentHeight)
        };
    });

    await browser.close();
    return measurements;
}

async function autoScale(htmlPath) {
    let html = fs.readFileSync(htmlPath, 'utf8');

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.setViewport({
        width: Math.round(A4_WIDTH_MM * MM_TO_PX),
        height: Math.round(A4_HEIGHT_PX),
        deviceScaleFactor: 1
    });

    // Helper to measure column heights and content
    async function measureColumns(testHtml) {
        await page.setContent(testHtml, { waitUntil: 'domcontentloaded', timeout: 10000 });
        await new Promise(r => setTimeout(r, 300));

        return await page.evaluate(() => {
            const pageEl = document.querySelector('.page');
            const style = getComputedStyle(pageEl);
            const paddingTop = parseFloat(style.paddingTop);
            const paddingBottom = parseFloat(style.paddingBottom);
            const containerHeight = pageEl.clientHeight - paddingTop - paddingBottom;

            const pageRect = pageEl.getBoundingClientRect();
            const pageTop = pageRect.top + paddingTop;

            const sidebar = pageEl.querySelector('.sidebar');
            const main = pageEl.querySelector('.main');

            // Get sidebar content bottom
            let sidebarBottom = 0;
            const sidebarSections = sidebar.querySelectorAll('section');
            sidebarSections.forEach(section => {
                sidebarBottom = Math.max(sidebarBottom, section.getBoundingClientRect().bottom);
            });

            // Get main content bottom
            let mainBottom = 0;
            const lastExp = main.querySelector('.experience-item:last-child');
            if (lastExp) {
                mainBottom = lastExp.getBoundingClientRect().bottom;
            }

            const sidebarHeight = sidebarBottom - pageTop;
            const mainHeight = mainBottom - pageTop;
            let lowestBottom = Math.max(sidebarBottom, mainBottom);

            // Also check for footer sections outside the grid
            const footerSections = pageEl.querySelectorAll('.certifications-footer');
            footerSections.forEach(section => {
                lowestBottom = Math.max(lowestBottom, section.getBoundingClientRect().bottom);
            });

            const contentHeight = lowestBottom - pageTop;

            return {
                sidebarHeight,
                mainHeight,
                columnDiff: Math.abs(sidebarHeight - mainHeight),
                contentHeight,
                containerHeight,
                fillRatio: contentHeight / containerHeight
            };
        });
    }

    // Find optimal column width at a given scale
    async function findBestColumnWidth(baseHtml, scale) {
        const minWidth = 170;
        const maxWidth = 250;
        let bestWidth = 195;
        let bestDiff = Infinity;

        // Coarse search
        for (let width = minWidth; width <= maxWidth; width += 10) {
            const testHtml = applyScale(applyColumnWidth(baseHtml, width), scale);
            const m = await measureColumns(testHtml);

            if (m.columnDiff < bestDiff && m.fillRatio <= 1.0) {
                bestDiff = m.columnDiff;
                bestWidth = width;
            }
        }

        // Fine-tune
        for (let width = bestWidth - 8; width <= bestWidth + 8; width += 2) {
            if (width < minWidth || width > maxWidth) continue;
            const testHtml = applyScale(applyColumnWidth(baseHtml, width), scale);
            const m = await measureColumns(testHtml);

            if (m.columnDiff < bestDiff && m.fillRatio <= 1.0) {
                bestDiff = m.columnDiff;
                bestWidth = width;
            }
        }

        return { width: bestWidth, diff: bestDiff };
    }

    // Find optimal scale for a given column width
    async function findBestScale(baseHtml, columnWidth) {
        let lowScale = MIN_SCALE;
        let highScale = MAX_SCALE;
        let bestScale = 1.0;
        let bestFill = 0;

        for (let i = 0; i < 12; i++) {
            const midScale = (lowScale + highScale) / 2;
            const testHtml = applyScale(applyColumnWidth(baseHtml, columnWidth), midScale);
            const m = await measureColumns(testHtml);

            if (m.fillRatio <= 1.0 && m.fillRatio > bestFill) {
                bestScale = midScale;
                bestFill = m.fillRatio;
            }

            if ((highScale - lowScale) < 0.005) break;

            if (m.fillRatio > 1.0) {
                highScale = midScale;
            } else if (m.fillRatio < 0.99) {
                lowScale = midScale;
            } else {
                bestScale = midScale;
                break;
            }
        }

        return bestScale;
    }

    // Iteratively optimize both column width and scale together
    console.log('\n  Optimizing columns and scale together...');

    let currentWidth = 195;
    let currentScale = 1.0;

    for (let round = 1; round <= 5; round++) {
        console.log(`\n  Round ${round}:`);

        // Step 1: Find best width at current scale
        const widthResult = await findBestColumnWidth(html, currentScale);
        currentWidth = widthResult.width;
        console.log(`    Width at scale ${currentScale.toFixed(3)}: ${currentWidth}px (diff: ${Math.round(widthResult.diff)}px)`);

        // Step 2: Find best scale at this width
        currentScale = await findBestScale(html, currentWidth);

        // Measure final result
        const testHtml = applyScale(applyColumnWidth(html, currentWidth), currentScale);
        const m = await measureColumns(testHtml);

        console.log(`    Scale at width ${currentWidth}px: ${currentScale.toFixed(3)}`);
        console.log(`    Result: fill=${(m.fillRatio * 100).toFixed(1)}%, columnDiff=${Math.round(m.columnDiff)}px`);

        // Converged if columns balanced and page filled
        if (m.columnDiff < 40 && m.fillRatio > 0.97) {
            console.log(`    Converged!`);
            break;
        }
    }

    await browser.close();

    // Apply best settings and save
    const finalHtml = applyScale(applyColumnWidth(html, currentWidth), currentScale);
    fs.writeFileSync(htmlPath, finalHtml);

    return { scale: currentScale, columnWidth: currentWidth };
}

function applyScale(html, scale) {
    let result = html;

    // Scale all pt-based font sizes
    result = result.replace(/font-size:\s*([\d.]+)pt/g, (match, size) => {
        const newSize = (parseFloat(size) * scale).toFixed(1);
        return `font-size: ${newSize}pt`;
    });

    // Scale line-heights (proportionally but less aggressively)
    const lineHeightScale = 1 + (scale - 1) * 0.5; // Half the font scaling
    result = result.replace(/line-height:\s*([\d.]+)(?![\d])/g, (match, value) => {
        const newValue = (parseFloat(value) * lineHeightScale).toFixed(2);
        return `line-height: ${newValue}`;
    });

    // Scale pixel-based spacing (margins, gaps, padding) - proportionally
    const spacingScale = 1 + (scale - 1) * 0.7; // 70% of font scaling
    result = result.replace(/(margin-bottom|margin-top|gap|padding-left):\s*([\d.]+)px/g, (match, prop, value) => {
        const newValue = Math.round(parseFloat(value) * spacingScale);
        return `${prop}: ${newValue}px`;
    });

    return result;
}

function applyColumnWidth(html, sidebarWidth) {
    // Update grid-template-columns with new sidebar width
    return html.replace(
        /grid-template-columns:\s*[\d.]+px\s+1fr/g,
        `grid-template-columns: ${sidebarWidth}px 1fr`
    );
}

async function main() {
    const args = process.argv.slice(2);

    if (args.length < 1) {
        console.error('Usage: node check-fit.js <input.html> [--fix]');
        process.exit(1);
    }

    const htmlPath = args[0];
    const shouldFix = args.includes('--fix');

    if (!fs.existsSync(htmlPath)) {
        console.error(`File not found: ${htmlPath}`);
        process.exit(1);
    }

    console.log(`Checking: ${htmlPath}`);

    const measurements = await measureContent(htmlPath);

    if (measurements.error) {
        console.error(measurements.error);
        process.exit(1);
    }

    const fillPercent = (measurements.contentHeight / measurements.containerHeight * 100).toFixed(1);

    console.log(`\nMeasurements:`);
    console.log(`  Content height: ${measurements.contentHeight}px`);
    console.log(`  Container height: ${measurements.containerHeight}px`);
    console.log(`  Page fill: ${fillPercent}%`);

    if (measurements.overflow) {
        console.log(`\n❌ OVERFLOW: Content exceeds page by ${measurements.overflowPx}px`);

        if (shouldFix) {
            console.log(`\nOptimizing layout to fit...`);
            const result = await autoScale(htmlPath);
            console.log(`\n✅ Applied: column width=${result.columnWidth}px, scale=${result.scale.toFixed(3)}`);

            // Re-measure to confirm
            const newMeasurements = await measureContent(htmlPath);
            const newFill = (newMeasurements.contentHeight / newMeasurements.containerHeight * 100).toFixed(1);
            console.log(`   New page fill: ${newFill}%`);
        } else {
            console.log(`\nRun with --fix to auto-scale`);
            process.exit(1);
        }
    } else {
        const spacePercent = (measurements.spaceRemaining / measurements.containerHeight * 100).toFixed(1);
        console.log(`\n✅ Content fits! Space remaining: ${measurements.spaceRemaining}px (${spacePercent}%)`);
        console.log(`   Column heights: sidebar=${measurements.sidebarHeight}px, main=${measurements.mainHeight}px (diff: ${measurements.columnDiff}px)`);

        // Optimize if there's space remaining OR significant column imbalance
        const needsOptimization = parseFloat(spacePercent) > 3 || measurements.columnDiff >= 40;

        if (shouldFix && needsOptimization) {
            console.log(`\nOptimizing layout...`);
            const result = await autoScale(htmlPath);
            console.log(`\n✅ Applied: column width=${result.columnWidth}px, scale=${result.scale.toFixed(3)}`);

            // Re-measure to confirm
            const newMeasurements = await measureContent(htmlPath);
            const newFill = (newMeasurements.contentHeight / newMeasurements.containerHeight * 100).toFixed(1);
            console.log(`   New page fill: ${newFill}%`);
            console.log(`   Column diff: ${newMeasurements.columnDiff}px`);
        }
    }
}

main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
