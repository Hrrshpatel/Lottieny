import { useState } from "react";

function GifIcon({ color }) {
  return (
    <div style={{ position: "relative", flexShrink: 0, width: 16, height: 16 }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g clipPath="url(#clip0_31_88)">
          <path d="M13.5 3H2.5C2.22386 3 2 3.22386 2 3.5V12.5C2 12.7761 2.22386 13 2.5 13H13.5C13.7761 13 14 12.7761 14 12.5V3.5C14 3.22386 13.7761 3 13.5 3Z" stroke={color} strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9.75 7C10.1642 7 10.5 6.66421 10.5 6.25C10.5 5.83579 10.1642 5.5 9.75 5.5C9.33579 5.5 9 5.83579 9 6.25C9 6.66421 9.33579 7 9.75 7Z" fill={color}/>
          <path d="M9.20703 10.25L10.8127 8.64621C10.9064 8.55251 11.0335 8.49988 11.1661 8.49988C11.2986 8.49988 11.4258 8.55251 11.5195 8.64621L14.0002 11.1287" stroke={color} strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 10.5432L5.39625 7.14628C5.44269 7.09979 5.49783 7.06291 5.55853 7.03775C5.61923 7.01259 5.68429 6.99963 5.75 6.99963C5.81571 6.99963 5.88077 7.01259 5.94147 7.03775C6.00217 7.06291 6.05731 7.09979 6.10375 7.14628L11.9569 13" stroke={color} strokeLinecap="round" strokeLinejoin="round"/>
        </g>
        <defs>
          <clipPath id="clip0_31_88">
            <rect width="16" height="16" fill="white"/>
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function VideoIcon({ color }) {
  return (
    <div style={{ position: "relative", flexShrink: 0, width: 16, height: 16 }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g clipPath="url(#clip0_31_96)">
          <path d="M10 7L7 5V9L10 7Z" stroke={color} strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M13.5 3H2.5C2.22386 3 2 3.22386 2 3.5V10.5C2 10.7761 2.22386 11 2.5 11H13.5C13.7761 11 14 10.7761 14 10.5V3.5C14 3.22386 13.7761 3 13.5 3Z" stroke={color} strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 13H14" stroke={color} strokeLinecap="round" strokeLinejoin="round"/>
        </g>
        <defs>
          <clipPath id="clip0_31_96">
            <rect width="16" height="16" fill="white"/>
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function CheckboxIcon({ checked, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{ position: "relative", flexShrink: 0, width: 16, height: 16, cursor: "pointer" }}
    >
      <svg style={{ position: "absolute", display: "block", width: "100%", height: "100%" }} viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="12" height="12" rx="3" stroke={checked ? "#FF6C43" : "#B2A191"} strokeWidth="1.5" fill={checked ? "#FF6C43" : "transparent"} style={{ transition: "all 0.2s ease" }} />
        <path d="M5.5 8.5L7 10L10.5 5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: 10, strokeDashoffset: checked ? 0 : 10, transition: "stroke-dashoffset 0.2s ease" }} />
      </svg>
    </div>
  );
}

function Button({ onClick, children, isActive, bgActive = "#FFFFFF", bgInactive = "transparent" }) {
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
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        padding: "8px 16px",
        borderRadius: 31,
        width: 84,
        border: "none",
        background: isActive ? bgActive : bgInactive,
        boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.05)" : "none",
        transform: pressed ? "scale(0.95)" : hovered ? "scale(1.02)" : "scale(1)",
        transition: "transform 180ms cubic-bezier(0.4, 0.0, 0.2, 1), background 180ms",
        outline: "none",
      }}
    >
      {children}
    </button>
  );
}

export default function ExportWindowPreview({ onExport }) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mode, setMode] = useState("gif");
  const [transparent, setTransparent] = useState(false);
  const [fps, setFps] = useState("30");
  const [resolution, setResolution] = useState("720p");
  const [hoveredExport, setHoveredExport] = useState(false);


  const handleExportClick = async () => {
    if (isExporting || !onExport) return;
    setIsExporting(true);
    setProgress(0);
    
    try {
        await onExport({ mode, transparent, fps, resolution }, (prog) => {
            setProgress(prog);
        });
        setProgress(100);
        setTimeout(() => {
            setIsExporting(false);
            setProgress(0);
        }, 600);
    } catch (err) {
        console.error(err);
        setIsExporting(false);
        setProgress(0);
    }
  };

  const isGif = mode === "gif";
  const activeColor = "#FF6C43";
  const inactiveColor = "#AFA193";

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        background: "rgba(255, 255, 255, 0.95)",
        position: "relative",
        borderRadius: 16,
        paddingTop: 16,
        paddingBottom: 24,
        paddingLeft: 80,
        paddingRight: 80,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        boxSizing: "border-box",
        overflow: "hidden"

      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "Outfit", fontWeight: 500, margin: 0, color: "#AFA193", fontSize: 14, textAlign: "center" }}>
          Export As
        </p>
      </div>

      <div style={{
        background: "#F9F3EF", display: "flex", gap: 2, alignItems: "flex-start",
        justifyContent: "center", padding: 4, borderRadius: 24,
      }}>
        <Button onClick={() => setMode("gif")} isActive={isGif}>
          <GifIcon color={isGif ? activeColor : inactiveColor} />
          <span style={{ fontFamily: "Outfit", fontWeight: 500, fontSize: 12, lineHeight: 1, color: isGif ? activeColor : inactiveColor, transition: "color 180ms" }}>GIF</span>
        </Button>
        <Button onClick={() => setMode("video")} isActive={!isGif}>
          <VideoIcon color={!isGif ? activeColor : inactiveColor} />
          <span style={{ fontFamily: "Outfit", fontWeight: 500, fontSize: 12, lineHeight: 1, color: !isGif ? activeColor : inactiveColor, transition: "color 180ms" }}>Video</span>
        </Button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, transition: "all 0.3s ease", width: "100%" }}>
        <div style={{
          background: "rgba(255,255,255,0.59)", display: "flex", gap: 29, alignItems: "center", overflow: "hidden"
        }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: 70 }}>
            <p style={{ fontFamily: "Outfit", fontWeight: 500, fontSize: 10, margin: 0, textAlign: "center", color: isGif ? "#AFA193" : "#CAC2BB", transition: "color 0.3s" }}>FPS</p>
            <div style={{
              position: "relative", borderRadius: 8, width: "100%", border: "1px solid #F5E7DD", display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box", padding: "8px 6px"
            }}>
              <select
                value={fps}
                onChange={(e) => setFps(e.target.value)}
                style={{
                  fontFamily: "Outfit", fontWeight: 600, fontSize: 12, margin: 0, color: "#735A48", background: "transparent", border: "none", outline: "none", width: "100%", textAlign: "center", textAlignLast: "center", appearance: "none", cursor: "pointer"
                }}
              >
                {[15, 24, 30, 50, 60].map(val => (
                  <option key={val} value={val}>{val}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: 90 }}>
             <p style={{ fontFamily: "Outfit", fontWeight: 500, fontSize: 10, margin: 0, textAlign: "center", color: isGif ? "#AFA193" : "#CAC2BB", transition: "color 0.3s" }}>RESOLUTION</p>
            <div style={{
              position: "relative", borderRadius: 8, width: "100%", border: "1px solid #F5E7DD", display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box", padding: "8px 6px"
            }}>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                style={{
                  fontFamily: "Outfit", fontWeight: 600, fontSize: 12, margin: 0, color: "#735A48", background: "transparent", border: "none", outline: "none", width: "100%", textAlign: "center", textAlignLast: "center", appearance: "none", cursor: "pointer"
                }}
              >
                {["360p", "540p", "720p", "1080p"].map(val => (
                  <option key={val} value={val}>{val}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div style={{
          display: "flex", gap: 6, alignItems: "center", justifyContent: "center",
          opacity: isGif ? 1 : 0,
          height: isGif ? 16 : 0,
          pointerEvents: isGif ? "auto" : "none",
          transition: "all 250ms ease-in-out",
          overflow: "hidden",
          width: "100%"
        }}>
          <CheckboxIcon checked={transparent} onClick={() => setTransparent(!transparent)} />
          <p style={{ fontFamily: "Outfit", fontWeight: 500, fontSize: 10, margin: 0, color: "#AFA193" }}>
            Transparent background
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <button
          onClick={!isExporting ? handleExportClick : undefined}
          onMouseEnter={() => setHoveredExport(true)}
          onMouseLeave={() => setHoveredExport(false)}
          style={{
            background: "#FF6C43", cursor: "pointer", display: "flex", gap: 6, alignItems: "center", justifyContent: "center", padding: "8px 24px", borderRadius: 31, border: "none", outline: "none", marginTop: 12, 
            transform: hoveredExport ? "scale(1.025) translateY(-2px)" : "scale(1)", 
            transition: "all 250ms cubic-bezier(0.4, 0.0, 0.2, 1)",
            boxSizing: "border-box",
            height: 38
          }}
        >
          {!isExporting ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ position: "relative", width: 16, height: 16, flexShrink: 0 }}>
                <div style={{ position: "absolute", opacity: isGif ? 1 : 0, transition: "opacity 250ms ease-in-out", transform: isGif ? "scale(1)" : "scale(0.8)" }}>
                  <GifIcon color="white" />
                </div>
                <div style={{ position: "absolute", opacity: !isGif ? 1 : 0, transition: "opacity 250ms ease-in-out", transform: !isGif ? "scale(1)" : "scale(0.8)" }}>
                  <VideoIcon color="white" />
                </div>
              </div>
              
              <div style={{ 
                position: "relative", 
                height: 14,
                width: isGif ? 75 : 88,
                transition: "width 250ms ease-in-out",
                flexShrink: 0
               }}>
                 <p style={{ 
                   position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
                   fontFamily: "Outfit", fontWeight: 800, fontSize: 14, margin: 0, color: "white", 
                   lineHeight: "14px", whiteSpace: "nowrap",
                   opacity: isGif ? 1 : 0, pointerEvents: "none",
                   transition: "opacity 250ms ease-in-out"
                  }}>Export GIF</p>
                 <p style={{ 
                   position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
                   fontFamily: "Outfit", fontWeight: 800, fontSize: 14, margin: 0, color: "white", 
                   lineHeight: "14px", whiteSpace: "nowrap",
                   opacity: !isGif ? 1 : 0, pointerEvents: "none",
                   transition: "opacity 250ms ease-in-out"
                  }}>Export Video</p>
              </div>
            </div>
          ) : (
            <div style={{ width: 104, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ 
                width: "100%", 
                height: 4, 
                background: "rgba(255,255,255,0.3)", 
                borderRadius: 2,
                overflow: "hidden"
              }}>
                <div style={{ 
                  height: "100%", 
                  background: "white", 
                  width: `${progress}%`,
                  transition: "width 100ms linear"
                }}/>
              </div>
              <p style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 10, margin: 0, color: "white", alignSelf: "center", lineHeight: 1 }}>{progress}%</p>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
