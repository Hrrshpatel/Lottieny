/**
 * lottieExporter.js
 *
 * First-principles approach:
 *  1. Mount lottie-web with the SVG renderer (same as the working LottiePlayer component)
 *  2. Step through every output frame using goToAndStop()
 *  3. Rasterize the live SVG to a canvas via Image + XMLSerializer (precise, no canvas-renderer quirks)
 *  4. For GIF: encode with gifenc (better colour quality than gif.js)
 *  5. For Video: feed frames to MediaRecorder via captureStream
 */

import lottie from 'lottie-web';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';

// ─── helpers ────────────────────────────────────────────────────────────────

const RESOLUTION_MAP = { '540p': 540, '720p': 720, '1080p': 1080, '1440p': 1440 };

export function hasTransparentBackground(animationData) {
    if (!animationData?.layers) return true;
    return !animationData.layers.some((l) => l.ty === 1); // ty=1 → solid layer
}

function getDimensions(animationData, resKey) {
    const h = RESOLUTION_MAP[resKey] ?? 720;
    const ratio = (animationData.w || 512) / (animationData.h || 512);
    let w = Math.round(h * ratio);
    return { width: w % 2 ? w + 1 : w, height: h % 2 ? h + 1 : h };
}

// ─── SVG rasterizer ─────────────────────────────────────────────────────────

/**
 * Renders every output frame to an off-screen canvas using lottie-web's SVG
 * renderer, then snapshots the SVG via XMLSerializer → Image → canvas.
 *
 * Returns an array of { canvas, ctx } objects, one per output frame.
 */
function rasterizeFrames(animationData, { width, height, fps, onProgress }) {
    return new Promise((resolve, reject) => {
        // Hidden container must be in the DOM for lottie-web
        const host = document.createElement('div');
        host.style.cssText = `position:fixed;left:-${width + 100}px;top:0;width:${width}px;height:${height}px;overflow:hidden;pointer-events:none;`;
        document.body.appendChild(host);

        const anim = lottie.loadAnimation({
            container: host,
            renderer: 'svg',
            loop: false,
            autoplay: false,
            animationData: JSON.parse(JSON.stringify(animationData)),
            rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
        });

        function doRender() {
            const totalLottieFrames = anim.totalFrames;
            const durationSecs = totalLottieFrames / (animationData.fr || 30);
            const totalOut = Math.max(1, Math.ceil(durationSecs * fps));
            const svgEl = host.querySelector('svg');

            if (!svgEl) {
                anim.destroy();
                host.remove();
                reject(new Error('SVG element not found in lottie output. Please check the animation file.'));
                return;
            }

            // Make sure SVG has explicit dimensions so the Image has a size.
            svgEl.setAttribute('width', String(width));
            svgEl.setAttribute('height', String(height));

            const frames = [];
            let completed = 0;

            function captureNextFrame(i) {
                if (i >= totalOut) {
                    anim.destroy();
                    host.remove();
                    resolve({ frames, durationSecs });
                    return;
                }

                anim.goToAndStop((i / totalOut) * totalLottieFrames, true);

                // Flush pending browser render work (important at 1080p+)
                requestAnimationFrame(() => {
                    const svgString = new XMLSerializer().serializeToString(svgEl);
                    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
                    const url = URL.createObjectURL(blob);

                    const img = new Image();
                    // Set dims so the browser knows the target size before decoding
                    img.width = width;
                    img.height = height;
                    img.src = url;

                    // img.decode() waits for full pixel decode — critical at 1080p/1440p
                    img.decode()
                        .then(() => {
                            const fc = document.createElement('canvas');
                            fc.width = width;
                            fc.height = height;
                            const ctx = fc.getContext('2d');
                            ctx.clearRect(0, 0, width, height);
                            ctx.drawImage(img, 0, 0, width, height);
                            URL.revokeObjectURL(url);
                            frames.push(fc);
                            completed++;
                            if (onProgress) onProgress(Math.round((completed / totalOut) * 100));
                            // Small yield between frames so the browser stays responsive
                            // Scale delay with pixel count so 1080p/1440p get more time
                            const pixelDelay = width >= 1920 ? 32 : width >= 1280 ? 16 : 0;
                            setTimeout(() => captureNextFrame(i + 1), pixelDelay);
                        })
                        .catch(() => {
                            URL.revokeObjectURL(url);
                            anim.destroy();
                            host.remove();
                            reject(new Error(`Failed to decode frame ${i} at ${width}×${height}`));
                        });
                });
            }
            captureNextFrame(0);
        }

        anim.addEventListener('DOMLoaded', doRender);

        // 5-second safety timeout
        const tOut = setTimeout(() => {
            if (host.querySelector('svg')) {
                doRender(); // try anyway
            } else {
                anim.destroy();
                host.remove();
                reject(new Error('Lottie DOMLoaded timeout — animation may be corrupt.'));
            }
        }, 5000);

        anim.addEventListener('DOMLoaded', () => clearTimeout(tOut));
    });
}

// ─── GIF export ─────────────────────────────────────────────────────────────

export async function exportAsGif(animationData, { fps = 30, resolution = '720p', onProgress } = {}) {
    const { width, height } = getDimensions(animationData, resolution);
    const transparent = hasTransparentBackground(animationData);

    onProgress?.(3, 'Rendering frames…');

    const { frames } = await rasterizeFrames(animationData, {
        width, height, fps,
        onProgress: (p) => onProgress?.(3 + Math.round(p * 0.45), 'Rendering frames…'),
    });

    onProgress?.(50, 'Encoding GIF…');

    const encoder = GIFEncoder();
    const delay = Math.round(1000 / fps);
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = width;
    tmpCanvas.height = height;
    const tmpCtx = tmpCanvas.getContext('2d');

    for (let i = 0; i < frames.length; i++) {
        tmpCtx.clearRect(0, 0, width, height);
        tmpCtx.drawImage(frames[i], 0, 0);
        const { data } = tmpCtx.getImageData(0, 0, width, height);

        const palette = quantize(data, 256, { format: 'rgba4444', oneBitAlpha: transparent });
        const indexed = applyPalette(data, palette, 'rgba4444');

        encoder.writeFrame(indexed, width, height, {
            palette,
            delay,
            transparent,
            dispose: transparent ? 2 : 0, // 2 = restore to background (needed for transparency between frames)
        });

        onProgress?.(50 + Math.round(((i + 1) / frames.length) * 48), 'Encoding GIF…');
    }

    encoder.finish();
    const bytes = encoder.bytes();
    onProgress?.(100, 'Done!');
    return new Blob([bytes], { type: 'image/gif' });
}

// ─── Video export ────────────────────────────────────────────────────────────

export async function exportAsVideo(animationData, { fps = 30, resolution = '720p', onProgress } = {}) {
    const { width, height } = getDimensions(animationData, resolution);

    onProgress?.(3, 'Rendering frames…');

    const { frames } = await rasterizeFrames(animationData, {
        width, height, fps,
        onProgress: (p) => onProgress?.(3 + Math.round(p * 0.37), 'Rendering frames…'),
    });

    onProgress?.(40, 'Encoding video…');

    const playback = document.createElement('canvas');
    playback.width = width;
    playback.height = height;
    const pCtx = playback.getContext('2d');

    const stream = playback.captureStream(0);

    let mimeType = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm;codecs=vp8';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';

    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
    const chunks = [];
    recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);

    const stopped = new Promise((res) => { recorder.onstop = res; });

    recorder.start();
    const frameDelay = 1000 / fps;

    for (let i = 0; i < frames.length; i++) {
        pCtx.fillStyle = '#FFFFFF';
        pCtx.fillRect(0, 0, width, height);
        pCtx.drawImage(frames[i], 0, 0);

        const vt = stream.getVideoTracks()[0];
        if (typeof vt?.requestFrame === 'function') vt.requestFrame();

        onProgress?.(40 + Math.round(((i + 1) / frames.length) * 58), 'Encoding video…');
        await new Promise((r) => setTimeout(r, frameDelay));
    }

    recorder.stop();
    await stopped;

    onProgress?.(100, 'Done!');
    return new Blob(chunks, { type: 'video/webm' });
}
