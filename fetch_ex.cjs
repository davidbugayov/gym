const https = require('https');
const fs = require('fs');

const url = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/7455efae41b330c265e7cd4b78dfa848e7ce5ebd/exercises.json';

https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const exercises = JSON.parse(data);
        console.log(`Fetched ${exercises.length} exercises from dataset.`);
        const missingIds = ['3224', '0630', '3223', '3220', '3222', '3219', '3221', '3655', '3636', '3656', '1471', '1604', '1688', '1687', '1685', '1686', '1167', '3662', '1468', '3360', '1428', '1368', '0257', '3561', '3013', '3699', '2466', '1271', '1259', '1365', '0669', '0817', '0643', '0716', '1403', '0721', '1511', '1585', '1576', '0613', '1564', '1512', '1424', '2567', '2571', '1377', '1398', '1390', '1419', '0690', '1363', '1358', '0794', '1346', '1405', '2329', '3639'];
        const found = exercises.filter(e => missingIds.includes(e.id));
        console.log(`Found ${found.length} of ${missingIds.length} requested missing IDs in dataset.`);
        fs.writeFileSync('missing_ex.json', JSON.stringify(found, null, 2));
    });
}).on('error', console.error);
