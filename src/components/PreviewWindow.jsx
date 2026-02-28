import { useEffect, useRef, useState } from 'react';
import lottie from 'lottie-web';

/**
 * PreviewWindow — Figma node 1:38
 *
 * Exact spacing from Figma inspector:
 *   Outer card:  top 16, left 16, right 16, bottom 12
 *   Gap image→footer: 8px
 *   Footer text: 4px side padding (left & right)
 *
 * Animation area: (350 - 16 - 16) = 318px wide
 * Height: computed from lottie aspect ratio at 318px width
 */

const CARD_WIDTH = 350;
const PAD_TOP    = 16;
const PAD_SIDE   = 16;
const PAD_BOTTOM = 12;
const GAP        = 8;   // between image area and footer
const ANIM_WIDTH = CARD_WIDTH - PAD_SIDE * 2; // 318px

export default function PreviewWindow({
  animationData,
  label = 'OPTIMISED',
  size = '',
  accent = true,  // true = orange (OPTIMISED), false = gray (ORIGINAL)
}) {
  const containerRef = useRef(null);
  const animRef = useRef(null);
  const [animHeight, setAnimHeight] = useState(ANIM_WIDTH);

  useEffect(() => {
    if (!containerRef.current || !animationData) return;

    const w = animationData.w || animationData.pw || ANIM_WIDTH;
    const h = animationData.h || animationData.ph || ANIM_WIDTH;
    setAnimHeight(Math.round((h / w) * ANIM_WIDTH));

    animRef.current = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: JSON.parse(JSON.stringify(animationData)),
    });

    return () => {
      if (animRef.current) { animRef.current.destroy(); animRef.current = null; }
    };
  }, [animationData]);

  return (
    <div
      style={{
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
        background: 'rgba(255,255,255,0.41)',
        border: accent ? '1px dashed #ff9858' : '1px dashed #C8C4C0',
        borderRadius: '16px',
        /* Exact Figma padding: top 16, sides 16, bottom 12 */
        paddingTop: PAD_TOP,
        paddingLeft: PAD_SIDE,
        paddingRight: PAD_SIDE,
        paddingBottom: PAD_BOTTOM,
        display: 'inline-flex',
        flexDirection: 'column',
        gap: GAP,
        width: CARD_WIDTH,
        boxSizing: 'border-box',
      }}
    >
      {/* Animation area — transparent, hugs lottie aspect ratio */}
      <div
        style={{
          borderRadius: '12px',
          overflow: 'hidden',
          background: 'transparent',
          width: ANIM_WIDTH,
          height: animHeight,
          flexShrink: 0,
        }}
      >
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Footer — 4px side padding, as per Figma */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: 4,
          paddingRight: 4,
          color: accent ? '#FF6C43' : '#A09890',
          fontSize: '10px',
          fontWeight: 600,
          lineHeight: 'normal',
          letterSpacing: '0.06em',
          flexShrink: 0,
        }}
      >
        <span style={{ textTransform: 'uppercase' }}>{label}</span>
        <span style={{ fontWeight: 500 }}>{size}</span>
      </div>
    </div>
  );
}
