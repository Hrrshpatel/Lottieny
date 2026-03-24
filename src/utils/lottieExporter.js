/**
 * lottieExporter.js — Hardware-Sync DPR Streaming Engine
 *
 * Architecture:
 *  1. Mount lottie-web (SVG renderer) in a hidden off-screen host
 *  2. Step through every output frame with goToAndStop()
 *  3. Serialize each SVG at physical DPR pixels → decode via Image → draw 1:1
 *  4. Stream each rendered frame directly to the encoder via onFrame()
 *  5. GIF: encode with gifenc (rgb565 for opaque, rgba4444 for transparent)
 *  6. Video: encode with FFmpeg.wasm (frame-count based — always exact duration)
 */

import lottie from 'lottie-web';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';

// ─── helpers ─────────────────────────────────────────────────────────────────

const RESOLUTION_MAP = {
    '360p': 360, '540p': 540, '720p': 720,
    '1080p': 1080, '1440p': 1440, '2160p': 2160,
};

export function hasTransparentBackground(animationData) {
    if (!animationData?.layers) return true;
    return !animationData.layers.some((l) => l.ty === 1);
}

function getDimensions(animationData, resKey) {
    const h = RESOLUTION_MAP[resKey] ?? 720;
    const ratio = (animationData.w || 512) / (animationData.h || 512);
    let w = Math.round(h * ratio);
    return { width: w % 2 ? w + 1 : w, height: h % 2 ? h + 1 : h };
}

// ─── Core rasterizer ─────────────────────────────────────────────────────────

function rasterizeFrames(animationData, { width, height, fps, onProgress, onFrame }) {
    return new Promise((resolve, reject) => {
        const wPhysical = width;
        const hPhysical = height;

        const host = document.createElement('div');
        host.style.cssText = `position:fixed;top:0;left:0;` +
            `width:${width}px;height:${height}px;visibility:hidden;pointer-events:none;`;
        document.body.appendChild(host);

        const anim = lottie.loadAnimation({
            container : host,
            renderer  : 'svg',
            loop      : false,
            autoplay  : false,
            animationData: JSON.parse(JSON.stringify(animationData)),
            rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
        });

        function cleanup() {
            try { anim.destroy(); } catch (_) {}
            try { host.remove();  } catch (_) {}
        }

        let renderStarted = false;

        function doRender() {
            if (renderStarted) return;
            renderStarted = true;

            const totalLottieFrames = anim.totalFrames;
            const durationSecs      = totalLottieFrames / (animationData.fr || 30);
            const totalOut          = Math.max(1, Math.ceil(durationSecs * fps));
            const svgEl             = host.querySelector('svg');

            if (!svgEl) {
                cleanup();
                reject(new Error('SVG element not found — check the animation file.'));
                return;
            }

            svgEl.setAttribute('width',  String(wPhysical));
            svgEl.setAttribute('height', String(hPhysical));

            const fc   = document.createElement('canvas');
            fc.width   = wPhysical;
            fc.height  = hPhysical;
            const fCtx = fc.getContext('2d');

            function captureNextFrame(i) {
                if (i >= totalOut) {
                    cleanup();
                    resolve();
                    return;
                }

                anim.goToAndStop((i / totalOut) * totalLottieFrames, true);

                requestAnimationFrame(() => {
                    const svgString = new XMLSerializer().serializeToString(svgEl);
                    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
                    const url  = URL.createObjectURL(blob);
                    const img  = new Image();
                    img.src    = url;

                    img.decode()
                        .then(() => {
                            fCtx.clearRect(0, 0, wPhysical, hPhysical);
                            fCtx.drawImage(img, 0, 0);
                            URL.revokeObjectURL(url);
                            return Promise.resolve(onFrame ? onFrame(fc, i) : null);
                        })
                        .then(() => {
                            if (onProgress) onProgress(Math.round(((i + 1) / totalOut) * 100));
                            const delay = wPhysical >= 3840 ? 32 : wPhysical >= 1920 ? 16 : 0;
                            setTimeout(() => captureNextFrame(i + 1), delay);
                        })
                        .catch((err) => {
                            URL.revokeObjectURL(url);
                            cleanup();
                            reject(err instanceof Error ? err : new Error(`Frame ${i} failed: ${err}`));
                        });
                });
            }

            captureNextFrame(0);
        }

        anim.addEventListener('DOMLoaded', doRender);

        const tOut = setTimeout(() => {
            if (host.querySelector('svg')) {
                doRender();
            } else {
                cleanup();
                reject(new Error('Lottie DOMLoaded timeout — animation may be corrupt.'));
            }
        }, 5000);

        anim.addEventListener('DOMLoaded', () => clearTimeout(tOut));
    });
}

// ─── GIF export ──────────────────────────────────────────────────────────────

export async function exportAsGif(animationData, { fps = 30, resolution = '720p', onProgress } = {}) {
    const { width, height } = getDimensions(animationData, resolution);
    const transparent       = hasTransparentBackground(animationData);

    const wPhysical = width;
    const hPhysical = height;

    const encoder    = GIFEncoder();
    const delay      = Math.round(1000 / fps);
    const tmpCanvas  = document.createElement('canvas');
    tmpCanvas.width  = wPhysical;
    tmpCanvas.height = hPhysical;
    const tmpCtx     = tmpCanvas.getContext('2d');

    await rasterizeFrames(animationData, {
        width, height, fps,
        onProgress: (p) => onProgress?.(3 + Math.round(p * 0.95), 'Rendering & Encoding GIF…'),
        onFrame: (frameCanvas) => {
            tmpCtx.clearRect(0, 0, wPhysical, hPhysical);
            if (!transparent) {
                tmpCtx.fillStyle = '#FFFFFF';
                tmpCtx.fillRect(0, 0, wPhysical, hPhysical);
            }
            tmpCtx.drawImage(frameCanvas, 0, 0);

            const { data } = tmpCtx.getImageData(0, 0, wPhysical, hPhysical);
            const fmt     = transparent ? 'rgba4444' : 'rgb565';
            const palette = quantize(data, 256, { format: fmt });
            const indexed = applyPalette(data, palette, fmt);

            encoder.writeFrame(indexed, wPhysical, hPhysical, {
                palette,
                delay,
                transparent,
                dispose: transparent ? 2 : 0,
            });
        },
    });

    encoder.finish();
    onProgress?.(100, 'Done!');
    return new Blob([encoder.bytes()], { type: 'image/gif' });
}

// ─── Video export (Absolute-Clock MediaRecorder) ─────────────────────────────

export async function exportAsVideo(animationData, { fps = 30, resolution = '720p', transparent = false, onProgress } = {}) {
    const { width, height } = getDimensions(animationData, resolution);

    const wPhysical = width;
    const hPhysical = height;

    // ── Phase 1: Render all frames → cache as compressed PNG blob URLs ─────────
    // Fast render pass, stores lightweight blobs (no RAW RAM OOM at 4K).
    const frameBlobUrls = [];

    await rasterizeFrames(animationData, {
        width, height, fps,
        onProgress: (p) => onProgress?.(3 + Math.round(p * 0.60), 'Rendering frames…'),
        onFrame: (frameCanvas) => new Promise((res) => {
            frameCanvas.toBlob((blob) => {
                frameBlobUrls.push(URL.createObjectURL(blob));
                res();
            }, 'image/png');
        }),
    });

    // ── Phase 2: Encode at wall-clock-anchored exact fps ─────────────────────────
    const label = transparent ? 'Transparent Video' : 'MP4 Video';
    onProgress?.(63, `Encoding ${label}…`);

    const playback   = document.createElement('canvas');
    playback.width   = wPhysical;
    playback.height  = hPhysical;
    const pCtx       = playback.getContext('2d');

    const stream = playback.captureStream(fps);

    // Hardware accelerated Native encoders.
    // WebM handles transparency (VP8/VP9) natively if requested.
    let mimeType = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm;codecs=vp8';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';

    // 100 Mbps — eliminates compression artefacts at all resolutions incl. 4K
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 100_000_000 });
    const chunks   = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    const stopped = new Promise((r) => { recorder.onstop = r; });

    const frameDurationMs   = 1000 / fps;
    const exactDurationMs   = (frameBlobUrls.length / fps) * 1000;

    // Start the recorder — this is t=0 of the recording clock
    recorder.start(100);
    const recordingStart = performance.now();

    for (let i = 0; i < frameBlobUrls.length; i++) {
        // Decode the cached PNG frame
        const img = new Image();
        img.src   = frameBlobUrls[i];
        await img.decode();

        pCtx.clearRect(0, 0, wPhysical, hPhysical);
        if (!transparent) {
            pCtx.fillStyle = '#FFFFFF';
            pCtx.fillRect(0, 0, wPhysical, hPhysical);
        }
        
        // PNG captured at physical pixel size — draw 1:1, no scaling blur
        pCtx.drawImage(img, 0, 0);
        URL.revokeObjectURL(frameBlobUrls[i]); // Free memory immediately

        // ── Absolute-clock sleep (Solves the Duration Bug) ────────────────────
        // Target: this frame finishes at exactly (i+1) * frameDurationMs from
        // recording start. Drift can never accumulate.
        const targetMs  = (i + 1) * frameDurationMs;
        const nowOffset = performance.now() - recordingStart;
        const sleepMs   = targetMs - nowOffset;
        if (sleepMs > 0) await new Promise((r) => setTimeout(r, sleepMs));

        onProgress?.(63 + Math.round(((i + 1) / frameBlobUrls.length) * 35), `Encoding ${label}…`);
    }

    // Stop the recorder at EXACTLY the right total duration (no tail buffer overshoot)
    const stopTarget  = recordingStart + exactDurationMs;
    const stopSleepMs = stopTarget - performance.now();
    if (stopSleepMs > 0) await new Promise((r) => setTimeout(r, stopSleepMs));

    recorder.stop();
    await stopped;

    onProgress?.(100, 'Done!');
    return new Blob(chunks, { type: mimeType });
}
