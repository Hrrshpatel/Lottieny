import { useState, useRef, useEffect, useCallback } from 'react';
import { Download } from 'lucide-react';
import PreviewWindow from './components/PreviewWindow';
import { processLottie, formatBytes } from './utils/lottieProcessor';

// Assets — served from /public
const LOGO_MARK = new URL('/logo-mark.png', import.meta.url).href;
const FOLDER_ICON = new URL('/folder-icon.png', import.meta.url).href;

const EASE = 'cubic-bezier(0.4, 0.0, 0.2, 1)';

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
      setValue(+(( 1 - Math.pow(1 - p, 3)) * end).toFixed(1));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return value;
}

// ─── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [appState, setAppState]       = useState('idle');
  const [originalFile, setOriginalFile] = useState(null);
  const [originalData, setOriginalData] = useState(null);
  const [cleanedData, setCleanedData]   = useState(null);
  const [stats, setStats]               = useState(null);
  const [isDragging, setIsDragging]     = useState(false);
  const [resultVisible, setResultVisible] = useState(false);
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
      } catch { alert('Invalid JSON file'); }
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
      setOriginalData(null); setCleanedData(null); setStats(null);
    }, 320);
  };

  const handleDownload = () => {
    if (!cleanedData) return;
    const a = document.createElement('a');
    a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(cleanedData));
    a.download = `clean_${originalFile?.name || 'animation.json'}`;
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
      {/* ── Card ── */}
      <div style={{
        width: '100%',
        maxWidth: isDone ? '840px' : '420px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        transition: `max-width 480ms ${EASE}`,
      }}>

        {/* ── HEADER — always visible ── */}
        <header style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28, gap: 0 }}>
          {/* Logo mark */}
          <img
            src={LOGO_MARK}
            alt="Lottiney"
            style={{ width: 52, height: 52, objectFit: 'contain', marginBottom: 12 }}
          />
          {/* Title */}
          <h1 style={{
            margin: '0 0 6px',
            fontFamily: '"Outfit", sans-serif',
            fontSize: 52, fontWeight: 800,
            color: '#3D2A1E', letterSpacing: '-1.5px', lineHeight: 1,
          }}>
            Lottie<span style={{ fontStyle: 'italic' }}>ney</span>
          </h1>
          {/* Tagline */}
          <p style={{
            margin: 0, fontSize: 16, fontWeight: 400,
            color: '#AFA193', letterSpacing: '0.01em',
          }}>
            Make your Lottie tiny.
          </p>
        </header>

        {/* ── UPLOAD SECTION ── */}
        <div style={{
          width: '100%',
          maxHeight: isUpload ? '600px' : '0px',
          overflow: 'hidden',
          opacity: isUpload ? 1 : 0,
          transition: [
            `max-height 480ms ${EASE}`,
            `opacity ${isUpload ? '240ms 60ms' : '150ms 0ms'} ${EASE}`,
          ].join(', '),
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
        }}>

          {/* Drop Zone */}
          <DropZone
            appState={appState}
            isDragging={isDragging}
            originalFile={originalFile}
            fileInputRef={fileInputRef}
            onInputChange={(e) => handleFile(e.target.files[0])}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0]); }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onReset={resetApp}
          />

          {/* Optimise Button */}
          <PhysicsButton
            onClick={executeOptimization}
            disabled={appState === 'idle' || appState === 'processing'}
            style={{ width: '100%' }}
          >
            {appState === 'processing' ? (
              <>
                <Spinner /> Optimising...
              </>
            ) : 'Optmise Lottie'}
          </PhysicsButton>
        </div>

        {/* ── RESULT SECTION ── */}
        <div style={{
          width: '100%',
          maxHeight: isDone ? '900px' : '0px', overflow: 'hidden',
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
            <LabelledPreview label="ORIGINAL" animationData={originalData} size={formatBytes(stats?.originalSize)} delay={0}  visible={resultVisible} />
            <LabelledPreview label="OPTIMISED" animationData={cleanedData}  size={formatBytes(stats?.cleanSize)}   delay={80} visible={resultVisible} highlighted />
          </div>

          {/* Stat */}
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
            marginTop: 28,
            opacity: resultVisible ? 1 : 0,
            transform: resultVisible ? 'translateY(0)' : 'translateY(10px)',
            transition: `opacity 300ms 280ms ${EASE}, transform 360ms 280ms ${EASE}`,
            width: '100%',
          }}>
            <PhysicsButton onClick={handleDownload} icon={<Download style={{width:20,height:20}} />} style={{ width: '100%' }}>
              Download Lottie
            </PhysicsButton>
          </div>

          <div style={{ marginTop: 16, opacity: resultVisible ? 1 : 0, transition: `opacity 300ms 340ms ${EASE}` }}>
            <button onClick={resetApp} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 600, color: '#AFA193', fontFamily: '"Outfit", sans-serif',
              transition: `color 200ms ${EASE}`,
            }}
              onMouseEnter={e => e.currentTarget.style.color = '#F26D3D'}
              onMouseLeave={e => e.currentTarget.style.color = '#AFA193'}
            >
              Process another file
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DropZone ──────────────────────────────────────────────────────────────────
function DropZone({ appState, isDragging, originalFile, fileInputRef, onInputChange, onDrop, onDragOver, onDragLeave, onReset }) {
  const [hovered, setHovered] = useState(false);
  const hasFile     = appState === 'file_selected' || appState === 'processing';
  const isProcessing = appState === 'processing';

  const borderColor = isDragging || hovered ? '#F26D3D' : '#F5B49A';

  return (
    <div
      onClick={() => !isProcessing && fileInputRef.current?.click()}
      onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
      onMouseEnter={() => !isProcessing && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%', minHeight: 260,
        borderRadius: 24,
        border: `2px dashed ${borderColor}`,
        background: hovered || isDragging ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.75)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 16, padding: '40px 28px', boxSizing: 'border-box',
        cursor: isProcessing ? 'not-allowed' : 'pointer',
        opacity: isProcessing ? 0.6 : 1,
        transition: `border-color 200ms ${EASE}, background 200ms ${EASE}, opacity 200ms ${EASE}`,
      }}
    >
      <input type="file" ref={fileInputRef} accept=".json"
        style={{ display: 'none' }} onChange={onInputChange} disabled={isProcessing} />

      {/* Folder icon PNG */}
      <img
        src={FOLDER_ICON}
        alt="folder"
        style={{
          width: 64, height: 'auto',
          filter: 'drop-shadow(0 6px 12px rgba(242,109,61,0.25))',
          transform: hovered && !hasFile ? 'scale(1.08) translateY(-4px)' : 'scale(1) translateY(0)',
          transition: `transform 240ms ${EASE}`,
        }}
      />

      {/* Text */}
      {hasFile ? (
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: '#3D2A1E', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {originalFile?.name}
          </p>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#AFA193', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <span>{formatBytes(originalFile?.size)}</span>
            {!isProcessing && (
              <button onClick={(e) => { e.stopPropagation(); onReset(); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#AFA193', fontFamily: '"Outfit", sans-serif', paddingLeft: 10, borderLeft: '1px solid #D4C8BC', textDecoration: 'underline' }}
                onMouseEnter={e => e.currentTarget.style.color = '#3D2A1E'}
                onMouseLeave={e => e.currentTarget.style.color = '#AFA193'}
              >Change file</button>
            )}
          </p>
        </div>
      ) : (
        <div style={{ textAlign: 'center' }}>
          {/* "Select a Lottie File" with orange highlight on "Lottie File" */}
          <p style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: '#3D2A1E', lineHeight: 1.3 }}>
            Select a <span style={{ color: '#F26D3D' }}>Lottie File</span>
          </p>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 400, color: '#AFA193' }}>
            Drag &amp; drop or Click to browse
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Physics Button ────────────────────────────────────────────────────────────
function PhysicsButton({ onClick, disabled, icon, children, style: extraStyle }) {
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
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 10, padding: '16px 32px', borderRadius: 9999, border: 'none',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        fontFamily: '"Outfit", sans-serif', fontSize: 18, fontWeight: 700,
        color: '#fff', letterSpacing: '0.01em',
        background: isDisabled
          ? 'linear-gradient(135deg, #E8D0C8, #DBBFB6)'
          : 'linear-gradient(135deg, #F26D3D, #F5895F)',
        boxShadow: isDisabled ? 'none' : pressed
          ? '0 4px 12px -4px rgba(242,109,61,0.2)'
          : hovered
            ? '0 16px 36px -8px rgba(242,109,61,0.5)'
            : '0 10px 28px -6px rgba(242,109,61,0.38)',
        transform: pressed ? 'translateY(1px)' : hovered && !isDisabled ? 'translateY(-2px)' : 'translateY(0)',
        transition: `transform 180ms ${EASE}, box-shadow 180ms ${EASE}, background 220ms ${EASE}`,
        opacity: isDisabled ? 0.55 : 1,
        ...extraStyle,
      }}
    >
      {icon}{children}
    </button>
  );
}

// ─── Spinner ───────────────────────────────────────────────────────────────────
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

// ─── LabelledPreview ──────────────────────────────────────────────────────────
function LabelledPreview({ label, animationData, size, delay, visible, highlighted }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0) scale(1)' : 'translateY(14px) scale(0.96)',
      transition: `opacity 300ms ${delay}ms ${EASE}, transform 380ms ${delay}ms ${EASE}`,
    }}>
      <p style={{
        fontSize: 11, fontWeight: 700, margin: 0, textTransform: 'uppercase',
        letterSpacing: '0.12em', color: highlighted ? '#F26D3D' : '#AFA193',
      }}>{label}</p>
      <PreviewWindow animationData={animationData} label={label} size={size} />
    </div>
  );
}

// ─── Global spin keyframe ─────────────────────────────────────────────────────
const _style = document.createElement('style');
_style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
document.head.appendChild(_style);
