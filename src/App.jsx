import { useState, useRef, useEffect, useCallback } from 'react';
import { Download } from 'lucide-react';
import PreviewWindow from './components/PreviewWindow';
import ExportWindowPreview from './components/ExportWindowPreview';
import LottiePlayer from './components/LottiePlayer';
import { processLottie, formatBytes } from './utils/lottieProcessor';
import { exportAsGif, exportAsVideo } from './utils/lottieExporter';

const FOLDER_ICON = new URL('/folder-icon.png', import.meta.url).href;
const LOGO_MARK   = new URL('/logo-mark.png',   import.meta.url).href;
const EASE = 'cubic-bezier(0.4, 0.0, 0.2, 1)';

// ─── Logo Animation — Interactive ─────────────────────────────────────────────
import lottie from 'lottie-web';

export function LogoAnimation({ size = 48 }) {
  const [animData, setAnimData] = useState(null);
  const containerRef = useRef(null);
  const animRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    fetch('logo-animation.json')
      .then(res => res.json())
      .then(data => setAnimData(data))
      .catch(err => console.error("Failed to load logo animation", err));
  }, []);

  const scheduleNext = useCallback(() => {
    timerRef.current = setTimeout(() => {
      animRef.current?.goToAndPlay(0, true);
    }, 9000); // 9s rest
  }, []);

  useEffect(() => {
    if (!containerRef.current || !animData) return;

    containerRef.current.innerHTML = '';

    animRef.current = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      animationData: JSON.parse(JSON.stringify(animData)),
    });

    animRef.current.addEventListener('complete', scheduleNext);

    // Initial trigger
    timerRef.current = setTimeout(() => {
      animRef.current?.goToAndPlay(0, true);
    }, 2500);

    // Provide click-to-play so users can also interact manually
    const handleClick = () => {
      clearTimeout(timerRef.current);
      animRef.current?.goToAndPlay(0, true);
    };

    const el = containerRef.current;
    if (el) {
        el.addEventListener('click', handleClick);
    }

    return () => {
      clearTimeout(timerRef.current);
      if (el) {
          el.removeEventListener('click', handleClick);
      }
      if (animRef.current) {
        animRef.current.destroy();
      }
    };
  }, [animData, scheduleNext]);

  if (!animData) {
    return <img src={LOGO_MARK} alt="Lottiney" style={{ width: size, height: size, objectFit: 'contain', display: 'block' }} />;
  }

  return (
    <div 
      ref={containerRef} 
      onClick={() => {
        clearTimeout(timerRef.current);
        animRef.current?.goToAndPlay(0, true);
      }}
      style={{ width: size, height: size, cursor: 'pointer', display: 'block' }} 
    />
  );
}

// ─── Animated counter ─────────────────────────────────────────────────────────
function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target == null) return;
    let start = null;
    const end = parseFloat(target);
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setValue(+((1 - Math.pow(1 - p, 3)) * end).toFixed(1));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return value;
}

// ─── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [appState, setAppState]           = useState('idle');
  const [originalFile, setOriginalFile]   = useState(null);
  const [originalData, setOriginalData]   = useState(null);
  const [cleanedData, setCleanedData]     = useState(null);
  const [stats, setStats]                 = useState(null);
  const [isDragging, setIsDragging]       = useState(false);
  const [resultVisible, setResultVisible] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const fileInputRef = useRef(null);
  const reducePct    = useCountUp(resultVisible ? stats?.reductionPercentage : null, 900);

  const handleFile = useCallback((file) => {
    if (!file || !file.name.endsWith('.json')) return;
    setOriginalFile({ name: file.name, size: file.size });
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        setOriginalData(JSON.parse(e.target.result));
        setAppState('file_selected');
      } catch { alert('Invalid JSON'); }
    };
    reader.readAsText(file);
  }, []);

  const executeOptimization = () => {
    if (!originalData) return;
    setAppState('processing');
    setTimeout(() => {
      const result = processLottie(JSON.stringify(originalData));
      if (result.success) {
        const cleanSize = new Blob([JSON.stringify(result.data)]).size;
        setCleanedData(result.data);
        setStats({
          originalSize: originalFile.size, cleanSize,
          reductionPercentage: (((originalFile.size - cleanSize) / originalFile.size) * 100).toFixed(1),
        });
        setAppState('done');
        setTimeout(() => setResultVisible(true), 120);
      } else {
        alert('Failed: ' + result.error);
        setAppState('file_selected');
      }
    }, 600);
  };

  const resetApp = () => {
    setResultVisible(false);
    setTimeout(() => {
      setAppState('idle'); setOriginalFile(null);
      setOriginalData(null); setCleanedData(null); setStats(null); setShowExport(false); if(fileInputRef.current) fileInputRef.current.value = '';
    }, 320);
  };

  const handleExportOptions = async (options, setProgress) => {
    if (!cleanedData && !originalData) return;
    const targetData = cleanedData || originalData; // use cleaned if available

    try {
      let blob;
      // lottieExporter exports options like fps, resolution, onProgress
      const exportOptions = { 
        fps: parseInt(options.fps, 10), 
        resolution: options.resolution, 
        transparent: options.transparent,
        onProgress: (prog) => { if (setProgress) setProgress(prog); }
      };

      if (options.mode === 'gif') {
        blob = await exportAsGif(targetData, exportOptions);
      } else {
        blob = await exportAsVideo(targetData, exportOptions);
      }

      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      const baseName = originalFile?.name ? originalFile.name.replace('.json', '') : 'animation';
      const extension = options.mode === 'gif' ? 'gif' : 'webm';
      a.download = `${baseName}_${options.fps}fps.${extension}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      console.error(err);
      const msg = err?.message || (typeof err === 'string' ? err : 'Unknown error — check browser console for details');
      alert("Failed to export: " + msg);
    }
  };

  const handleDownload = () => {
    if (!cleanedData) return;
    const a = document.createElement('a');
    a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(cleanedData));
    a.download = `Clean_${originalFile?.name || 'animation.json'}`;
    document.body.appendChild(a); a.click(); a.remove();
  };

  const isDone   = appState === 'done';
  const isUpload = !isDone;

  return (
    <div style={{
      minHeight: '100vh', width: '100%',
      background: '#FFF4EE',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '48px 24px', boxSizing: 'border-box',
      fontFamily: '"Outfit", sans-serif',
    }}>

      {/* ══ White card container ══ */}
      <div style={{
        width: '100%',
        maxWidth: isDone ? '860px' : '440px',
        margin: 'auto', // allows scrolling while keeping top/bottom padding
        background: 'linear-gradient(160deg, rgba(255,255,255,0.97) 0%, rgba(255,248,244,0.97) 100%)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRadius: 40,
        border: '1px solid rgba(255,255,255,0.8)',
        boxShadow: '0 24px 64px -16px rgba(180,100,60,0.10)',
        padding: isDone ? '48px 52px' : '44px 40px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        transition: `max-width 480ms ${EASE}, padding 480ms ${EASE}`,
        gap: 0,
      }}>

        {/* ── Header ── */}
        <header style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
          <LogoAnimation size={48} />
          <h1 style={{
            margin: '12px 0 6px',
            fontFamily: '"Outfit", sans-serif',
            fontSize: 38, fontWeight: 800,
            color: '#3D2A1E', letterSpacing: '-1.5px', lineHeight: 1,
          }}>
            Lottiney
          </h1>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 400, color: '#AFA193' }}>
            Make your Lottie tiny.
          </p>
        </header>

        {/* ── Upload section ── */}
        <div style={{
          width: '100%', overflow: 'hidden',
          maxHeight: isUpload ? '600px' : '0px',
          opacity: isUpload ? 1 : 0,
          transition: [
            `max-height 480ms ${EASE}`,
            `opacity ${isUpload ? '240ms 60ms' : '150ms 0ms'} ${EASE}`,
          ].join(', '),
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
        }}>
          {/* Drop Zone */}
          <DropZone
            appState={appState} isDragging={isDragging}
            originalFile={originalFile} fileInputRef={fileInputRef}
            onInputChange={(e) => handleFile(e.target.files[0])}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0]); }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onReset={resetApp}
          />

          {/* CTA — content-width, centred */}
          <PhysicsButton
            onClick={executeOptimization}
            disabled={appState === 'idle' || appState === 'processing'}
          >
            {'Optmise Lottie'}
          </PhysicsButton>
        </div>

        {/* ── Result section ── */}
        <div style={{
          width: '100%', overflow: 'hidden',
          maxHeight: isDone ? '3500px' : '0px',
          opacity: isDone ? 1 : 0,
          transition: [
            `max-height 480ms ${EASE}`,
            `opacity ${isDone ? '240ms 120ms' : '150ms 0ms'} ${EASE}`,
          ].join(', '),
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
        }}>
          {/* Preview panels */}
          <div style={{
            width: '100%', display: 'flex', alignItems: 'flex-start',
            justifyContent: 'center', gap: 24, flexWrap: 'wrap',
            opacity: resultVisible ? 1 : 0,
            transform: resultVisible ? 'translateY(0) scale(1)' : 'translateY(14px) scale(0.96)',
            transition: `opacity 300ms ${EASE}, transform 380ms ${EASE}`,
          }}>
            <LabelledPreview label="ORIGINAL"  animationData={originalData} size={formatBytes(stats?.originalSize)} delay={0}  visible={resultVisible} />
            <LabelledPreview label="OPTIMISED" animationData={cleanedData}  size={formatBytes(stats?.cleanSize)}   delay={80} visible={resultVisible} highlighted />
          </div>

          {/* Stats */}
          <div style={{
            marginTop: 36, textAlign: 'center',
            opacity: resultVisible ? 1 : 0,
            transform: resultVisible ? 'translateY(0)' : 'translateY(10px)',
            transition: `opacity 300ms 200ms ${EASE}, transform 360ms 200ms ${EASE}`,
          }}>
            <p style={{
              fontSize: 72, fontWeight: 800, margin: '0 0 4px', lineHeight: 1,
              background: 'linear-gradient(135deg, #F26D3D, #F5895F)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>{reducePct}%</p>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#AFA193', textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>
              Reduction in Size
            </p>
          </div>

          {/* Download */}
          <div style={{
            marginTop: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            opacity: resultVisible ? 1 : 0,
            transform: resultVisible ? 'translateY(0)' : 'translateY(10px)',
            transition: `opacity 300ms 280ms ${EASE}, transform 360ms 280ms ${EASE}`,
          }}>
            <PhysicsButton onClick={handleDownload} icon={<Download style={{width:20,height:20}} />}>
              Download Lottie
            </PhysicsButton>

            <div style={{
              overflow: 'hidden',
              maxHeight: showExport ? '0px' : '40px',
              opacity: showExport ? 0 : 1,
              transition: `max-height 300ms ${EASE}, opacity 300ms ${EASE}`,
              display: 'flex', alignItems: 'center'
            }}>
              <button onClick={() => setShowExport(true)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 700, color: '#AFA193', fontFamily: '"Outfit", sans-serif',
                transition: `color 200ms ${EASE}`, display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 8px'
              }}
                onMouseEnter={e => e.currentTarget.style.color = '#F26D3D'}
                onMouseLeave={e => e.currentTarget.style.color = '#AFA193'}
              >
                Export as Gifs/Video <span style={{ fontSize: 14 }}>&gt;</span>
              </button>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateRows: showExport ? '1fr' : '0fr',
            transition: `grid-template-rows 400ms ${EASE}`,
            width: '100%',
          }}>
            <div style={{
              overflow: showExport ? 'visible' : 'hidden', // prevent child escape while 0fr
              opacity: showExport ? 1 : 0,
              marginTop: showExport ? 24 : 0,
              transition: `opacity 300ms ${showExport ? '100ms' : '0ms'} ${EASE}, margin-top 400ms ${EASE}`,
              display: 'flex', justifyContent: 'center'
            }}>
              <ExportWindowPreview onExport={handleExportOptions} />
            </div>
          </div>

          <div style={{
            marginTop: 32, opacity: resultVisible ? 1 : 0, transition: `opacity 300ms 340ms ${EASE}` 
          }}>
            <button onClick={resetApp} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 10, fontWeight: 700, color: '#AFA193', fontFamily: '"Outfit", sans-serif',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              transition: `color 200ms ${EASE}`,
            }}
              onMouseEnter={e => e.currentTarget.style.color = '#F26D3D'}
              onMouseLeave={e => e.currentTarget.style.color = '#AFA193'}
            >
              OPTIMISE ANOTHER FILE
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}

// ─── DropZone ─────────────────────────────────────────────────────────────────
// States: idle (22-62) | file_selected (22-70) | processing (22-71)
function DropZone({ appState, isDragging, originalFile, fileInputRef, onInputChange, onDrop, onDragOver, onDragLeave, onReset }) {
  const [hovered, setHovered] = useState(false);
  const isIdle       = appState === 'idle';
  const isSelected   = appState === 'file_selected';
  const isProcessing = appState === 'processing';
  const hasFile      = isSelected || isProcessing;

  const borderColor = isDragging || (hovered && isIdle)
    ? '#FF6C43'
    : hasFile
      ? '#FF6C43'
      : '#F5B49A';

  return (
    <div
      onClick={() => !isProcessing && fileInputRef.current?.click()}
      onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
      onMouseEnter={() => !isProcessing && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%', minHeight: 260, borderRadius: 20,
        border: `2px dashed ${borderColor}`,
        background: 'rgba(255,255,255,0.85)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 16, padding: '40px 28px', boxSizing: 'border-box',
        cursor: isProcessing ? 'default' : 'pointer',
        transition: `border-color 220ms ${EASE}`,
        position: 'relative',
      }}
    >
      <input type="file" ref={fileInputRef} accept=".json"
        style={{ display: 'none' }} onChange={onInputChange} disabled={isProcessing} />

      {/* ── IDLE STATE (22-62) ── */}
      {isIdle && (
        <>
          <img src={FOLDER_ICON} alt="folder" style={{
            width: 60, height: 'auto',
            filter: 'drop-shadow(0 6px 14px rgba(242,109,61,0.3))',
            transform: hovered ? 'scale(1.08) translateY(-4px)' : 'scale(1) translateY(0)',
            transition: `transform 240ms ${EASE}`,
          }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: '#3D2A1E', lineHeight: 1.3 }}>
              Select a <span style={{ color: '#FF6C43' }}>Lottie File</span>
            </p>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 400, color: '#AFA193' }}>
              Drag &amp; drop or Click to browse
            </p>
          </div>
        </>
      )}

      {/* ── FILE SELECTED STATE (22-70) ── */}
      {isSelected && (
        <>
          <img src={FOLDER_ICON} alt="folder" style={{
            width: 60, height: 'auto',
            filter: 'drop-shadow(0 6px 14px rgba(242,109,61,0.3))',
          }} />
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* File name */}
            <p style={{
              margin: 0, fontSize: 16, fontWeight: 700, color: '#3D2A1E',
              maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {originalFile?.name}
            </p>
            {/* File size + change */}
            <p style={{
              margin: 0, fontSize: 13, fontWeight: 500, color: '#AFA193',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}>
              <span>{formatBytes(originalFile?.size)}</span>
              <span style={{ color: '#D4C8BC' }}>·</span>
              <button onClick={(e) => { e.stopPropagation(); onReset(); }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, color: '#FF6C43',
                  fontFamily: '"Outfit", sans-serif', padding: 0,
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >Change file</button>
            </p>
          </div>
        </>
      )}

      {/* ── PROCESSING STATE (22-71) ── */}
      {isProcessing && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          {/* Animated ring */}
          <div style={{ position: 'relative', width: 60, height: 60 }}>
            <div style={{
              position: 'absolute', inset: 0,
              borderRadius: '50%',
              border: '4px solid rgba(255,108,67,0.15)',
            }} />
            <div style={{
              position: 'absolute', inset: 0,
              borderRadius: '50%',
              border: '4px solid transparent',
              borderTopColor: '#FF6C43',
              animation: 'spin 0.9s linear infinite',
            }} />
            <div style={{
              position: 'absolute', inset: 8,
              borderRadius: '50%',
              background: 'rgba(255,108,67,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <img src={FOLDER_ICON} alt="" style={{ width: 28, height: 'auto', opacity: 0.7 }} />
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#3D2A1E' }}>
              Optimising...
            </p>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 400, color: '#AFA193' }}>
              {originalFile?.name}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Physics Button — content-width ───────────────────────────────────────────
// ─── Primary Button — Figma spec ─────────────────────────────────────────────
// Layout:  display flex; padding: 10px 24px; gap: 10px
// Style:   border-radius: 20px; bg: #FF6C43; box-shadow glow
// Hover:   translateY(-2px) scale(1.05)
// Press:   translateY(0)    scale(0.98)
function PhysicsButton({ onClick, disabled, icon, children }) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const isDisabled = !!disabled;

  return (
    <button
      onClick={!isDisabled ? onClick : undefined}
      disabled={isDisabled}
      onMouseEnter={() => !isDisabled && setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => !isDisabled && setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: '10px 24px',
        borderRadius: 20,
        border: 'none',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        fontFamily: '"Outfit", sans-serif',
        fontSize: 18,
        fontWeight: 700,
        color: '#fff',
        letterSpacing: '0.01em',
        background: isDisabled ? '#E8D0C8' : '#FF6C43',
        boxShadow: isDisabled
          ? 'none'
          : pressed
            ? '0 0 12px 0 rgba(255,108,67,0.25)'
            : '0 0 12px 0 rgba(255,108,67,0.30)',
        transform: pressed
          ? 'translateY(0) scale(0.98)'
          : hovered && !isDisabled
            ? 'translateY(-2px) scale(1.025)'
            : 'translateY(0) scale(1)',
        transition: `transform 180ms ${EASE}, box-shadow 180ms ${EASE}`,
        opacity: isDisabled ? 0.55 : 1,
        whiteSpace: 'nowrap',
      }}
    >
      {icon}{children}
    </button>
  );
}

function Spinner() {
  return (
    <div style={{
      width: 20, height: 20,
      border: '3px solid rgba(255,255,255,0.35)',
      borderTopColor: '#fff', borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
  );
}

function LabelledPreview({ label, animationData, size, delay, visible, highlighted }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0) scale(1)' : 'translateY(14px) scale(0.96)',
      transition: `opacity 300ms ${delay}ms ${EASE}, transform 380ms ${delay}ms ${EASE}`,
    }}>
      <PreviewWindow animationData={animationData} label={label} size={size} accent={!!highlighted} />
    </div>
  );
}

const _s = document.createElement('style');
_s.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
document.head.appendChild(_s);
