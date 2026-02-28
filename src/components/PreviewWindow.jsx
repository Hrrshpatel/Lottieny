/**
 * PreviewWindow — matches Figma node 1:38 exactly
 *
 * Figma spec:
 *   - backdrop-blur 2px
 *   - bg rgba(255,255,255,0.41)
 *   - border: #ff9858 1px dashed, rounded-16px
 *   - inner white image area (flex-1, rounded-12px)
 *   - footer row: LABEL (SemiBold) + SIZE (Medium), color #ff6c43, 10px
 */
export default function PreviewWindow({ children, label = 'ORIGINAL', size = '' }) {
  return (
    <div
      style={{
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
        background: 'rgba(255,255,255,0.41)',
        border: '1px dashed #ff9858',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        padding: '8px',
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* White image / animation area */}
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          flex: '1 0 0',
          minHeight: '1px',
          minWidth: '1px',
          width: '100%',
          overflow: 'hidden',
        }}
      >
        {children}
      </div>

      {/* Footer row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px',
          color: '#ff6c43',
          fontSize: '10px',
          lineHeight: 'normal',
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </span>
        <span style={{ fontWeight: 500 }}>{size}</span>
      </div>
    </div>
  );
}
