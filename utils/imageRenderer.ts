import { TableData, AnimationConfig, Theme } from '../types';
import { getThemeConfig, loadImage, getLines } from './videoRenderer';

export async function renderTableImage(data: TableData, config: AnimationConfig, logoSrc?: string): Promise<string> {
    // 4:5 Aspect Ratio - Optimal for Facebook/Instagram Feeds (High Res)
    const width = 2160;
    const height = 2700;
    const margin = 100; // Reduced margin for more content space
    
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Context creation failed");

    // Ensure fonts are loaded
    try { await document.fonts.ready; } catch (e) {}

    const themeStyle = getThemeConfig(config.theme);

    // --- Background ---
    ctx.fillStyle = themeStyle.bg;
    ctx.fillRect(0, 0, width, height);

    if (config.backgroundImage) {
        try {
            const img = await loadImage(config.backgroundImage);
            // 'Cover' fit
            const scale = Math.max(width / img.width, height / img.height);
            const imgW = img.width * scale;
            const imgH = img.height * scale;
            
            ctx.save();
            ctx.translate(width/2, height/2);
            ctx.globalAlpha = 0.25; // Slightly more visible but dark enough for text
            ctx.drawImage(img, -imgW/2, -imgH/2, imgW, imgH);
            ctx.restore();
            
            // Vignette
            const gradient = ctx.createRadialGradient(width/2, height/2, width/4, width/2, height/2, height);
            gradient.addColorStop(0, 'rgba(0,0,0,0.1)');
            gradient.addColorStop(1, themeStyle.bg); 
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
        } catch (e) { console.warn("Background image failed to load"); }
    } else {
        // Procedural Backgrounds
         if (config.theme === Theme.COSMIC) {
            const gradient = ctx.createLinearGradient(0, 0, width, height);
            gradient.addColorStop(0, '#0f172a'); 
            gradient.addColorStop(1, '#020617');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
            
            // Stars
            ctx.fillStyle = '#ffffff';
            for(let i=0; i<150; i++) {
                ctx.globalAlpha = Math.random() * 0.4;
                ctx.beginPath(); ctx.arc(Math.random()*width, Math.random()*height, Math.random()*3, 0, Math.PI*2); ctx.fill();
            }
         } else if (config.theme === Theme.NEON) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, width, height);
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.1)';
            ctx.lineWidth = 2;
            const gridSize = 135;
            for (let x = 0; x < width; x += gridSize) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
            }
            for (let y = 0; y < height; y += gridSize) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
            }
         }
    }
    
    ctx.globalAlpha = 1;

    // Load Logo
    let logoImg: HTMLImageElement | null = null;
    if (logoSrc) {
        try {
            logoImg = await loadImage(logoSrc);
        } catch (e) {
            console.warn("Logo failed to load");
        }
    }

    // --- Content Measurement & Layout ---
    // Goal: Fit content dynamically without truncation
    
    let currentY = margin + 40;
    const contentWidth = width - (margin * 2);
    
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    // 1. Measure Header Block (Title + Summary)
    ctx.font = `bold 100px ${themeStyle.fontHeader}`;
    ctx.fillStyle = themeStyle.subjectColor;
    if (config.theme === Theme.NEON) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = themeStyle.subjectColor;
    }
    const titleLines = getLines(ctx, (data.title || "Data Table").toUpperCase(), contentWidth);
    const titleHeight = titleLines.length * 120; // 120px line height for title
    
    let summaryHeight = 0;
    let summaryLines: string[] = [];
    if (data.summary) {
        ctx.font = `italic 40px ${themeStyle.fontMain}`;
        summaryLines = getLines(ctx, data.summary, contentWidth);
        summaryHeight = summaryLines.length * 50 + 20; // 50px line height
    }

    const headerBlockHeight = titleHeight + summaryHeight + 60; // 60px gap below header

    // 2. Footer Block
    const footerHeight = 120; // Fixed footer area

    // 3. Available space for Table
    const availableTableHeight = height - (margin * 2) - headerBlockHeight - footerHeight;
    const tableStartY = margin + headerBlockHeight;

    // 4. Table Layout Calculation
    const colCount = data.columns.length;
    const colWidth = contentWidth / colCount;
    const cellPadding = 30;
    const textWidth = colWidth - (cellPadding * 2);

    // Iterative font sizing to fit table
    let fontSize = 55;
    let lineHeight = Math.floor(fontSize * 1.4);
    let headerFontSize = 45;
    let rowPadding = 40; // Vertical padding in rows
    
    // Structure to hold calculated layout
    let tableLayout: { 
        headerHeight: number, 
        rowHeights: number[], 
        totalHeight: number,
        headerLines: string[][]
        rowLines: string[][][] 
    } = { headerHeight: 0, rowHeights: [], totalHeight: 0, headerLines: [], rowLines: [] };

    // Function to calculate heights based on current font settings
    const calculateLayout = (fSize: number, hFSize: number, rPad: number) => {
        const lHeight = Math.floor(fSize * 1.3);
        const hLHeight = Math.floor(hFSize * 1.3);
        
        // Headers
        ctx.font = `bold ${hFSize}px ${themeStyle.fontHeader}`;
        const hLines = data.columns.map(col => getLines(ctx, col.toUpperCase(), textWidth));
        const maxHLines = Math.max(...hLines.map(l => l.length));
        const hHeight = (maxHLines * hLHeight) + rPad;

        // Rows
        ctx.font = `${fSize}px ${themeStyle.fontMain}`;
        const rHeights: number[] = [];
        const rLines: string[][][] = []; // [row][col][lines]

        data.data.forEach(row => {
             const rowCellLines: string[][] = [];
             let maxLines = 1;
             row.forEach((cell, idx) => {
                 // Bold first column?
                 if(idx === 0) ctx.font = `bold ${fSize}px ${themeStyle.fontMain}`;
                 else ctx.font = `${fSize}px ${themeStyle.fontMain}`;
                 
                 const lines = getLines(ctx, cell, textWidth);
                 rowCellLines.push(lines);
                 if (lines.length > maxLines) maxLines = lines.length;
             });
             rLines.push(rowCellLines);
             // Ensure min height for comfort
             rHeights.push(Math.max((maxLines * lHeight) + rPad, 80));
        });

        const totHeight = hHeight + rHeights.reduce((a, b) => a + b, 0);
        return { headerHeight: hHeight, rowHeights: rHeights, totalHeight: totHeight, headerLines: hLines, rowLines: rLines };
    };

    // Initial calculation
    tableLayout = calculateLayout(fontSize, headerFontSize, rowPadding);
    
    // Downscale loop if table is too tall
    let attempts = 0;
    while (tableLayout.totalHeight > availableTableHeight && fontSize > 25 && attempts < 15) {
        fontSize -= 3;
        headerFontSize = Math.max(25, headerFontSize - 2);
        rowPadding = Math.max(20, rowPadding - 4);
        tableLayout = calculateLayout(fontSize, headerFontSize, rowPadding);
        attempts++;
    }

    // Upscale spacing if table is too short (fill available space)
    if (tableLayout.totalHeight < availableTableHeight * 0.85) {
         const diff = availableTableHeight - tableLayout.totalHeight;
         const extraPerItem = diff / (data.data.length + 1); // +1 for header
         rowPadding += Math.min(extraPerItem, 80); // Cap extra padding to avoid huge gaps
         tableLayout = calculateLayout(fontSize, headerFontSize, rowPadding);
    }
    
    // --- DRAWING ---

    // Draw Title
    ctx.textAlign = 'center';
    ctx.shadowBlur = (config.theme === Theme.NEON) ? 20 : 0;
    
    let drawY = margin;
    ctx.font = `bold 100px ${themeStyle.fontHeader}`;
    ctx.fillStyle = themeStyle.subjectColor;
    titleLines.forEach(line => {
        ctx.fillText(line, width / 2, drawY);
        drawY += 120;
    });
    ctx.shadowBlur = 0;

    // Draw Summary
    if (data.summary) {
        drawY += 20;
        ctx.font = `italic 40px ${themeStyle.fontMain}`;
        ctx.fillStyle = themeStyle.headerColor;
        summaryLines.forEach(line => {
            ctx.fillText(line, width/2, drawY);
            drawY += 50;
        });
    }

    // Draw Table
    let tableY = tableStartY;
    // Vertically center table in available space if it's smaller
    if (tableLayout.totalHeight < availableTableHeight) {
        tableY += (availableTableHeight - tableLayout.totalHeight) / 2;
    }

    // Header Background
    ctx.fillStyle = (config.theme === Theme.NEON) ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(margin, tableY, contentWidth, tableLayout.headerHeight);
    
    // Header Text
    ctx.textAlign = 'left';
    ctx.fillStyle = themeStyle.headerColor;
    ctx.font = `bold ${headerFontSize}px ${themeStyle.fontHeader}`;
    const hLHeight = Math.floor(headerFontSize * 1.3);

    data.columns.forEach((col, i) => {
        const x = margin + (i * colWidth) + cellPadding;
        const lines = tableLayout.headerLines[i];
        
        // Vertically center text in header cell
        const blockH = tableLayout.headerHeight;
        const textH = lines.length * hLHeight;
        const startY = tableY + (blockH - textH) / 2;
        
        lines.forEach((line, lIdx) => {
             ctx.fillText(line, x, startY + (lIdx * hLHeight));
        });
    });
    
    tableY += tableLayout.headerHeight;

    // Rows
    const lHeight = Math.floor(fontSize * 1.3);
    
    data.data.forEach((row, rIdx) => {
        const h = tableLayout.rowHeights[rIdx];
        const linesGrid = tableLayout.rowLines[rIdx];
        
        // Zebra Striping
        if (rIdx % 2 === 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
            ctx.fillRect(margin, tableY, contentWidth, h);
        }
        // Thin Separator
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(margin, tableY + h - 1, contentWidth, 1);

        row.forEach((cell, cIdx) => {
             const x = margin + (cIdx * colWidth) + cellPadding;
             const lines = linesGrid[cIdx];
             
             if (cIdx === 0) {
                ctx.fillStyle = themeStyle.subjectColor;
                ctx.font = `bold ${fontSize}px ${themeStyle.fontMain}`;
             } else {
                ctx.fillStyle = themeStyle.valueColor;
                ctx.font = `${fontSize}px ${themeStyle.fontMain}`;
             }

             // Vertically center text in row cell
             const textH = lines.length * lHeight;
             const startY = tableY + (h - textH) / 2;

             lines.forEach((line, lIdx) => {
                 ctx.fillText(line, x, startY + (lIdx * lHeight));
             });
        });

        tableY += h;
    });

    // Draw Footer
    const footerY = height - margin - 60;
    
    // Separator line
    ctx.strokeStyle = themeStyle.lineColor1;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(margin, footerY - 40);
    ctx.lineTo(width - margin, footerY - 40);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.font = `bold 30px ${themeStyle.fontMain}`;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    
    // Sources
    if (data.sources && data.sources.length) {
         const sourceText = "Sources: " + data.sources.map(s => {
             try { return new URL(s).hostname.replace('www.', ''); } catch { return s; }
        }).join(', '); 
        
        // Truncate sources if extremely long
        let printSource = sourceText;
        if(ctx.measureText(printSource).width > contentWidth * 0.5) {
             printSource = getLines(ctx, sourceText, contentWidth * 0.5)[0] + "...";
        }
        ctx.fillText(printSource.toUpperCase(), margin, footerY);
    }
    
    // Branding
    ctx.textAlign = 'right';
    ctx.fillStyle = themeStyle.subjectColor;
    ctx.font = `bold 40px ${themeStyle.fontMain}`;
    const brandText = "LOKSEWA AUTOMATIC";
    const brandX = width - margin;
    ctx.fillText(brandText, brandX, footerY);

    // AI Label
    ctx.save();
    ctx.font = `italic 24px ${themeStyle.fontMain}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText("✨ AI Generated Content", brandX, footerY + 50);
    ctx.restore();

    // Footer Logo
    if (logoImg) {
        const logoSize = 80;
        const textWidth = ctx.measureText(brandText).width;
        // Position logo to the left of the brand text
        const logoX = brandX - textWidth - logoSize - 25; 
        const logoY = footerY - 20; // Align vertically with text baseline roughly
        
        ctx.save();
        // Rounded corner clip for logo
        const radius = 10;
        ctx.beginPath();
        ctx.moveTo(logoX + radius, logoY);
        ctx.lineTo(logoX + logoSize - radius, logoY);
        ctx.quadraticCurveTo(logoX + logoSize, logoY, logoX + logoSize, logoY + radius);
        ctx.lineTo(logoX + logoSize, logoY + logoSize - radius);
        ctx.quadraticCurveTo(logoX + logoSize, logoY + logoSize, logoX + logoSize - radius, logoY + logoSize);
        ctx.lineTo(logoX + radius, logoY + logoSize);
        ctx.quadraticCurveTo(logoX, logoY + logoSize, logoX, logoY + logoSize - radius);
        ctx.lineTo(logoX, logoY + radius);
        ctx.quadraticCurveTo(logoX, logoY, logoX + radius, logoY);
        ctx.closePath();
        ctx.clip();
        
        // Draw image "contain" style
        const imgAspect = logoImg.width / logoImg.height;
        let drawW = logoSize;
        let drawH = logoSize;
        let dx = logoX;
        let dy = logoY;
        
        if (imgAspect > 1) { // Landscape image
            drawH = logoSize / imgAspect;
            dy = logoY + (logoSize - drawH) / 2;
        } else { // Portrait image
            drawW = logoSize * imgAspect;
            dx = logoX + (logoSize - drawW) / 2;
        }
        
        ctx.drawImage(logoImg, dx, dy, drawW, drawH);
        ctx.restore();
    } else {
        // Fallback if logo fails to load: Draw text placeholder
        const textWidth = ctx.measureText(brandText).width;
        const logoX = brandX - textWidth - 20; 
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillText("Loksewa", logoX, footerY);
    }

    return canvas.toDataURL('image/png');
}