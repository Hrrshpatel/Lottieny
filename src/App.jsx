import { useState } from 'react';
import { UploadCloud, Download, Sparkles, Scissors, FileJson, ArrowRight } from 'lucide-react';
import LottiePlayer from './components/LottiePlayer';
import { processLottie, formatBytes } from './utils/lottieProcessor';

function App() {
  const [originalFile, setOriginalFile] = useState(null);
  const [originalData, setOriginalData] = useState(null);
  const [cleanedData, setCleanedData] = useState(null);
  const [stats, setStats] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setOriginalFile({
      name: file.name,
      size: file.size
    });

    const reader = new FileReader();
    reader.onload = async (event) => {
      const jsonText = event.target.result;

      try {
        const parsed = JSON.parse(jsonText);
        setOriginalData(parsed);

        // Process
        setIsProcessing(true);
        setTimeout(() => {
          const result = processLottie(jsonText);
          if (result.success) {
            setCleanedData(result.data);
            const cleanStr = JSON.stringify(result.data);
            const cleanSize = new Blob([cleanStr]).size;
            setStats({
              originalSize: file.size,
              cleanSize: cleanSize,
              reduction: file.size - cleanSize,
              pathsRemoved: result.pathsRemoved
            });
          } else {
            alert('Failed to process: ' + result.error);
          }
          setIsProcessing(false);
        }, 100);
      } catch (err) {
        alert('Invalid JSON file');
        setIsProcessing(false);
      }
    };
    reader.readAsText(file);
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

  return (
    <div className="min-h-screen w-full bg-slate-900 text-slate-100 font-sans selection:bg-indigo-500/30">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Lottie Cleanse</h1>
              <p className="text-xs text-slate-400 font-medium">Watermark Remover & Optimizer</p>
            </div>
          </div>
          {cleanedData && (
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 transition-colors text-white text-sm font-semibold rounded-lg shadow-lg shadow-indigo-500/20 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Clean JSON
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {!originalData ? (
          <div className="max-w-xl mx-auto mt-20">
            <label className="flex flex-col items-center justify-center w-full h-80 rounded-3xl border-2 border-dashed border-slate-700 bg-slate-800/20 hover:bg-slate-800/40 hover:border-indigo-500/50 transition-all cursor-pointer group shadow-2xl shadow-indigo-500/5">
              <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 border border-slate-700 group-hover:scale-110 transition-transform duration-300 group-hover:border-indigo-500/50 group-hover:text-indigo-400">
                <UploadCloud className="w-10 h-10 text-slate-400 group-hover:text-indigo-400 transition-colors" />
              </div>
              <h3 className="text-xl font-bold mb-2">Upload Lottie JSON</h3>
              <p className="text-slate-400 text-sm max-w-xs text-center">
                Drag and drop your watermark-infected Lottie JSON or click to browse.
              </p>
              <input type="file" accept=".json" className="hidden" onChange={handleFileUpload} />
            </label>



            <div className="mt-12 grid grid-cols-3 gap-6 text-center">
              <div className="p-6 rounded-2xl bg-slate-800/30 border border-slate-700/50">
                <Scissors className="w-6 h-6 mx-auto mb-3 text-emerald-400" />
                <h4 className="font-semibold text-sm text-slate-200">Path Trimming</h4>
                <p className="text-xs text-slate-500 mt-1">Identifies & strips repeating watermark vectors.</p>
              </div>
              <div className="p-6 rounded-2xl bg-slate-800/30 border border-slate-700/50">
                <FileJson className="w-6 h-6 mx-auto mb-3 text-blue-400" />
                <h4 className="font-semibold text-sm text-slate-200">Optimization</h4>
                <p className="text-xs text-slate-500 mt-1">Trims extraneous decimals to slash file size.</p>
              </div>
              <div className="p-6 rounded-2xl bg-slate-800/30 border border-slate-700/50">
                <Sparkles className="w-6 h-6 mx-auto mb-3 text-amber-400" />
                <h4 className="font-semibold text-sm text-slate-200">Deterministic</h4>
                <p className="text-xs text-slate-500 mt-1">Pure JS logic, zero rasterization, lossless.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Stats Bar */}
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 flex items-center justify-around shadow-lg">
              <div className="text-center">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Original Size</p>
                <p className="text-2xl font-bold text-slate-200">{formatBytes(stats?.originalSize)}</p>
              </div>
              <div className="h-10 w-px bg-slate-700"></div>
              <div className="text-center">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Clean Size</p>
                <p className="text-2xl font-bold text-emerald-400">{formatBytes(stats?.cleanSize)}</p>
              </div>
              <div className="h-10 w-px bg-slate-700"></div>
              <div className="text-center">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Reduction</p>
                <p className="text-2xl font-bold text-blue-400">
                  {stats?.reduction > 0 ? '-' : ''}{formatBytes(stats?.reduction)}
                  <span className="text-sm font-medium ml-2 opacity-70">
                    ({stats ? Math.round((stats.reduction / stats.originalSize) * 100) : 0}%)
                  </span>
                </p>
              </div>
              <div className="h-10 w-px bg-slate-700"></div>
              <div className="text-center">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Paths Purged</p>
                <p className="text-2xl font-bold text-amber-400">{stats?.pathsRemoved || 0}</p>
              </div>
            </div>

            {/* Players */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div className="flex flex-col items-center">
                <div className="w-full flex justify-between items-center mb-4 px-2">
                  <h3 className="font-semibold text-slate-300">Original Animation</h3>
                  <span className="text-xs px-2 py-1 bg-slate-800 rounded-md text-slate-400 border border-slate-700">Watermarked</span>
                </div>
                <LottiePlayer animationData={originalData} />
              </div>

              {/* Arrow Connector */}
              <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-slate-800 border-[3px] border-slate-900 rounded-full items-center justify-center text-slate-400 z-10 shadow-xl">
                <ArrowRight className="w-5 h-5" />
              </div>

              <div className="flex flex-col items-center">
                <div className="w-full flex justify-between items-center mb-4 px-2">
                  <h3 className="font-semibold text-emerald-400">Cleaned Animation</h3>
                  <span className="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/20">Optimized</span>
                </div>
                {isProcessing ? (
                  <div className="w-full max-w-sm aspect-square bg-slate-800/30 border border-slate-700/50 rounded-2xl flex items-center justify-center">
                    <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                  </div>
                ) : (
                  <LottiePlayer animationData={cleanedData} className="border-indigo-500/30 shadow-[0_0_30px_-5px_rgba(99,102,241,0.15)] bg-slate-800/30" />
                )}
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-8 flex justify-center">
              <button
                onClick={() => {
                  setOriginalData(null);
                  setCleanedData(null);
                  setStats(null);
                  setOriginalFile(null);
                }}
                className="text-sm font-medium text-slate-400 hover:text-white transition-colors underline underline-offset-4"
              >
                Upload another file
              </button>
            </div>

          </div>
        )}
      </main>

    </div>
  );
}

export default App;
