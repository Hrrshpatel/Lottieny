import { useState, useRef } from 'react';
import { Download, Sparkles, ChevronsRight, FolderOpen, Film, Image } from 'lucide-react';
import LottiePlayer from './components/LottiePlayer';
import { processLottie, formatBytes } from './utils/lottieProcessor';
import { exportAsGif, exportAsVideo, hasTransparentBackground } from './utils/lottieExporter';

const FPS_OPTIONS = [15, 24, 30, 60];
const RESOLUTION_OPTIONS = ['540p', '720p', '1080p', '1440p'];

// ─── Lottie Preview Frame (matches reference design) ──────────────────────
function LottieFrame({ animationData, label, size, accent = false }) {
  const borderColor = accent ? 'border-[#FF6A3D]' : 'border-[#FF6A3D]/35';
  const textColor = accent ? 'text-[#FF6A3D]' : 'text-[#C8A898]';
  const cornerColor = accent ? 'border-[#FF6A3D]' : 'border-[#FF6A3D]/40';

  return (
    <div className="relative w-full flex flex-col">
      {/* Main frame box */}
      <div className={`relative w-full aspect-square rounded-3xl border-[3px] border-dashed ${borderColor} bg-white overflow-hidden`}>
        {/* Bracket corners — top-left */}
        <span className={`absolute top-3 left-3 w-5 h-5 border-t-[3px] border-l-[3px] rounded-tl-lg ${cornerColor}`} />
        {/* Bracket corners — top-right */}
        <span className={`absolute top-3 right-3 w-5 h-5 border-t-[3px] border-r-[3px] rounded-tr-lg ${cornerColor}`} />
        {/* Bracket corners — bottom-left */}
        <span className={`absolute bottom-3 left-3 w-5 h-5 border-b-[3px] border-l-[3px] rounded-bl-lg ${cornerColor}`} />
        {/* Bracket corners — bottom-right */}
        <span className={`absolute bottom-3 right-3 w-5 h-5 border-b-[3px] border-r-[3px] rounded-br-lg ${cornerColor}`} />

        {/* Animation */}
        <LottiePlayer animationData={animationData} className="w-full h-full" />

        {/* Bottom bar with label + size */}
        <div className={`absolute bottom-0 left-0 right-0 flex items-end justify-between px-5 py-4`}>
          <span className={`text-sm font-[family-name:var(--font-heading)] font-bold tracking-widest uppercase ${textColor}`}>
            {label}
          </span>
          <span className={`text-sm font-[family-name:var(--font-heading)] font-bold ${textColor}`}>
            {size}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── App ───────────────────────────────────────────────────────────────────
function App() {
  const [appState, setAppState] = useState('idle'); // 'idle' | 'file_selected' | 'processing' | 'done'
  const [originalFile, setOriginalFile] = useState(null);
  const [originalData, setOriginalData] = useState(null);
  const [cleanedData, setCleanedData] = useState(null);
  const [stats, setStats] = useState(null);
  const fileInputRef = useRef(null);

  // Export state
  const [exportFormat, setExportFormat] = useState('gif');
  const [exportFps, setExportFps] = useState(30);
  const [exportResolution, setExportResolution] = useState('720p');
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setOriginalFile({ name: file.name, size: file.size });
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        setOriginalData(parsed);
        setAppState('file_selected');
      } catch {
        alert('Invalid JSON file');
        resetApp();
      }
    };
    reader.readAsText(file);
  };

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
      } else {
        alert('Failed to process: ' + result.error);
        setAppState('idle');
      }
    }, 600);
  };

  const handleDownload = () => {
    if (!cleanedData) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(cleanedData));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `clean_${originalFile?.name || 'animation.json'}`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const resetApp = () => {
    setAppState('idle');
    setOriginalFile(null);
    setOriginalData(null);
    setCleanedData(null);
    setStats(null);
    setExportProgress(0);
    setExportStatus('');
    setIsExporting(false);
  };

  const handleExport = async () => {
    if (!cleanedData || isExporting) return;
    setIsExporting(true);
    setExportProgress(0);
    setExportStatus('Starting...');
    const onProgress = (p, s) => { setExportProgress(p); setExportStatus(s); };
    try {
      let blob, filename;
      if (exportFormat === 'gif') {
        blob = await exportAsGif(cleanedData, { fps: exportFps, resolution: exportResolution, onProgress });
        filename = `${originalFile?.name?.replace('.json', '') || 'animation'}_${exportResolution}_${exportFps}fps.gif`;
      } else {
        blob = await exportAsVideo(cleanedData, { fps: exportFps, resolution: exportResolution, onProgress });
        filename = `${originalFile?.name?.replace('.json', '') || 'animation'}_${exportResolution}_${exportFps}fps.webm`;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed: ' + err.message);
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
      setExportStatus('');
    }
  };

  const isDone = appState === 'done';

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center font-[family-name:var(--font-body)] text-[#5C4D40] selection:bg-[#FF6A3D]/20 overflow-x-hidden relative p-6 sm:p-10">

      {/* Main Floating Container — width transitions smoothly between states */}
      <div
        className={`
          w-full bg-gradient-to-b from-white/90 to-[#FAF6F2]/90 backdrop-blur-xl
          rounded-[3rem] border border-white/60
          shadow-[0_24px_64px_-16px_rgba(100,70,50,0.12)]
          flex flex-col
          transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]
          ${isDone ? 'max-w-6xl p-8 md:p-12' : 'max-w-xl p-8 md:p-12'}
        `}
      >
        {/* Header */}
        <header className="flex flex-col items-center justify-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-gradient-brand rounded-2xl shadow-brand mb-5 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
            <Sparkles className="w-7 h-7 text-white drop-shadow-sm" strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl md:text-5xl font-[family-name:var(--font-heading)] font-bold text-[#4A3B32] mb-2 tracking-tight">
            Lottiney
          </h1>
          <p className="text-base md:text-lg font-medium text-[#AFA193]">
            Make your Lottie tiny.
          </p>
        </header>

        <main className="w-full flex flex-col items-center">

          {/* ── UPLOAD STATE ─────────────────────────────────────────── */}
          {(appState === 'idle' || appState === 'file_selected' || appState === 'processing') && (
            <div className="w-full flex flex-col items-center animate-in fade-in duration-400">

              {/* Drop Zone */}
              <div
                onClick={() => appState !== 'processing' && fileInputRef.current?.click()}
                className={`
                  w-full rounded-[2rem] border-[3px] border-dashed
                  flex flex-col items-center justify-center gap-5 p-10 cursor-pointer
                  transition-all duration-300 min-h-[240px]
                  ${appState === 'file_selected'
                    ? 'border-[#FF6A3D]/70 bg-white shadow-lg'
                    : 'border-[#D4C8BC] bg-white/40 hover:bg-white hover:border-[#FF6A3D]/50 hover:shadow-md'
                  }
                  ${appState === 'processing' ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={appState === 'processing'}
                />

                {appState === 'idle' && (
                  <>
                    <div className="w-20 h-20 rounded-full bg-[#FAF6F2] shadow-inner flex items-center justify-center text-[#FF6A3D]">
                      <FolderOpen className="w-9 h-9" strokeWidth={2} />
                    </div>
                    <div className="text-center space-y-1.5">
                      <p className="text-xl font-[family-name:var(--font-heading)] font-bold text-[#5C4D40]">Select a Lottie file</p>
                      <p className="text-[#AFA193] font-medium text-sm">Drag & drop or click to browse</p>
                    </div>
                  </>
                )}

                {(appState === 'file_selected' || appState === 'processing') && (
                  <>
                    <div className="w-20 h-20 rounded-full bg-gradient-brand shadow-brand flex items-center justify-center text-white">
                      <FolderOpen className="w-9 h-9 drop-shadow-sm" strokeWidth={2.5} />
                    </div>
                    <div className="text-center space-y-1.5">
                      <p className="text-xl font-[family-name:var(--font-heading)] font-bold text-[#5C4D40] truncate max-w-[260px]">
                        {originalFile?.name}
                      </p>
                      <p className="text-[#AFA193] font-medium text-sm flex items-center justify-center gap-3">
                        <span>{formatBytes(originalFile?.size)}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); resetApp(); }}
                          className="underline outline-none hover:text-[#5C4D40] pl-2 border-l border-[#D4C8BC]"
                          disabled={appState === 'processing'}
                        >
                          Change file
                        </button>
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Optimise button */}
              <div className="mt-8 w-full flex justify-center">
                <button
                  disabled={appState === 'idle' || appState === 'processing'}
                  onClick={executeOptimization}
                  className={`
                    relative overflow-hidden group px-12 py-4 rounded-full font-bold text-lg text-white tracking-wide
                    transition-all duration-300 min-w-[220px]
                    ${appState !== 'idle'
                      ? 'bg-gradient-brand shadow-brand hover:shadow-brand-hover hover:-translate-y-1'
                      : 'bg-[#D4C8BC] text-[#FAF6F2] cursor-not-allowed opacity-60'}
                  `}
                >
                  <div className="relative z-10 flex items-center justify-center gap-3">
                    {appState === 'processing' ? (
                      <>
                        <div className="w-5 h-5 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Optimising...</span>
                      </>
                    ) : (
                      <span>Optimise Lottie</span>
                    )}
                  </div>
                  {appState !== 'idle' && (
                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── RESULT STATE ──────────────────────────────────────────── */}
          {appState === 'done' && (
            <div className="w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">

              {/* Preview row */}
              <div className="w-full grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-6">

                {/* Original */}
                <LottieFrame
                  animationData={originalData}
                  label="Original"
                  size={formatBytes(stats?.originalSize)}
                  accent={false}
                />

                {/* Arrow */}
                <div className="flex items-center justify-center py-4 md:py-0">
                  <ChevronsRight className="w-9 h-9 text-[#FF6A3D] opacity-70 rotate-90 md:rotate-0" strokeWidth={3} />
                </div>

                {/* Optimised */}
                <LottieFrame
                  animationData={cleanedData}
                  label="Optimised"
                  size={formatBytes(stats?.cleanSize)}
                  accent={true}
                />
              </div>

              {/* Size reduction stat */}
              <div className="mt-10 text-center">
                <p className="text-6xl font-[family-name:var(--font-heading)] font-bold text-[#FF6A3D] mb-1">
                  {stats?.reductionPercentage}%
                </p>
                <p className="text-sm font-bold text-[#AFA193] uppercase tracking-widest">Reduction in Size</p>
              </div>

              {/* Download JSON */}
              <div className="mt-8">
                <button
                  onClick={handleDownload}
                  className="relative overflow-hidden group px-12 py-4 rounded-full font-bold text-lg text-white tracking-wide bg-gradient-brand shadow-brand hover:shadow-brand-hover transition-all duration-300 flex items-center gap-3"
                >
                  <Download className="w-5 h-5 drop-shadow-md" />
                  <span className="relative z-10">Download Lottie</span>
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>

              {/* ── Export Panel ──────────────────────────────────── */}
              <div className="mt-10 w-full max-w-2xl">
                <div className="rounded-[2rem] border-[2px] border-dashed border-[#D4C8BC] bg-white/50 p-8 flex flex-col items-center gap-6">
                  <h3 className="text-lg font-[family-name:var(--font-heading)] font-bold text-[#4A3B32] tracking-tight">Export As</h3>

                  {/* Format toggle */}
                  <div className="flex bg-[#F4EDE6] rounded-full p-1 gap-1">
                    {[{ id: 'gif', Icon: Image, label: 'GIF' }, { id: 'video', Icon: Film, label: 'Video' }].map(({ id, Icon, label }) => (
                      <button
                        key={id}
                        onClick={() => setExportFormat(id)}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${exportFormat === id
                            ? 'bg-gradient-brand text-white shadow-brand'
                            : 'text-[#AFA193] hover:text-[#5C4D40]'
                          }`}
                      >
                        <Icon className="w-4 h-4" /> {label}
                      </button>
                    ))}
                  </div>

                  {/* FPS + Resolution */}
                  <div className="flex flex-wrap items-end justify-center gap-6">
                    {[
                      { label: 'FPS', value: exportFps, onChange: (v) => setExportFps(Number(v)), options: FPS_OPTIONS },
                      { label: 'Resolution', value: exportResolution, onChange: (v) => setExportResolution(v), options: RESOLUTION_OPTIONS },
                    ].map(({ label, value, onChange, options }) => (
                      <div key={label} className="flex flex-col items-center gap-1.5">
                        <label className="text-xs font-bold text-[#AFA193] uppercase tracking-widest">{label}</label>
                        <select
                          value={value}
                          onChange={(e) => onChange(e.target.value)}
                          disabled={isExporting}
                          className="px-4 py-2.5 rounded-xl border-2 border-[#D4C8BC] bg-white text-[#4A3B32] font-bold text-sm outline-none focus:border-[#FF6A3D] transition-colors cursor-pointer appearance-none min-w-[90px] text-center"
                        >
                          {options.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>

                  {/* Transparency badge */}
                  {exportFormat === 'gif' && cleanedData && hasTransparentBackground(cleanedData) && (
                    <div className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-1.5">
                      ✓ Transparent background detected
                    </div>
                  )}

                  {/* Progress bar */}
                  {isExporting && (
                    <div className="w-full max-w-sm">
                      <div className="w-full bg-[#F4EDE6] rounded-full h-3 overflow-hidden">
                        <div
                          className="h-full bg-gradient-brand rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${exportProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-center text-[#AFA193] font-medium mt-2">{exportStatus} ({exportProgress}%)</p>
                    </div>
                  )}

                  {/* Export button */}
                  <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className={`
                      relative overflow-hidden group px-10 py-3.5 rounded-full font-bold text-base tracking-wide
                      transition-all duration-300 flex items-center gap-2.5
                      ${isExporting
                        ? 'bg-[#D4C8BC] text-[#FAF6F2] cursor-not-allowed'
                        : 'bg-gradient-brand text-white shadow-brand hover:shadow-brand-hover hover:-translate-y-0.5'}
                    `}
                  >
                    {isExporting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Exporting...</span>
                      </>
                    ) : (
                      <>
                        {exportFormat === 'gif' ? <Image className="w-5 h-5" /> : <Film className="w-5 h-5" />}
                        <span>Export {exportFormat === 'gif' ? 'GIF' : 'Video'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Process another */}
              <div className="mt-8">
                <button
                  onClick={resetApp}
                  className="text-sm font-bold text-[#AFA193] hover:text-[#FF6A3D] transition-colors outline-none"
                >
                  Process another file
                </button>
              </div>

            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
