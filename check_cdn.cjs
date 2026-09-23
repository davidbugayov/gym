const https = require('https');

async function main() {
    const { EXDB } = await import('./frontend/src/lib/exercises-data.js');
    const imgBase = 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@7455efae41b330c265e7cd4b78dfa848e7ce5ebd/images/';

    let count = 0;
    let missing = [];

    // Check first 100 as a sample to see if it's a systemic issue,
    // or we can check all of them concurrently in batches.
    const batchSize = 50;
    for (let i = 0; i < EXDB.length; i += batchSize) {
        const batch = EXDB.slice(i, i + batchSize);
        await Promise.all(batch.map(ex => {
            return new Promise((resolve) => {
                if (!ex.img) {
                    resolve();
                    return;
                }
                const url = imgBase + ex.img;
                https.get(url, (res) => {
                    if (res.statusCode !== 200) {
                        missing.push(ex.n + ' (' + ex.img + ')');
                    }
                    res.resume(); // consume response data to free up memory
                    resolve();
                }).on('error', (e) => {
                    missing.push(ex.n + ' (' + ex.img + ') - ERROR');
                    resolve();
                });
            });
        }));
        count += batch.length;
        if (missing.length > 50) break; // Don't need to find all if there are many
    }

    console.log('Checked', count, 'exercises');
    console.log('Missing count:', missing.length);
    if (missing.length > 0) {
        console.log('Sample missing:', missing.slice(0, 10));
    }
}
main();
