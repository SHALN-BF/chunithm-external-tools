const fs = require('fs');
let code = fs.readFileSync('graph.js', 'utf-8');

// replace calculate bounds & height
code = code.replace(
    /const width = 1200;[\s\S]*?Give some padding on extremes[\s\S]*?minRating = Math.floor\(minRating \* 4\) \/ 4 \- 0\.25;/m,
    \`const width = 1200;
    const height = 150 + (bestList.length * 45) + 100 + (recentList.length * 45) + 100;
    canvas.width = width;
    canvas.height = height;

    // Fill background
    ctx.fillStyle = "#1e1e1e";
    ctx.fillRect(0, 0, width, height);

    const overallRating = Number(playerData.rating);

    // Calculate rating extremes for X-axis
    let minRating = overallRating;
    let maxRating = overallRating;
    const allSongs = [...bestList, ...recentList];
    
    allSongs.forEach(song => {
        if (song.rating < minRating) minRating = song.rating;
        const sssPlus = (song.const || 0) + 2.15; // fixed from song.constant
        if (sssPlus > maxRating) maxRating = sssPlus;
    });

    // Give some padding on extremes
    minRating = Math.floor(minRating * 2) / 2 - 0.5; // expand a bit more to prevent cutoff
    maxRating = Math.ceil(maxRating * 2) / 2 + 0.5;\`
);

// replace constant inside drawSection
code = code.replace(
    /const sssPlus = \(song\.constant \|\| 0\) \+ 2\.15;/g,
    \`const sssPlus = (song.const || 0) + 2.15;\`
);

// replace overlay styling to fix cutoff
code = code.replace(
    /currentOverlay\.style\.overflowY = 'auto'; \/\/ allow scrolling/g,
    \`currentOverlay.style.overflowY = 'auto'; // allow scrolling
        currentOverlay.style.justifyContent = 'flex-start';
        currentOverlay.style.paddingTop = '50px';
        currentOverlay.style.paddingBottom = '50px';\`
);

// replace container background to match theme
code = code.replace(
    /background: #fff; padding: 20px; border-radius: 15px; text-align: center; position: relative; margin: 50px auto;/g,
    \`background: #2d2d2d; color: #fff; padding: 20px; border-radius: 15px; text-align: center; position: relative; margin: 0 auto;\`
);

code = code.replace(
    /title\.style\.cssText = 'color: #333; margin-bottom: 20px; font-family: sans-serif;';/g,
    \`title.style.cssText = 'color: #fff; margin-bottom: 20px; font-family: sans-serif;';\`
);

fs.writeFileSync('graph.js', code);
