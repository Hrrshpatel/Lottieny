import fs from 'fs';

const file = '/Users/harsh.patel1/.gemini/antigravity/scratch/lottie-watermark-remover/src/components/LottiePlayer.jsx';
let content = fs.readFileSync(file, 'utf8');
console.log(content);
