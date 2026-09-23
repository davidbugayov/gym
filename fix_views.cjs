const fs = require('fs');
const path = require('path');

const viewsDir = 'frontend/src/views';
const files = fs.readdirSync(viewsDir).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
    const filePath = path.join(viewsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    content = content.replace(/\{ex\.n\}/g, '{t(ex.n)}');
    content = content.replace(/\{e\.n\}/g, '{t(e.n)}');

    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${file}`);
    }
});
