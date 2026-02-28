import fs from 'fs';

const file = '/Users/harsh.patel1/.gemini/antigravity/scratch/lottie-watermark-remover/src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

const newTail = `
                  <button onClick={(e) => { e.stopPropagation(); resetApp(); }} className="underline hover:text-[#5C4D40] pl-2 border-l border-[#D4C8BC]">Change file</button>
                </p>
              </>
            )}
          </div>
        </div>

        {/* Optimize CTA */}
        <div className="mt-12 h-16">
          <button
            disabled={appState === 'idle' || appState === 'processing'}
            onClick={executeOptimization}
            className={\`
              relative overflow-hidden group px-10 py-4 rounded-full font-bold text-lg text-white tracking-wide transition-all duration-300
              \${appState !== 'idle' ? 'bg-gradient-brand shadow-brand hover:shadow-brand-hover hover:-translate-y-1' : 'bg-[#D4C8BC] text-[#FAF6F2] cursor-not-allowed opacity-60'}
            \`}
          >
            <div className="relative z-10 flex items-center gap-2">
              {appState === 'processing' ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
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
            <div className="w-full aspect-[4/3] rounded-[2rem] border-[3px] border-dashed border-[#FF8A5B]/40 bg-white/60 shadow-lg flex items-center justify-center p-6 transition-all hover:bg-white/80 overflow-hidden">
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
            <div className="w-full aspect-[4/3] rounded-[2rem] border-[3px] border-dashed border-[#FF6A3D]/70 bg-white shadow-xl flex items-center justify-center p-6 transition-transform hover:-translate-y-1 duration-500 overflow-hidden">
              <LottiePlayer animationData={cleanedData} className="w-full h-full object-contain drop-shadow-sm" />
            </div>
            <div className="w-full flex justify-between items-center px-4 mt-2">
              <span className="text-xs font-bold text-[#FF6A3D] tracking-widest uppercase">Optimised</span>
              <span className="text-xs font-bold text-[#FF6A3D]">{formatBytes(stats?.cleanSize)}</span>
            </div>
          </div>
        </div>

        {/* Metrics Display */}
        <div className="mt-10 text-center flex flex-col items-center">
          <h2 className="text-4xl md:text-5xl font-[family-name:var(--font-heading)] font-bold text-[#FF6A3D] drop-shadow-sm mb-1">
            {stats?.reductionPercentage}%
          </h2>
          <p className="text-sm font-medium text-[#AFA193]">Reduction in Size</p>
        </div>

        {/* Action Bar */}
        <div className="mt-12 flex flex-col items-center gap-6">
          <button
            onClick={handleDownload}
            className="relative overflow-hidden group px-10 py-4 rounded-full font-bold text-lg text-white tracking-wide bg-gradient-brand shadow-brand hover:shadow-brand-hover transition-all duration-300 flex items-center gap-3"
          >
            <Download className="w-5 h-5 drop-shadow-md" />
            <span className="relative z-10 drop-shadow-md">Download Lottie</span>
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </button>

          <button
            onClick={resetApp}
            className="text-sm font-bold text-[#AFA193] hover:text-[#FF6A3D] transition-colors"
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
`;

// Safely map directly from the "Change File" anchor where block consistency breaks to EOF
content = content.replace(/                  <button onClick=\{\(e\) => \{ e\.stopPropagation\(\); resetApp\(\); \}\} className="underline hover:text-\[#5C4D40\] pl-2 border-l border-\[#D4C8BC\]">Change file<\/button>[\s\S]*$/, newTail);

fs.writeFileSync(file, content);
console.log("File fixed!");
