const fs = require('fs');
let code = fs.readFileSync('graph.js', 'utf-8');

// 1. Fix sssPlus calculation. It should be song.constant, but wait, the property might be song.const. Let me check what the property is.
