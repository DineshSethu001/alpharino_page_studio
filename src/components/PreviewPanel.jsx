export default function PreviewPanel({ settings, width, height, selectedCount, busy, done, total, status, onExport }) {
  const imageExtension = settings.imageFormat === 'jpeg' ? 'jpg' : settings.imageFormat;
  const formatLabel = settings.exportMode === 'document' ? settings.format.toUpperCase() : settings.exportMode === 'zip' ? 'ZIP' : imageExtension.toUpperCase();
  return <aside className="preview-column">
    <section className="preview-card">
      <div className="preview-topline"><span><span className="live-dot" />LIVE PREVIEW</span><span className="preview-badge">{settings.preset === 'Custom' ? 'CUSTOM' : settings.useCase.toUpperCase()}</span></div>
      <h2>Your page canvas</h2>
      <p className="preview-description">Updates as you adjust your page settings.</p>
      <div className="preview-stage"><div className="pagePreview" style={{ aspectRatio: `${width}/${height}`, backgroundColor: settings.background, transform: `rotate(${settings.rotation}deg)`, boxShadow: `inset 0 0 0 ${Math.min(14, Number(settings.margin) * 0.5)}px #7662e822` }}><span className="preview-lines"><i /><i /><i /><i /></span><span className="preview-watermark">{settings.watermark || 'A'}</span></div></div>
      <div className="preview-dimensions"><span>Canvas size</span><strong>{width} <i>×</i> {height} <small>px</small></strong></div>
      <div className="preview-details"><span>Resolution</span><b>{settings.dpi} DPI</b></div>
      <div className="preview-details"><span>Fit / rotation</span><b>{settings.mode === 'Fit (no crop)' ? 'No crop' : 'Fill & crop'} / {settings.rotation}°</b></div>
      <div className="preview-details"><span>Selected files</span><b>{selectedCount}</b></div>
      <button className="primary" disabled={!selectedCount || busy} onClick={onExport}>{busy ? <><span className="button-spinner" /> Processing… {total ? Math.min(100, Math.round(done / total * 100)) : 0}%</> : <>Export {selectedCount || ''} file{selectedCount === 1 ? '' : 's'} <span className="button-format">{formatLabel}</span><span className="button-arrow">↗</span></>}</button>
      {busy && <div className="progress" role="progressbar" aria-valuenow={total ? Math.min(100, Math.round(done / total * 100)) : 0} aria-valuemin="0" aria-valuemax="100"><div style={{ width: `${total ? Math.min(100, done / total * 100) : 8}%` }} /></div>}
      {status && <p className="status" aria-live="polite">{status}</p>}
      <p className="privacy-note"><span>⌑</span> Your files never leave this device</p>
    </section>
    <p className="preview-footnote">For image-only PDFs, export each page as an image. Plain Text does not include image OCR.</p>
  </aside>;
}
