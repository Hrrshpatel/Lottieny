import { useState, useRef, useEffect, useCallback } from 'react';
import { Download, Sparkles, FolderOpen } from 'lucide-react';
import PreviewWindow from './components/PreviewWindow';
import { processLottie, formatBytes } from './utils/lottieProcessor';

// ─── Motion constants ─────────────────────────────────────────────────────────
const EASE = 'cubic-bezier(0.4, 0.0, 0.2, 1)';

// ─── Animated counter hook ────────────────────────────────────────────────────
function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target == null) return;
    let start = null;
    const end = parseFloat(target);
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      // ease-out: decelerate near end
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(+(eased * end).toFixed(1));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return value;
}

// ─── App ───────────────────────────────────────────────────────────────────────
function App() {
  // States: 'idle' | 'file_selected' | 'processing' | 'done'
  const [appState, setAppState] = useState('idle');
  const [originalFile, setOriginalFile]   = useState(null);
  const [originalData, setOriginalData]   = useState(null);
  const [cleanedData, setCleanedData]     = useState(null);
  const [stats, setStats]                 = useState(null);
  const [isDragging, setIsDragging]       = useState(false);
  // For morph: track which phase of the transition we're in
  const [resultVisible, setResultVisible] = useState(false);

  const fileInputRef = useRef(null);
  const reducePct = useCountUp(resultVisible ? stats?.reductionPercentage : null, 900);

  // ── File handling ──────────────────────────────────────────────────────────
  const handleFile = useCallback((file) => {
    if (!file || !file.name.endsWith('.json')) return;
    setOriginalFile({ name: file.name, size: file.size });
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        setOriginalData(parsed);
        setAppState('file_selected');
      } catch {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  }, []);

  const handleInputChange = (e) => handleFile(e.target.files[0]);
  const handleDrop = (e) => {
    e.preventDefault(); setIsDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  // ── Optimize ───────────────────────────────────────────────────────────────
  const executeOptimization = () => {
    if (!originalData) return;
    setAppState('processing');
    setTimeout(() => {
      const result = processLottie(JSON.stringify(originalData));
      if (result.success) {
        setCleanedData(result.data);
        const cleanSize = new Blob([JSON.stringify(result.data)]).size;
        setStats({
          originalSize: originalFile.size,
          cleanSize,
          reductionPercentage: (((originalFile.size - cleanSize) / originalFile.size) * 100).toFixed(1),
        });
        setAppState('done');
        // Stagger result content entrance
        setTimeout(() => setResultVisible(true), 120);
      } else {
        alert('Failed: ' + result.error);
        setAppState('file_selected');
      }
    }, 600);
  };

  // ── Reset ──────────────────────────────────────────────────────────────────
  const resetApp = () => {
    setResultVisible(false);
    setTimeout(() => {
      setAppState('idle');
      setOriginalFile(null);
      setOriginalData(null);
      setCleanedData(null);
      setStats(null);
    }, 320);
  };

  // ── Download ───────────────────────────────────────────────────────────────
  const handleDownload = () => {
    if (!cleanedData) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(cleanedData));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `clean_${originalFile?.name || 'animation.json'}`;
    document.body.appendChild(a); a.click(); a.remove();
  };

  const isDone   = appState === 'done';
  const isUpload = !isDone;

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        boxSizing: 'border-box',
        fontFamily: 'var(--font-body)',
      }}
    >
      {/* ── Main card — morphs from narrow upload to wide result ── */}
      <div
        style={{
          width: '100%',
          maxWidth: isDone ? '900px' : '520px',
          background: 'linear-gradient(160deg, rgba(255,255,255,0.95) 0%, rgba(250,246,242,0.95) 100%)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRadius: '48px',
          border: '1px solid rgba(255,255,255,0.7)',
          boxShadow: '0 24px 64px -16px rgba(100,70,50,0.12)',
          padding: isDone ? '48px 56px' : '48px 48px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0',
          transition: `max-width 480ms ${EASE}, padding 480ms ${EASE}`,
        }}
      >
        {/* ── Header (always visible) ── */}
        <header style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 36 }}>
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              padding: 16,
              background: 'linear-gradient(135deg, #FF6A3D, #FF7E4A)',
              borderRadius: 20,
              boxShadow: '0 10px 25px -5px rgba(255,106,61,0.35)',
              marginBottom: 20,
              transform: 'rotate(-3deg)',
              transition: `transform 300ms ${EASE}`,
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'rotate(0deg)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'rotate(-3deg)'}
          >
            <Sparkles style={{ width: 28, height: 28, color: '#fff' }} strokeWidth={2.5} />
          </div>
          <h1 style={{
            fontSize: 44, fontWeight: 700,
            fontFamily: 'var(--font-heading)',
            color: '#4A3B32', margin: '0 0 6px', letterSpacing: '-0.5px'
          }}>
            Lottieny
          </h1>
          <p style={{ fontSize: 17, fontWeight: 500, color: '#AFA193', margin: 0 }}>
            Make your Lottie tiny.
          </p>
        </header>

        {/* ─────────── UPLOAD STATE ─────────────────────────────── */}
        <div
          style={{
            width: '100%',
            overflow: 'hidden',
            maxHeight: isUpload ? '600px' : '0px',
            opacity: isUpload ? 1 : 0,
            transform: isUpload ? 'scaleY(1)' : 'scaleY(0.96)',
            transformOrigin: 'top',
            transition: [
              `max-height 480ms ${EASE}`,
              `opacity ${isUpload ? '240ms' : '200ms'} ${isUpload ? '60ms' : '0ms'} ${EASE}`,
              `transform 480ms ${EASE}`,
            ].join(', '),
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
          }}
        >
          {/* Drop Zone */}
          <DropZone
            appState={appState}
            isDragging={isDragging}
            originalFile={originalFile}
            fileInputRef={fileInputRef}
            onInputChange={handleInputChange}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onReset={resetApp}
          />

          {/* CTA Button */}
          <CTAButton
            appState={appState}
            onClick={executeOptimization}
          />
        </div>

        {/* ─────────── RESULT STATE ─────────────────────────────── */}
        <div
          style={{
            width: '100%',
            overflow: 'hidden',
            maxHeight: isDone ? '900px' : '0px',
            opacity: isDone ? 1 : 0,
            transform: isDone ? 'scaleY(1)' : 'scaleY(0.96)',
            transformOrigin: 'top',
            transition: [
              `max-height 480ms ${EASE}`,
              `opacity ${isDone ? '240ms' : '180ms'} ${isDone ? '120ms' : '0ms'} ${EASE}`,
              `transform 480ms ${EASE}`,
            ].join(', '),
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
          }}
        >
          {/* Preview panels — side by side */}
          <div
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              gap: 24,
              flexWrap: 'wrap',
              opacity: resultVisible ? 1 : 0,
              transform: resultVisible ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.96)',
              transition: `opacity 300ms ${EASE}, transform 360ms ${EASE}`,
            }}
          >
            <LabelledPreview
              label="ORIGINAL"
              animationData={originalData}
              size={formatBytes(stats?.originalSize)}
              delay={0}
              visible={resultVisible}
            />
            <LabelledPreview
              label="OPTIMISED"
              animationData={cleanedData}
              size={formatBytes(stats?.cleanSize)}
              delay={80}
              visible={resultVisible}
              highlighted
            />
          </div>

          {/* Reduction stat — counts up */}
          <div
            style={{
              marginTop: 40, textAlign: 'center',
              opacity: resultVisible ? 1 : 0,
              transform: resultVisible ? 'translateY(0)' : 'translateY(10px)',
              transition: `opacity 300ms 200ms ${EASE}, transform 360ms 200ms ${EASE}`,
            }}
          >
            <p style={{
              fontSize: 72, fontWeight: 700,
              fontFamily: 'var(--font-heading)',
              background: 'linear-gradient(135deg, #FF6A3D, #FF7E4A)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              margin: '0 0 4px', lineHeight: 1,
            }}>
              {reducePct}%
            </p>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#AFA193', textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>
              Reduction in Size
            </p>
          </div>

          {/* Download button */}
          <div
            style={{
              marginTop: 32,
              opacity: resultVisible ? 1 : 0,
              transform: resultVisible ? 'translateY(0)' : 'translateY(10px)',
              transition: `opacity 300ms 280ms ${EASE}, transform 360ms 280ms ${EASE}`,
            }}
          >
            <PhysicsButton onClick={handleDownload} icon={<Download style={{width:20,height:20}} />}>
              Download Lottie
            </PhysicsButton>
          </div>

          {/* Process another */}
          <div style={{
            marginTop: 20,
            opacity: resultVisible ? 1 : 0,
            transition: `opacity 300ms 340ms ${EASE}`,
          }}>
            <button
              onClick={resetApp}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 700, color: '#AFA193',
                fontFamily: 'var(--font-body)',
                transition: `color 200ms ${EASE}`,
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#FF6A3D'}
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
  const hasFile = appState === 'file_selected' || appState === 'processing';
  const isProcessing = appState === 'processing';

  const borderColor = isDragging || hovered
    ? 'rgba(255,106,61,0.6)'
    : hasFile
      ? 'rgba(255,106,61,0.5)'
      : 'rgba(212,200,188,1)';

  const bg = hovered || isDragging ? 'rgba(255,255,255,1)' : hasFile ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.5)';

  return (
    <div
      onClick={() => !isProcessing && fileInputRef.current?.click()}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onMouseEnter={() => !isProcessing && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%', minHeight: 220,
        borderRadius: 32, border: `2.5px dashed ${borderColor}`,
        background: bg,
        boxShadow: hovered || isDragging ? '0 8px 32px -8px rgba(255,106,61,0.15)' : 'none',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20,
        cursor: isProcessing ? 'not-allowed' : 'pointer',
        opacity: isProcessing ? 0.6 : 1,
        transition: [
          `border-color 220ms ${EASE}`,
          `background 220ms ${EASE}`,
          `box-shadow 220ms ${EASE}`,
          `opacity 220ms ${EASE}`,
        ].join(', '),
        padding: '36px 32px',
        boxSizing: 'border-box',
      }}
    >
      <input
        type="file" ref={fileInputRef} accept=".json"
        style={{ display: 'none' }} onChange={onInputChange}
        disabled={isProcessing}
      />

      {/* Icon */}
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: hasFile
          ? 'linear-gradient(135deg, #FF6A3D, #FF7E4A)'
          : '#FAF6F2',
        boxShadow: hasFile ? '0 10px 25px -5px rgba(255,106,61,0.3)' : 'inset 0 2px 8px rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: hasFile ? '#fff' : '#FF6A3D',
        transform: hovered && !hasFile ? 'scale(1.08) translateY(-4px)' : 'scale(1) translateY(0)',
        transition: `transform 240ms ${EASE}, background 300ms ${EASE}, box-shadow 240ms ${EASE}`,
        flexShrink: 0,
      }}>
        <FolderOpen style={{ width: 36, height: 36 }} strokeWidth={hasFile ? 2.5 : 2} />
      </div>

      {/* Text */}
      <div style={{ textAlign: 'center' }}>
        {hasFile ? (
          <>
            <p style={{
              fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-heading)',
              color: '#4A3B32', margin: '0 0 6px',
              maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {originalFile?.name}
            </p>
            <p style={{ fontSize: 14, fontWeight: 500, color: '#AFA193', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <span>{formatBytes(originalFile?.size)}</span>
              {!isProcessing && (
                <button
                  onClick={(e) => { e.stopPropagation(); onReset(); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 14, fontWeight: 500, color: '#AFA193',
                    fontFamily: 'var(--font-body)',
                    paddingLeft: 12, borderLeft: '1px solid #D4C8BC',
                    textDecoration: 'underline',
                    transition: `color 200ms ${EASE}`,
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#4A3B32'}
                  onMouseLeave={e => e.currentTarget.style.color = '#AFA193'}
                >
                  Change file
                </button>
              )}
            </p>
          </>
        ) : (
          <>
            <p style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-heading)', color: '#5C4D40', margin: '0 0 6px' }}>
              Select a Lottie file
            </p>
            <p style={{ fontSize: 14, fontWeight: 500, color: '#AFA193', margin: 0 }}>
              Drag &amp; drop or click to browse
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── CTAButton ─────────────────────────────────────────────────────────────────
function CTAButton({ appState, onClick }) {
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const isIdle       = appState === 'idle';
  const isProcessing = appState === 'processing';
  const enabled      = !isIdle && !isProcessing;

  return (
    <div style={{
      width: '100%', display: 'flex', justifyContent: 'center',
      opacity: enabled ? 1 : 0.5,
      transition: `opacity 320ms ${EASE}`,
    }}>
      <button
        disabled={!enabled}
        onClick={enabled ? onClick : undefined}
        onMouseEnter={() => enabled && setHovered(true)}
        onMouseLeave={() => { setHovered(false); setPressed(false); }}
        onMouseDown={() => enabled && setPressed(true)}
        onMouseUp={() => setPressed(false)}
        style={{
          minWidth: 220, padding: '16px 48px',
          borderRadius: 9999, border: 'none', cursor: enabled ? 'pointer' : 'not-allowed',
          background: enabled
            ? 'linear-gradient(135deg, #FF6A3D, #FF7E4A)'
            : 'linear-gradient(135deg, #D4C8BC, #C0B4AA)',
          color: '#fff', fontSize: 18, fontWeight: 700,
          fontFamily: 'var(--font-body)', letterSpacing: '0.01em',
          boxShadow: pressed
            ? '0 4px 12px -4px rgba(255,106,61,0.2)'
            : hovered && enabled
              ? '0 16px 32px -8px rgba(255,106,61,0.45)'
              : '0 10px 25px -5px rgba(255,106,61,0.3)',
          transform: pressed
            ? 'translateY(1px)'
            : hovered && enabled
              ? 'translateY(-2px)'
              : 'translateY(0)',
          transition: [
            `transform 180ms ${EASE}`,
            `box-shadow 180ms ${EASE}`,
            `background 220ms ${EASE}`,
          ].join(', '),
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}
      >
        {isProcessing ? (
          <>
            <div style={{
              width: 20, height: 20,
              border: '3px solid rgba(255,255,255,0.3)',
              borderTopColor: '#fff',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            <span>Optimising...</span>
          </>
        ) : (
          <span>Optimise Lottie</span>
        )}
      </button>
    </div>
  );
}

// ─── PhysicsButton — used for Download ────────────────────────────────────────
function PhysicsButton({ onClick, icon, children }) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 48px', borderRadius: 9999, border: 'none', cursor: 'pointer',
        background: 'linear-gradient(135deg, #FF6A3D, #FF7E4A)',
        color: '#fff', fontSize: 18, fontWeight: 700,
        fontFamily: 'var(--font-body)', letterSpacing: '0.01em',
        boxShadow: pressed
          ? '0 4px 12px -4px rgba(255,106,61,0.2)'
          : hovered
            ? '0 16px 32px -8px rgba(255,106,61,0.45)'
            : '0 10px 25px -5px rgba(255,106,61,0.3)',
        transform: pressed ? 'translateY(1px)' : hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: `transform 180ms ${EASE}, box-shadow 180ms ${EASE}`,
      }}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

// ─── LabelledPreview — wrapper that adds staggered entrance ───────────────────
function LabelledPreview({ label, animationData, size, delay, visible, highlighted }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0) scale(1)' : 'translateY(14px) scale(0.96)',
      transition: `opacity 300ms ${delay}ms ${EASE}, transform 380ms ${delay}ms ${EASE}`,
    }}>
      {/* Panel header label */}
      <p style={{
        fontSize: 11, fontWeight: 700, color: highlighted ? '#FF6A3D' : '#AFA193',
        textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0,
        transition: `color 220ms ${EASE}`,
      }}>
        {label}
      </p>
      <PreviewWindow
        animationData={animationData}
        label={label}
        size={size}
      />
    </div>
  );
}

// ─── Keyframes (spin animation) ───────────────────────────────────────────────
const style = document.createElement('style');
style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(style);

export default App;
