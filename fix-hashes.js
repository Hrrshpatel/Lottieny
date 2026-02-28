import fs from 'fs';
import md5 from 'md5';

const json = JSON.parse(fs.readFileSync('/Users/harsh.patel1/Downloads/Water mark.json', 'utf8'));
const newHashes = new Set();

function scan(obj) {
  if (!obj) return;
  if (Array.isArray(obj)) {
    obj.forEach(scan);
    return;
  }
  if (typeof obj !== "object") return;
  if (obj.ty === "sh" && obj.ks && obj.ks.k) {
    const str = JSON.stringify(obj.ks.k).slice(0, 500);
    newHashes.add(md5(str));
  }
  Object.values(obj).forEach(scan);
}

json.layers.forEach(scan);

console.log('const WATERMARK_SIGNATURE = new Set([');
Array.from(newHashes).forEach((h, i) => {
  console.log(`  "${h}"${i < newHashes.size - 1 ? ',' : ''}`);
});
console.log(']);');
