import { useEffect, useState } from 'react';

export default function PageSettings({
  settings, useCases, presets, customPresets, savedPreset, widthDisplay, heightDisplay, outputWidth, outputHeight,
  importFileKey, onUpdate, onUseCaseChange, onPresetChange, onDpiChange, onSavePreset, onExportPresets,
  onImportPresets, onSavedPresetChange, onDeletePreset, onDimensionChange
}) {
  const [widthDraft, setWidthDraft] = useState(String(widthDisplay));
  const [heightDraft, setHeightDraft] = useState(String(heightDisplay));
  const [dpiDraft, setDpiDraft] = useState(String(settings.dpi));

  useEffect(() => setWidthDraft(String(widthDisplay)), [widthDisplay, settings.unit, settings.dpi]);
  useEffect(() => setHeightDraft(String(heightDisplay)), [heightDisplay, settings.unit, settings.dpi]);
  useEffect(() => setDpiDraft(String(settings.dpi)), [settings.dpi]);

  return <section className="card settings-card">
    <div className="section-heading"><div><span className="section-kicker">PAGE SETTINGS</span><h2>Choose a use case and size</h2></div><span className="step-number">02</span></div>
    <label className="field">What are you making?<select value={settings.useCase} onChange={event => onUseCaseChange(event.target.value)}>{useCases.map(name => <option key={name}>{name}</option>)}</select></label>
    <div className="dimensions">
      <label className="field">Page preset<select value={presets[settings.preset] ? settings.preset : 'Custom'} onChange={event => { onSavedPresetChange(''); onPresetChange(event.target.value); }}>{Object.keys(presets).map(name => <option key={name}>{name}</option>)}</select></label>
      <label className="field">Units<select value={settings.unit} onChange={event => onUpdate('unit', event.target.value)}><option value="px">Pixels</option><option value="in">Inches</option><option value="cm">Centimeters</option><option value="mm">Millimeters</option></select></label>
    </div>
    <div className="dimensions">
      <label className="field">Width <span className="unit-label">{settings.unit}</span><input type="number" min="0.1" max="10000" step={settings.unit === 'px' ? 1 : 0.01} value={widthDraft} onChange={event => setWidthDraft(event.target.value)} onBlur={() => { if (!onDimensionChange('width', widthDraft)) setWidthDraft(String(widthDisplay)); }} /></label>
      <span className="dimension-times">×</span>
      <label className="field">Height <span className="unit-label">{settings.unit}</span><input type="number" min="0.1" max="10000" step={settings.unit === 'px' ? 1 : 0.01} value={heightDraft} onChange={event => setHeightDraft(event.target.value)} onBlur={() => { if (!onDimensionChange('height', heightDraft)) setHeightDraft(String(heightDisplay)); }} /></label>
    </div>
    <div className="dimensions"><label className="field">Resolution <span className="unit-label">DPI</span><input type="number" min="36" max="1200" value={dpiDraft} onChange={event => setDpiDraft(event.target.value)} onBlur={() => { if (!onDpiChange(dpiDraft)) setDpiDraft(String(settings.dpi)); }} /></label><div className="ratio ratio-inline"><span>Output dimensions</span><b>{outputWidth} × {outputHeight} px</b></div></div>
    <div className="dimensions fit-options">
      <label className="field">Image fit<select value={settings.mode} onChange={event => onUpdate('mode', event.target.value)}><option>Fit (no crop)</option><option>Fill (crop)</option></select></label>
      <label className="field">Crop anchor<select value={settings.cropPosition} onChange={event => onUpdate('cropPosition', event.target.value)}><option>Center</option><option>Top</option><option>Bottom</option><option>Left</option><option>Right</option><option>Top left</option><option>Top right</option><option>Bottom left</option><option>Bottom right</option></select></label>
    </div>
    <div className="dimensions fit-options">
      <label className="field">Background color<input type="color" value={settings.background} onChange={event => onUpdate('background', event.target.value)} /></label>
      <label className="field">Rotate page<select value={settings.rotation} onChange={event => onUpdate('rotation', Number(event.target.value))}><option value="0">No rotation</option><option value="90">90° clockwise</option><option value="180">180°</option><option value="270">90° counter-clockwise</option></select></label>
    </div>
    <div className="dimensions fit-options">
      <label className="field">Inner margin <span className="unit-label">MM</span><input type="number" min="0" max="1000" step="0.5" value={settings.margin} onChange={event => onUpdate('margin', Number(event.target.value))} /></label>
      <label className="field">Print bleed <span className="unit-label">MM</span><input type="number" min="0" max="20" step="0.5" value={settings.bleed} onChange={event => onUpdate('bleed', Number(event.target.value))} /></label>
    </div>
    <details className="advanced-options">
      <summary>Image enhancement</summary>
      <div className="range-field"><label htmlFor="brightness">Brightness <b>{settings.brightness}%</b></label><input id="brightness" type="range" min="50" max="150" value={settings.brightness} onChange={event => onUpdate('brightness', Number(event.target.value))} /></div>
      <div className="range-field"><label htmlFor="contrast">Contrast <b>{settings.contrast}%</b></label><input id="contrast" type="range" min="50" max="150" value={settings.contrast} onChange={event => onUpdate('contrast', Number(event.target.value))} /></div>
      <label className="toggle-field"><input type="checkbox" checked={settings.sharpen} onChange={event => onUpdate('sharpen', event.target.checked)} />Apply sharpening (slower on large batches)</label>
    </details>
    <details className="advanced-options">
      <summary>Watermark and page numbers</summary>
      <label className="field">Watermark text<input type="text" maxLength="80" placeholder="Optional" value={settings.watermark} onChange={event => onUpdate('watermark', event.target.value)} /></label>
      <div className="dimensions"><label className="field">Watermark color<input type="color" value={settings.watermarkColor} onChange={event => onUpdate('watermarkColor', event.target.value)} /></label><label className="field">Opacity <span className="unit-label">%</span><input type="number" min="5" max="100" value={settings.watermarkOpacity} onChange={event => onUpdate('watermarkOpacity', Number(event.target.value))} /></label></div>
      <label className="toggle-field"><input type="checkbox" checked={settings.pageNumbers} onChange={event => onUpdate('pageNumbers', event.target.checked)} />Add page numbers</label>
    </details>
    <div className="preset-tools"><button className="secondary-button" onClick={onSavePreset}>Save current settings as preset</button><button className="secondary-button" onClick={onExportPresets}>Export presets</button><label className="secondary-button import-button">Import presets<input key={importFileKey} type="file" accept="application/json,.json" onChange={onImportPresets} /></label></div>
    {!!customPresets.length && <div className="saved-presets"><label className="field">Saved presets<select value={savedPreset} onChange={event => onSavedPresetChange(event.target.value)}><option value="" disabled>Select a saved preset</option>{customPresets.map(item => <option key={item.name} value={item.name}>{item.name}</option>)}</select></label><button className="text-button" onClick={onDeletePreset} disabled={!savedPreset}>Delete selected preset</button></div>}
  </section>;
}
