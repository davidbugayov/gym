const https = require('https');
const http = require('http');

const urls = [
    'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0043-qXTaZnJ.jpg',
    'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0043.jpg',
    'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@7455efae41b330c265e7cd4b78dfa848e7ce5ebd/images/0043-qXTaZnJ.jpg',
    'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@7455efae41b330c265e7cd4b78dfa848e7ce5ebd/images/0043.jpg'
];

function checkUrl(url) {
    return new Promise((resolve) => {
        https.get(url, (res) => {
            console.log(url, res.statusCode);
            resolve();
        }).on('error', (e) => {
            console.error(e);
            resolve();
        });
    });
}

async function main() {
    for (const url of urls) {
        await checkUrl(url);
    }
}
main();
