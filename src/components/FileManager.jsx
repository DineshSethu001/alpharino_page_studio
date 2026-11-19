export default function FileManager({ files, selectedCount, onAddFiles, onSelectAll, onClear, onToggle, onMove, onRemove, onRangeChange }) {
  return <section className="card upload-card">
    <div className="section-heading">
      <div><span className="section-kicker">YOUR WORKSPACE</span><h2>Add and arrange files</h2></div>
      <span className="step-number">01</span>
    </div>
    <label className="drop-zone" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); onAddFiles(event.dataTransfer.files); }}>
      <input type="file" multiple accept="image/png,image/jpeg,image/webp,application/pdf,.pdf" onChange={event => onAddFiles(event.target.files)} />
      <span className="upload-symbol"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 15.5v3A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-3" /></svg></span>
      <strong>Drop your files here</strong>
      <span className="drop-caption">or <b>browse files</b> on your device</span>
      <span className="file-types"><span>JPG</span><span>PNG</span><span>WEBP</span><span>PDF</span><small>Processed locally</small></span>
    </label>
    <div className="filebar">
      <span><span className="file-count">{selectedCount}</span> of {files.length} files selected</span>
      <div className="file-actions">
        <button className="text-button" onClick={onSelectAll} disabled={!files.length}>Select all</button>
        <button className="text-button" onClick={onClear} disabled={!files.length}>Clear all</button>
      </div>
    </div>
    {!!files.length && <ul className="filelist">{files.map((entry, index) => <li key={entry.id} className={!entry.selected ? 'file-row unselected' : 'file-row'}>
      <input aria-label={`Include ${entry.file.name}`} type="checkbox" checked={entry.selected} onChange={event => onToggle(entry.id, event.target.checked)} />
      <span className="file-type-icon">{/\.pdf$/i.test(entry.file.name) ? 'PDF' : 'IMG'}</span>
      <span className="file-name" title={entry.file.name}>{entry.file.name}<small>{(entry.file.size / 1024 / 1024).toFixed(1)} MB</small></span>
      {/\.pdf$/i.test(entry.file.name) && <input className="page-range" aria-label={`Page range for ${entry.file.name}`} placeholder="Pages: all" value={entry.pageRange} onChange={event => onRangeChange(entry.id, event.target.value)} />}
      <button className="icon-button" aria-label={`Move ${entry.file.name} up`} disabled={index === 0} onClick={() => onMove(index, -1)}>↑</button>
      <button className="icon-button" aria-label={`Move ${entry.file.name} down`} disabled={index === files.length - 1} onClick={() => onMove(index, 1)}>↓</button>
      <button className="icon-button remove-button" aria-label={`Remove ${entry.file.name}`} onClick={() => onRemove(entry.id)}>×</button>
    </li>)}</ul>}
    <p className="format-note">Reorder files with the arrows. For PDFs, enter page ranges like <b>1-3, 5</b>; leave blank for every page.</p>
  </section>;
}
