import { EXDB } from './frontend/src/lib/exercises-data.js';

const missingImg = EXDB.filter(e => !e.img || e.img.trim() === '');
console.log('Total exercises:', EXDB.length);
console.log('Missing images count:', missingImg.length);
if (missingImg.length > 0) {
    console.log('Some missing image names:', missingImg.slice(0, 10).map(e => e.n));
}
