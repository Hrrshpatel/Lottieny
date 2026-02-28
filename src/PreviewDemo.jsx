import { useState } from 'react';
import PreviewWindow from './components/PreviewWindow';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default function PreviewDemo() {
  const [animationData, setAnimationData] = useState(null);
  const [fileSize, setFileSize] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleFile(file) {
    if (!file || !file.name.endsWith('.json')) return;
    setFileSize(file.size);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        setAnimationData(JSON.parse(e.target.result));
      } catch {
        alert('Invalid Lottie JSON');
      }
    };
    reader.readAsText(file);
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F4EDE6',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        fontFamily: 'sans-serif',
        gap: '32px',
      }}
    >
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#4A3C31', margin: 0 }}>
        Preview Window Demo
      </h1>

      {/* File Drop Zone */}
      <label
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0]); }}
        style={{
          border: `2px dashed ${isDragging ? '#ff6c43' : '#D4C8BC'}`,
          borderRadius: 16,
          padding: '24px 48px',
          cursor: 'pointer',
          background: isDragging ? 'rgba(255,108,67,0.05)' : '#fff',
          color: '#AFA193',
          fontSize: 14,
          fontWeight: 600,
          textAlign: 'center',
          transition: 'all 0.2s',
        }}
      >
        📂 Drop a Lottie .json here, or click to browse
        <input
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files[0])}
        />
      </label>

      {/* Preview Window — only shown once animation is loaded */}
      {animationData && (
        <PreviewWindow
          animationData={animationData}
          label="OPTIMISED"
          size={fileSize ? formatBytes(fileSize) : ''}
          padding={16}
        />
      )}

      {!animationData && (
        <p style={{ color: '#C8A898', fontSize: 13 }}>
          Upload a Lottie file above to see the preview ↑
        </p>
      )}
    </div>
  );
}
