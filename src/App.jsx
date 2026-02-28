import { useState, useRef } from 'react';
import { Download, Sparkles, ChevronsRight, FolderOpen } from 'lucide-react';
import LottiePlayer from './components/LottiePlayer';
import { processLottie, formatBytes } from './utils/lottieProcessor';

function App() {
  const [appState, setAppState] = useState('idle'); // 'idle', 'file_selected', 'processing', 'done'
  const [originalFile, setOriginalFile] = useState(null);
  const [originalData, setOriginalData] = useState(null);
  const [cleanedData, setCleanedData] = useState(null);
  const [stats, setStats] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setOriginalFile({
      name: file.name,
      size: file.size
    });

    const reader = new FileReader();
    reader.onload = (event) => {
      const jsonText = event.target.result;
      try {
        const parsed = JSON.parse(jsonText);
        setOriginalData(parsed);
        setAppState('file_selected');
      } catch (err) {
        alert('Invalid JSON file');
        resetApp();
      }
    };
    reader.readAsText(file);
  };

  const executeOptimization = () => {
    if (!originalData) return;
    setAppState('processing');

    // Slight delay to allow UI to render the processing state
    setTimeout(() => {
      const result = processLottie(JSON.stringify(originalData));
      if (result.success) {
        setCleanedData(result.data);
        const cleanStr = JSON.stringify(result.data);
        const cleanSize = new Blob([cleanStr]).size;
        setStats({
          originalSize: originalFile.size,
          cleanSize: cleanSize,
          reduction: originalFile.size - cleanSize,
          reductionPercentage: (((originalFile.size - cleanSize) / originalFile.size) * 100).toFixed(1)
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
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cleanedData));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `clean_${originalFile?.name || 'animation.json'}`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const resetApp = () => {
    setAppState('idle');
    setOriginalFile(null);
    setOriginalData(null);
    setCleanedData(null);
    setStats(null);
  };

  return (
    <div className="min-h-screen w-full flex flex-col font-[family-name:var(--font-body)] text-[#5C4D40] selection:bg-[#FF6A3D]/20 overflow-x-hidden relative">

      {/* Background Texture Overlay is handled via index.css body pseudo-element, but we add a wrapper just in case */}
      <div className="flex-1 w-full flex flex-col items-center justify-center p-6 sm:p-12 relative z-10">

        {/* Main Floating Container */}
        <div className="w-full max-w-5xl bg-gradient-to-b from-white/90 to-[#FAF6F2]/90 backdrop-blur-xl rounded-[3rem] shadow-[0_20px_60px_-15px_rgba(100,70,50,0.1)] border border-white/60 p-8 md:p-12 lg:p-16 flex flex-col relative overflow-hidden">

          {/* Header */}
          <header className="flex flex-col items-center justify-center mb-12 relative z-10">
            <div className="inline-flex items-center justify-center p-4 bg-gradient-brand rounded-2xl shadow-brand mb-6 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
              <Sparkles className="w-8 h-8 text-white drop-shadow-sm" strokeWidth={2.5} />
            </div>
            <h1 className="text-5xl md:text-6xl font-[family-name:var(--font-heading)] font-bold text-[#4A3B32] mb-3 tracking-tight">
              Lottiney
            </h1>
            <p className="text-lg md:text-xl font-medium text-[#AFA193]">
              Make your Lottie tiny.
            </p>
          </header>

          <main className="flex-1 w-full relative z-10 flex flex-col items-center justify-center min-h-[400px]">

            {/* State: Idle / File Selected */}
            {(appState === 'idle' || appState === 'file_selected' || appState === 'processing') && (
              <div className="w-full max-w-xl mx-auto flex flex-col items-center animate-in fade-in duration-500">

                {/* Upload Zone */}
                <div
                  onClick={() => appState !== 'processing' && fileInputRef.current?.click()}
                  className={`
                    w-full aspect-[4/3] sm:aspect-video rounded-[2.5rem] border-[3px] border-dashed 
                    flex flex-col items-center justify-center gap-6 p-8 cursor-pointer transition-all duration-300
                    ${appState === 'file_selected'
                      ? 'border-[#FF6A3D]/60 bg-white shadow-xl scale-[1.02]'
                      : 'border-[#D4C8BC] bg-white/40 hover:bg-white hover:border-[#FF6A3D]/40 hover:shadow-lg hover:scale-[1.01]'
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
                      <div className="w-24 h-24 rounded-full bg-[#FAF6F2] shadow-inner flex items-center justify-center text-[#FF6A3D]">
                        <FolderOpen className="w-10 h-10" strokeWidth={2} />
                      </div>
                      <div className="text-center space-y-2">
                        <p className="text-2xl font-[family-name:var(--font-heading)] font-bold text-[#5C4D40]">Select a Lottie file</p>
                        <p className="text-[#AFA193] font-medium">Drag & drop or click to browse</p>
                      </div>
                    </>
                  )}

                  {(appState === 'file_selected' || appState === 'processing') && (
                    <>
                      <div className="w-24 h-24 rounded-full bg-gradient-brand shadow-brand flex items-center justify-center text-white">
                        <FolderOpen className="w-10 h-10 drop-shadow-sm" strokeWidth={2.5} />
                      </div>
                      <div className="text-center space-y-2">
                        <p className="text-2xl font-[family-name:var(--font-heading)] font-bold text-[#5C4D40] truncate max-w-[250px] sm:max-w-sm">
                          {originalFile?.name}
                        </p>
                        <p className="text-[#AFA193] font-medium flex items-center justify-center gap-3">
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

                {/* Optimize CTA */}
                <div className="mt-12 h-16 w-full flex justify-center">
                  <button
                    disabled={appState === 'idle' || appState === 'processing'}
                    onClick={executeOptimization}
                    className={`
                      relative overflow-hidden group px-12 py-4 rounded-full font-bold text-lg text-white tracking-wide transition-all duration-300 min-w-[240px]
                      ${appState !== 'idle'
                        ? 'bg-gradient-brand shadow-brand hover:shadow-brand-hover hover:-translate-y-1'
                        : 'bg-[#D4C8BC] text-[#FAF6F2] cursor-not-allowed opacity-60'}
                    `}
                  >
                    <div className="relative z-10 flex items-center justify-center gap-3">
                      {appState === 'processing' ? (
                        <>
                          <div className="w-5 h-5 border-[3px] border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>Optimising...</span>
                        </>
                      ) : (
                        <span>Optimise Lottie</span>
                      )}
                    </div>
                    {appState !== 'idle' && (
                      <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    )}
                  </button>
                </div>

              </div>
            )}

            {/* State: Done (Comparison View) */}
            {appState === 'done' && (
              <div className="w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-700">

                <div className="w-full flex flex-col md:flex-row items-center justify-center gap-8 md:gap-6 lg:gap-12">

                  {/* Original Container */}
                  <div className="relative w-full max-w-[26rem] flex flex-col items-center gap-2">
                    <div className="w-full aspect-[4/3] rounded-[2xl] md:rounded-[2.5rem] border-[3px] border-dashed border-[#FF8A5B]/40 bg-white/60 shadow-lg flex items-center justify-center p-6 transition-all hover:bg-white/80 overflow-hidden">
                      <LottiePlayer animationData={originalData} className="w-full h-full object-contain opacity-90 transition-opacity" />
                    </div>
                    <div className="w-full flex justify-between items-center px-4 mt-2">
                      <span className="text-xs font-bold text-[#AFA193] tracking-widest uppercase">Original</span>
                      <span className="text-xs font-semibold text-[#B8A99A]">{formatBytes(stats?.originalSize)}</span>
                    </div>
                  </div>

                  {/* Center Arrow Indicator */}
                  <div className="flex flex-col items-center justify-center shrink-0 py-4 md:py-0">
                    <ChevronsRight className="w-10 h-10 text-[#FF6A3D] opacity-80 rotate-90 md:rotate-0" strokeWidth={3} />
                  </div>

                  {/* Optimised Container */}
                  <div className="relative w-full max-w-[26rem] flex flex-col items-center gap-2">
                    <div className="w-full aspect-[4/3] rounded-[2xl] md:rounded-[2.5rem] border-[3px] border-dashed border-[#FF6A3D]/70 bg-white shadow-xl flex items-center justify-center p-6 transition-transform hover:-translate-y-1 duration-500 overflow-hidden">
                      <LottiePlayer animationData={cleanedData} className="w-full h-full object-contain drop-shadow-sm" />
                    </div>
                    <div className="w-full flex justify-between items-center px-4 mt-2">
                      <span className="text-xs font-bold text-[#FF6A3D] tracking-widest uppercase">Optimised</span>
                      <span className="text-xs font-bold text-[#FF6A3D]">{formatBytes(stats?.cleanSize)}</span>
                    </div>
                  </div>
                </div>

                {/* Metrics Display */}
                <div className="mt-12 text-center flex flex-col items-center">
                  <h2 className="text-5xl md:text-6xl font-[family-name:var(--font-heading)] font-bold text-[#FF6A3D] drop-shadow-sm mb-2">
                    {stats?.reductionPercentage}%
                  </h2>
                  <p className="text-base font-bold text-[#AFA193] uppercase tracking-widest">Reduction in Size</p>
                </div>

                {/* Action Bar */}
                <div className="mt-12 flex flex-col items-center gap-6">
                  <button
                    onClick={handleDownload}
                    className="relative overflow-hidden group px-12 py-4 rounded-full font-bold text-lg text-white tracking-wide bg-gradient-brand shadow-brand hover:shadow-brand-hover transition-all duration-300 flex items-center gap-3"
                  >
                    <Download className="w-6 h-6 drop-shadow-md" />
                    <span className="relative z-10 drop-shadow-md">Download Lottie</span>
                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </button>

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
    </div>
  );
}

export default App;
