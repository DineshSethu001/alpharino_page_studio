import React, { useEffect, useMemo, useState } from 'react';
import JSZip from 'jszip';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import AppHeader from './components/AppHeader.jsx';
import FileManager from './components/FileManager.jsx';
import PageSettings from './components/PageSettings.jsx';
import ExportSettings from './components/ExportSettings.jsx';
import PreviewPanel from './components/PreviewPanel.jsx';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const DEFAULT_SETTINGS = {
  useCase: 'Tablet & e-reader',
  preset: '3:4 Tablet portrait',
  width: 1536,
  height: 2048,
  unit: 'px',
  dpi: 300,
  format: 'pdf',
  imageFormat: 'jpeg',
  quality: 0.9,
  mode: 'Fit (no crop)',
  cropPosition: 'Center',
  background: '#ffffff',
  rotation: 0,
  margin: 0,
  bleed: 0,
  brightness: 100,
  contrast: 100,
  sharpen: false,
  watermark: '',
  watermarkColor: '#555555',
  watermarkOpacity: 30,
  pageNumbers: false,
  filenamePattern: '{name}-page-{page}',
  exportMode: 'document',
  extractPdfText: true
};

const PRESETS = {
  'Tablet & e-reader': {
    '3:4 Tablet portrait': [1536, 2048],
    '4:3 Tablet landscape': [2048, 1536],
    'Kindle Paperwhite': [1236, 1648],
    'Custom': [1536, 2048]
  },
  'Print & publishing': {
    'A4 portrait': [2480, 3508],
    'A4 landscape': [3508, 2480],
    'US Letter portrait': [2550, 3300],
    'US Letter landscape': [3300, 2550],
    'US Legal portrait': [2550, 4200],
    '5 × 8 in book': [1500, 2400],
    '6 × 9 in book': [1800, 2700],
    'Custom': [2480, 3508]
  },
  'Social media': {
    'Instagram square': [1080, 1080],
    'Instagram portrait': [1080, 1350],
    'Story / Reel': [1080, 1920],
    'Facebook cover': [1640, 624],
    'YouTube thumbnail': [1280, 720],
    'Custom': [1080, 1080]
  },
  'Web & email': {
    'Web hero': [1920, 640],
    'Blog landscape': [1200, 800],
    'Email banner': [1200, 400],
    'Email image': [600, 400],
    'Custom': [1200, 800]
  },
  'Custom': { 'Custom': [1536, 2048] }
};

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`Could not open ${file.name}`)); };
    img.src = url;
  });
}

function canvasToBlob(canvas, mimeType = 'image/jpeg', quality = 0.9) {
  return new Promise((resolve, reject) => canvas.toBlob(blob => {
    if (!blob) { reject(new Error('Image export failed')); return; }
    if (blob.type !== mimeType) { reject(new Error(`${mimeType} export is not supported by this browser.`)); return; }
    resolve(blob);
  }, mimeType, quality));
}

function loadImageBlob(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not decode the selected image')); };
    img.src = url;
  });
}

function applySharpen(canvas) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const { width, height } = canvas;
  const source = ctx.getImageData(0, 0, width, height);
  const input = source.data;
  const output = new Uint8ClampedArray(input);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) output[i + c] = Math.max(0, Math.min(255, input[i + c] * 5 - input[i - 4 + c] - input[i + 4 + c] - input[i - width * 4 + c] - input[i + width * 4 + c]));
    }
  }
  ctx.putImageData(new ImageData(output, width, height), 0, 0);
}

function drawContained(source, settings) {
  const bleed = Math.round(settings.bleed * settings.dpi / 25.4);
  const width = settings.width + bleed * 2;
  const height = settings.height + bleed * 2;
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = settings.background; ctx.fillRect(0, 0, width, height);
  const rotation = ((settings.rotation % 360) + 360) % 360;
  const rotated = rotation === 90 || rotation === 270;
  const sw = rotated ? source.height : source.width;
  const sh = rotated ? source.width : source.height;
  const inset = Math.round(settings.margin * settings.dpi / 25.4);
  const innerWidth = Math.max(1, settings.width - inset * 2);
  const innerHeight = Math.max(1, settings.height - inset * 2);
  const scale = settings.mode === 'Fill (crop)' ? Math.max(innerWidth / sw, innerHeight / sh) : Math.min(innerWidth / sw, innerHeight / sh);
  const dw = sw * scale, dh = sh * scale;
  const position = settings.cropPosition;
  let dx = (width - dw) / 2;
  let dy = (height - dh) / 2;
  if (settings.mode === 'Fill (crop)') {
    if (position.includes('Top')) dy = bleed + inset;
    if (position.includes('Bottom')) dy = height - bleed - inset - dh;
    if (position.includes('Left')) dx = bleed + inset;
    if (position.includes('Right')) dx = width - bleed - inset - dw;
  }
  ctx.save();
  ctx.filter = `brightness(${settings.brightness}%) contrast(${settings.contrast}%)`;
  if (rotation) {
    ctx.translate(dx + dw / 2, dy + dh / 2);
    ctx.rotate(rotation * Math.PI / 180);
    const sourceWidth = rotated ? dh : dw;
    const sourceHeight = rotated ? dw : dh;
    ctx.drawImage(source, -sourceWidth / 2, -sourceHeight / 2, sourceWidth, sourceHeight);
  } else ctx.drawImage(source, dx, dy, dw, dh);
  ctx.restore();
  if (settings.sharpen) applySharpen(canvas);
  if (settings.watermark) {
    ctx.save();
    ctx.globalAlpha = settings.watermarkOpacity / 100;
    ctx.fillStyle = settings.watermarkColor;
    ctx.font = `600 ${Math.max(14, Math.round(width / 35))}px sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(settings.watermark, width - bleed - inset - 12, height - bleed - inset - 12, Math.max(50, innerWidth - 24));
    ctx.restore();
  }
  if (settings.pageNumbers) {
    ctx.save();
    ctx.fillStyle = '#555555';
    ctx.font = `${Math.max(12, Math.round(width / 70))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(String(settings.pageNumber), width / 2, height - bleed - Math.max(8, inset / 2));
    ctx.restore();
  }
  return canvas;
}

async function processImage(file, settings) {
  const img = await loadImage(file);
  const canvas = drawContained(img, settings);
  return canvasToBlob(canvas, settings.mimeType, settings.quality);
}

function parsePageRange(value, pageCount) {
  if (!value.trim()) return Array.from({ length: pageCount }, (_, index) => index + 1);
  const pages = new Set();
  for (const part of value.split(',')) {
    const match = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) throw new Error(`Invalid PDF page range "${value}". Use values like 1-3,5.`);
    const start = Number(match[1]);
    const end = Number(match[2] || start);
    if (start < 1 || end < start || end > pageCount) throw new Error(`Page range "${part}" must be between 1 and ${pageCount}.`);
    for (let page = start; page <= end; page++) pages.add(page);
  }
  return [...pages].sort((a, b) => a - b);
}

async function extractPdfText(file, pageRange = '') {
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const output = [];
  for (const pageNo of parsePageRange(pageRange, pdf.numPages)) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();
    output.push(`Page ${pageNo}\n${content.items.map(item => item.str).join(' ').trim()}`);
  }
  return output.join('\n\n');
}

async function processPdf(file, settings, onProgress, pageRange) {
  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const blobs = [];
  const selectedPages = parsePageRange(pageRange || '', pdf.numPages);
  for (const [pageIndex, pageNo] of selectedPages.entries()) {
    const page = await pdf.getPage(pageNo);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(2, Math.max(settings.width / base.width, settings.height / base.height) / 1.5);
    const viewport = page.getViewport({ scale });
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = Math.ceil(viewport.width); pageCanvas.height = Math.ceil(viewport.height);
    await page.render({ canvas: pageCanvas, viewport }).promise;
    const finalCanvas = drawContained(pageCanvas, { ...settings, pageNumber: pageNo });
    blobs.push({ name: `${file.name.replace(/\.pdf$/i, '')}_page_${String(pageNo).padStart(3, '0')}.${settings.extension}`, blob: await canvasToBlob(finalCanvas, settings.mimeType, settings.quality), width: finalCanvas.width, height: finalCanvas.height, source: file.name, sourcePage: pageNo });
    onProgress?.(pageNo, pageIndex + 1, selectedPages.length);
  }
  return blobs;
}

function dimensionInPixels(value, unit, dpi) {
  const multiplier = unit === 'in' ? dpi : unit === 'cm' ? dpi / 2.54 : unit === 'mm' ? dpi / 25.4 : 1;
  return Math.round(Number(value) * multiplier);
}

function dimensionFromPixels(value, unit, dpi) {
  const multiplier = unit === 'in' ? dpi : unit === 'cm' ? dpi / 2.54 : unit === 'mm' ? dpi / 25.4 : 1;
  return Number((value / multiplier).toFixed(unit === 'px' ? 0 : 2));
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function formatName(pattern, source, page, extension) {
  const name = pattern.replaceAll('{name}', safeFileName(source)).replaceAll('{page}', String(page).padStart(3, '0'));
  return `${safeFileName(name)}.${extension}`;
}

function estimateBytes(files, width, height, quality, imageFormat) {
  if (!files.length) return 0;
  const pixels = width * height;
  const sourceBytes = files.reduce((total, entry) => total + entry.file.size, 0);
  const sourcePixels = files.reduce((total, entry) => total + Math.max(1, (entry.file.size / 3) * 8), 0);
  const bytesPerPixel = imageFormat === 'png' ? 0.38 : imageFormat === 'webp' ? 0.12 * quality : 0.18 * quality;
  return Math.round(Math.max(files.length * pixels * bytesPerPixel, sourceBytes * (pixels * files.length / sourcePixels) * 0.4));
}

function loadInitialState() {
  let settings = DEFAULT_SETTINGS;
  let customPresets = [];
  const errors = [];
  try { settings = { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem('alpharino-resizer-settings') || '{}') }; }
  catch (error) {
    console.error(error);
    errors.push(`Saved settings could not be restored: ${error.message}`);
  }
  try {
    const saved = JSON.parse(localStorage.getItem('alpharino-resizer-presets') || '[]');
    customPresets = Array.isArray(saved) ? saved.filter(item => item && typeof item.name === 'string' && Number.isFinite(Number(item.width)) && Number.isFinite(Number(item.height))) : [];
  } catch (error) {
    console.error(error);
    errors.push(`Saved presets could not be restored: ${error.message}`);
  }
  return { settings, customPresets, status: errors.join(' ') };
}

function safeFileName(name) {
  return name.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'page';
}

function uniqueName(name, usedNames) {
  let candidate = name;
  let suffix = 2;
  while (usedNames.has(candidate)) {
    const dot = name.lastIndexOf('.');
    candidate = dot < 0 ? `${name}_${suffix++}` : `${name.slice(0, dot)}_${suffix++}${name.slice(dot)}`;
  }
  usedNames.add(candidate);
  return candidate;
}

function joinBytes(chunks) {
  const result = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
  let offset = 0;
  chunks.forEach(chunk => { result.set(chunk, offset); offset += chunk.length; });
  return result;
}

async function createPdf(pages, width, height, dpi, bleedMm = 0) {
  const encoder = new TextEncoder();
  const pageWidth = ((pages[0]?.width || width) * 72 / dpi).toFixed(2);
  const pageHeight = ((pages[0]?.height || height) * 72 / dpi).toFixed(2);
  const bleed = (bleedMm * 72 / 25.4).toFixed(2);
  const trimWidth = (width * 72 / dpi).toFixed(2);
  const trimHeight = (height * 72 / dpi).toFixed(2);
  const objects = [
    encoder.encode('<< /Type /Catalog /Pages 2 0 R >>'),
    encoder.encode(`<< /Type /Pages /Kids [${pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ')}] /Count ${pages.length} >>`)
  ];

  for (let i = 0; i < pages.length; i++) {
    const pageId = 3 + i * 3;
    const imageId = pageId + 1;
    const contentId = pageId + 2;
    const pageImage = pages[i].blob.type === 'image/jpeg' ? pages[i].blob : await canvasToBlob(await loadImageBlob(pages[i].blob), 'image/jpeg', 0.95);
    const image = new Uint8Array(await pageImage.arrayBuffer());
    const content = encoder.encode(`q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im${i + 1} Do\nQ\n`);
    objects.push(
      encoder.encode(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /TrimBox [${bleed} ${bleed} ${(Number(bleed) + Number(trimWidth)).toFixed(2)} ${(Number(bleed) + Number(trimHeight)).toFixed(2)}] /BleedBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im${i + 1} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`),
      joinBytes([
        encoder.encode(`<< /Type /XObject /Subtype /Image /Width ${pages[i].width || width} /Height ${pages[i].height || height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`),
        image,
        encoder.encode('\nendstream')
      ]),
      encoder.encode(`<< /Length ${content.length} >>\nstream\n${new TextDecoder().decode(content)}endstream`)
    );
  }

  const chunks = [encoder.encode('%PDF-1.4\n%âãÏÓ\n')];
  const offsets = [0];
  let byteLength = chunks[0].length;
  objects.forEach((object, index) => {
    offsets.push(byteLength);
    const chunk = joinBytes([encoder.encode(`${index + 1} 0 obj\n`), object, encoder.encode('\nendobj\n')]);
    chunks.push(chunk);
    byteLength += chunk.length;
  });
  const xrefOffset = byteLength;
  const xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  chunks.push(encoder.encode(xref));
  return new Blob(chunks, { type: 'application/pdf' });
}

async function createDocx(pages, width, height, dpi = 96) {
  const zip = new JSZip();
  const imageContentTypes = pages.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/page${i + 1}.jpg"/>`).join('');
  const drawings = [];
  pages.forEach((_, i) => {
    const cx = Math.round((pages[i].width || width) * 914400 / dpi);
    const cy = Math.round((pages[i].height || height) * 914400 / dpi);
    drawings.push(`<w:p><w:r><w:drawing><wp:inline><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${i + 1}" name="Page ${i + 1}"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${i + 1}" name="Page ${i + 1}.jpg"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rId${i + 1}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>${i < pages.length - 1 ? '<w:p><w:r><w:br w:type="page"/></w:r></w:p>' : ''}`);
  });
  pages.forEach((page, i) => zip.file(`word/media/page${i + 1}.jpg`, page.blob));
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${imageContentTypes}</Relationships>`);
  const pageWidth = Math.round((pages[0]?.width || width) * 1440 / dpi);
  const pageHeight = Math.round((pages[0]?.height || height) * 1440 / dpi);
  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${drawings.join('')}<w:sectPr><w:pgSz w:w="${pageWidth}" w:h="${pageHeight}"/><w:pgMar w:top="0" w:right="0" w:bottom="0" w:left="0" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr></w:body></w:document>`);
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

async function createRtf(pages, width, height, dpi = 96) {
  const imageParts = [];
  for (const [i, page] of pages.entries()) {
    const bytes = new Uint8Array(await page.blob.arrayBuffer());
    let hex = '';
    for (let offset = 0; offset < bytes.length; offset += 16384) {
      hex += Array.from(bytes.subarray(offset, offset + 16384), value => value.toString(16).padStart(2, '0')).join('');
    }
    const pageWidth = pages[i].width || width;
    const pageHeight = pages[i].height || height;
    imageParts.push(`\\pard\\qc{\\pict\\jpegblip\\picw${pageWidth}\\pich${pageHeight}\\picwgoal${Math.round(pageWidth * 1440 / dpi)}\\pichgoal${Math.round(pageHeight * 1440 / dpi)} ${hex}}${i < pages.length - 1 ? '\\page' : ''}`);
  }
  return new Blob([`{\\rtf1\\ansi\\deff0 ${imageParts.join(' ')}}`], { type: 'application/rtf' });
}

async function createEpub(pages, width, height) {
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`);
  const manifest = pages.map((_, i) => `<item id="page${i + 1}" href="page${i + 1}.jpg" media-type="image/jpeg"/><item id="chapter${i + 1}" href="chapter${i + 1}.xhtml" media-type="application/xhtml+xml"/>`).join('');
  const spine = pages.map((_, i) => `<itemref idref="chapter${i + 1}"/>`).join('');
  const nav = pages.map((_, i) => `<li><a href="chapter${i + 1}.xhtml">Page ${i + 1}</a></li>`).join('');
  zip.file('EPUB/package.opf', `<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="bookid">urn:uuid:alpharino-${Date.now()}</dc:identifier><dc:title>Resized pages</dc:title><dc:language>en</dc:language><meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}</meta></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>${manifest}</manifest><spine>${spine}</spine></package>`);
  zip.file('EPUB/nav.xhtml', `<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>Contents</title></head><body><nav epub:type="toc" xmlns:epub="http://www.idpf.org/2007/ops"><h1>Pages</h1><ol>${nav}</ol></nav></body></html>`);
  pages.forEach((page, i) => {
    zip.file(`EPUB/page${i + 1}.jpg`, page.blob);
    zip.file(`EPUB/chapter${i + 1}.xhtml`, `<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>Page ${i + 1}</title><meta name="viewport" content="width=${width},height=${height}"/></head><body style="margin:0"><img src="page${i + 1}.jpg" alt="Page ${i + 1}" style="display:block;width:100%;height:auto"/></body></html>`);
  });
  return zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
}

async function createHtml(pages, width, height, extension) {
  const images = await Promise.all(pages.map(async page => {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error(`Could not prepare ${page.name} for HTML export`));
      reader.readAsDataURL(page.blob);
    });
    return dataUrl;
  }));
  const pageSections = images.map((src, i) => `<section><img src="${src}" alt="Page ${i + 1}" /></section>`).join('\n');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Resized pages</title><style>body{margin:0;background:#eee}section{display:flex;justify-content:center;margin:20px auto;max-width:${width}px}img{display:block;width:100%;height:auto}</style></head><body>${pageSections}</body></html>`;
  if (extension !== 'zip') return new Blob([html], { type: 'text/html' });
  const zip = new JSZip();
  const pageLinks = pages.map((_, i) => `<section><img src="images/page${i + 1}.jpg" alt="Page ${i + 1}" /></section>`).join('\n');
  zip.file('index.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Resized pages</title><style>body{margin:0;background:#eee}section{display:flex;justify-content:center;margin:20px auto;max-width:${width}px}img{display:block;width:100%;height:auto}</style></head><body>${pageLinks}</body></html>`);
  pages.forEach((page, i) => zip.file(`images/page${i + 1}.jpg`, page.blob));
  return zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
}

function LegacyApp() {
  const [files, setFiles] = useState([]);
  const [preset, setPreset] = useState('3:4 Tablet portrait');
  const [width, setWidth] = useState(1536);
  const [height, setHeight] = useState(2048);
  const [format, setFormat] = useState('pdf');
  const [mode, setMode] = useState('Fit (no crop)');
  const [background, setBackground] = useState('#ffffff');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const accepted = useMemo(() => files.filter(f => /\.(png|jpe?g|webp|pdf)$/i.test(f.name)), [files]);

  function addFiles(list) {
    setFiles(prev => [...prev, ...Array.from(list).filter(f => /\.(png|jpe?g|webp|pdf)$/i.test(f.name))]);
    setStatus('');
  }
  function changePreset(value) {
    setPreset(value);
    if (PRESETS[value]) { setWidth(PRESETS[value][0]); setHeight(PRESETS[value][1]); }
  }
  async function exportAll() {
    if (!accepted.length || busy) return;
    setBusy(true); setDone(0); setStatus('Preparing your pages…');
    const settings = { width: Number(width), height: Number(height), mode, background };
    try {
      let completed = 0;
      const usedNames = new Set();
      const pagesOut = [];
      for (const file of accepted) {
        if (/\.pdf$/i.test(file.name)) {
          const convertedPages = await processPdf(file, settings, (page, count) => setStatus(`Converting ${file.name}: page ${page} of ${count}`));
          convertedPages.forEach((item, index) => {
            const name = uniqueName(`${safeFileName(file.name)}_page_${String(index + 1).padStart(3, '0')}.jpg`, usedNames);
            pagesOut.push({ name, blob: item.blob });
          });
          completed += convertedPages.length;
        } else {
          const blob = await processImage(file, settings);
          const name = uniqueName(`${safeFileName(file.name)}_tablet.jpg`, usedNames);
          pagesOut.push({ name, blob }); completed++;
        }
        setDone(completed);
      }
      setTotal(completed);
      setStatus(`Creating ${format.toUpperCase()} download…`);
      let output;
      let extension = format;
      if (format === 'jpgzip') {
        const zip = new JSZip();
        pagesOut.forEach(page => zip.file(page.name, page.blob));
        output = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
        extension = 'zip';
      } else if (format === 'pdf') output = await createPdf(pagesOut, settings.width, settings.height);
      else if (format === 'epub') output = await createEpub(pagesOut, settings.width, settings.height);
      else if (format === 'docx') output = await createDocx(pagesOut, settings.width, settings.height);
      else if (format === 'rtf') output = await createRtf(pagesOut, settings.width, settings.height);
      else if (['html', 'htm', 'zip'].includes(format)) {
        output = await createHtml(pagesOut, settings.width, settings.height, format);
        if (format === 'zip') extension = 'zip';
      } else if (format === 'txt') {
        output = new Blob([`Alpharino resized page index\n${pagesOut.length} page(s), ${settings.width} x ${settings.height} px\n\nThis TXT file is an index only. The original page content is visual and is not converted to text (OCR is not available).\n\n${pagesOut.map((page, i) => `${i + 1}. ${page.name}`).join('\n')}\n`], { type: 'text/plain' });
      } else {
        throw new Error(`The ${format.toUpperCase()} format is not supported by this browser export.`);
      }
      const url = URL.createObjectURL(output);
      const a = document.createElement('a'); a.href = url; a.download = `alpharino-tablet-pages.${extension}`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus(`Finished! ${completed} page(s) exported as ${extension.toUpperCase()} at ${width} × ${height}px.`);
    } catch (err) {
      console.error(err); setStatus(`Could not finish: ${err.message}`);
    } finally { setBusy(false); }
  }

  return <main className="app-shell">
    <header className="topbar">
      <a className="brand" href="#" aria-label="Alpharino home">
        <span className="brand-mark">A</span>
        <span className="brand-name">alpharino<span>.</span></span>
      </a>
      <span className="privacy-pill"><span className="privacy-dot" />Private by design</span>
    </header>

    <section className="hero">
      <div>
        <p className="eyebrow"><span className="eyebrow-line" />CREATOR TOOLKIT</p>
        <h1>Make every page<br /><span>fit just right.</span></h1>
        <p className="hero-copy">Resize images and PDF pages for your tablet, all in one place. Your files stay on your device.</p>
      </div>
      <div className="hero-art" aria-hidden="true">
        <span className="art-sparkle sparkle-one">✳</span>
        <span className="art-sparkle sparkle-two">✦</span>
        <div className="art-page"><span /><span /><span /><i> A </i></div>
      </div>
    </section>

    <nav className="steps" aria-label="Resize steps">
      <span className="step active"><i>01</i> Add files</span>
      <span className="step-divider" />
      <span className="step"><i>02</i> Set dimensions</span>
      <span className="step-divider" />
      <span className="step"><i>03</i> Export</span>
    </nav>

    <div className="workspace">
      <div className="editor-column">
        <section className="card upload-card">
          <div className="section-heading">
            <div><span className="section-kicker">YOUR WORKSPACE</span><h2>Add your files</h2></div>
            <span className="step-number">01</span>
          </div>
          <label className="drop-zone" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files); }}>
            <input type="file" multiple accept="image/png,image/jpeg,image/webp,application/pdf,.pdf" onChange={e => addFiles(e.target.files)} />
            <span className="upload-symbol"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 15.5v3A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-3" /></svg></span>
            <strong>Drop your files here</strong>
            <span className="drop-caption">or <b>browse files</b> on your device</span>
            <span className="file-types"><span>JPG</span><span>PNG</span><span>WEBP</span><span>PDF</span><small>Up to 53+ pages</small></span>
          </label>
          <div className="filebar"><span><span className="file-count">{accepted.length}</span> {accepted.length === 1 ? 'file' : 'files'} selected</span><button className="text-button" onClick={() => setFiles([])} disabled={!accepted.length}>Clear all</button></div>
          {accepted.length > 0 && <ul className="filelist">{accepted.slice(0, 5).map((f, i) => <li key={`${f.name}-${i}`}><span className="file-type-icon">{/\.pdf$/i.test(f.name) ? 'PDF' : 'IMG'}</span><span className="file-name" title={f.name}>{f.name}</span><small>{(f.size / 1024 / 1024).toFixed(1)} MB</small></li>)}{accepted.length > 5 && <li className="more">+ {accepted.length - 5} more files</li>}</ul>}
        </section>

        <section className="card settings-card">
          <div className="section-heading">
            <div><span className="section-kicker">PAGE SETTINGS</span><h2>Choose your page size</h2></div>
            <span className="step-number">02</span>
          </div>
          <label className="field">Page preset<select value={preset} onChange={e => changePreset(e.target.value)}>{Object.keys(PRESETS).map(x => <option key={x}>{x}</option>)}</select></label>
          <div className="dimensions">
            <label className="field">Width <span className="unit-label">PX</span><input type="number" min="100" max="10000" value={width} onChange={e => {setPreset('Custom');setWidth(e.target.value);}} /></label>
            <span className="dimension-times">×</span>
            <label className="field">Height <span className="unit-label">PX</span><input type="number" min="100" max="10000" value={height} onChange={e => {setPreset('Custom');setHeight(e.target.value);}} /></label>
          </div>
          <div className="ratio"><span>Aspect ratio</span><b>{width && height ? (Number(width)/Number(height)).toFixed(3) : '—'} : 1</b></div>
          <div className="dimensions fit-options">
            <label className="field">Image fit<select value={mode} onChange={e => setMode(e.target.value)}><option>Fit (no crop)</option><option>Fill (crop)</option></select></label>
            <label className="field">Background<select value={background} onChange={e => setBackground(e.target.value)}><option value="#ffffff">White</option><option value="#f7f3ff">Soft lavender</option><option value="#000000">Black</option></select></label>
          </div>
          <p className="hint"><span className="hint-icon">✦</span><span><b>Recommended for tablets</b><br />3:4 portrait (1536 × 2048 px). Fit keeps your whole page visible; Fill may crop the edges.</span></p>
        </section>

        <section className="card format-card">
          <div className="section-heading">
            <div><span className="section-kicker">DELIVERY</span><h2>Choose a format</h2></div>
            <span className="step-number">03</span>
          </div>
          <label className="field">Export as<select value={format} onChange={e => setFormat(e.target.value)}><optgroup label="Kindle eBook"><option value="kpf" disabled>KPF (.kpf) — requires Kindle Create</option><option value="epub">EPUB (.epub)</option><option value="docx">Microsoft Word (.docx)</option><option value="doc" disabled>Microsoft Word 97–2003 (.doc) — unavailable in browser</option><option value="html">HTML (.html)</option><option value="htm">HTML (.htm)</option><option value="zip">HTML package (.zip)</option><option value="rtf">Rich Text (.rtf)</option><option value="txt">Plain Text (.txt)</option><option value="pdf">PDF (.pdf)</option></optgroup><optgroup label="Paperback / Hardcover"><option value="pdf">PDF (.pdf) — recommended</option><option value="docx">Microsoft Word (.docx)</option><option value="doc" disabled>Microsoft Word 97–2003 (.doc) — unavailable in browser</option><option value="rtf">Rich Text (.rtf)</option><option value="html">HTML (.html)</option><option value="htm">HTML (.htm)</option><option value="txt">Plain Text (.txt)</option></optgroup><optgroup label="Additional"><option value="jpgzip">JPG images (.zip)</option></optgroup></select></label>
          <p className="format-note">Exports keep each page as an image. Plain Text is a file index only; OCR is not included. KPF and legacy DOC require desktop software.</p>
        </section>
      </div>

      <aside className="preview-column">
        <section className="preview-card">
          <div className="preview-topline"><span><span className="live-dot" />LIVE PREVIEW</span><span className="preview-badge">{preset === 'Custom' ? 'CUSTOM' : 'PRESET'}</span></div>
          <h2>Your page canvas</h2>
          <p className="preview-description">A look at your selected output dimensions.</p>
          <div className="preview-stage">
            <div className="pagePreview" style={{aspectRatio: `${width}/${height}`, backgroundColor: background}}>
              <span className="preview-lines"><i /><i /><i /><i /></span>
              <span className="preview-watermark">A</span>
            </div>
          </div>
          <div className="preview-dimensions"><span>Canvas size</span><strong>{width} <i>×</i> {height} <small>px</small></strong></div>
          <div className="preview-details"><span>Fit mode</span><b>{mode === 'Fit (no crop)' ? 'No crop' : 'Fill & crop'}</b></div>
          <div className="preview-details"><span>Output</span><b>{format === 'jpgzip' ? 'JPG ZIP' : format.toUpperCase()}</b></div>
          <button className="primary" disabled={!accepted.length || busy || Number(width)<100 || Number(height)<100} onClick={exportAll}>
            {busy ? <><span className="button-spinner" /> Processing your files…</> : <>Resize &amp; download <span className="button-format">{format === 'jpgzip' ? 'JPG ZIP' : format.toUpperCase()}</span><span className="button-arrow">↗</span></>}
          </button>
          {busy && <div className="progress" role="progressbar" aria-valuenow={total ? Math.min(100, Math.round(done/total*100)) : 0} aria-valuemin="0" aria-valuemax="100"><div style={{width: `${total ? Math.min(100, done/total*100) : 8}%`}} /></div>}
          {status && <p className="status" aria-live="polite">{status}</p>}
          <p className="privacy-note"><span>⌑</span> Your files never leave this device</p>
        </section>
        <p className="preview-footnote">Keep your original files as a backup.</p>
      </aside>
    </div>

    <footer className="app-footer"><span>© Alpharino Toolkit</span><span>Made for pages that matter.</span></footer>
  </main>;
}

function App() {
  const [files, setFiles] = useState([]);
  const [initialState] = useState(loadInitialState);
  const [settings, setSettings] = useState(initialState.settings);
  const [customPresets, setCustomPresets] = useState(initialState.customPresets);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(initialState.status);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [savedPreset, setSavedPreset] = useState('');
  const [importFileKey, setImportFileKey] = useState(0);
  const selectedFiles = useMemo(() => files.filter(entry => entry.selected), [files]);
  const currentPresets = PRESETS[settings.useCase] || PRESETS.Custom;
  const mimeType = settings.imageFormat === 'png' ? 'image/png' : settings.imageFormat === 'webp' ? 'image/webp' : 'image/jpeg';
  const imageExtension = settings.imageFormat === 'jpeg' ? 'jpg' : settings.imageFormat;
  const outputWidth = settings.width + Math.round(settings.bleed * settings.dpi / 25.4) * 2;
  const outputHeight = settings.height + Math.round(settings.bleed * settings.dpi / 25.4) * 2;
  const estimate = estimateBytes(selectedFiles, outputWidth, outputHeight, settings.quality, settings.imageFormat);

  useEffect(() => {
    try { localStorage.setItem('alpharino-resizer-settings', JSON.stringify(settings)); }
    catch (error) { setStatus(`Settings could not be saved in this browser: ${error.message}`); }
  }, [settings]);

  useEffect(() => {
    try { localStorage.setItem('alpharino-resizer-presets', JSON.stringify(customPresets)); }
    catch (error) { setStatus(`Custom presets could not be saved: ${error.message}`); }
  }, [customPresets]);

  function update(key, value) {
    setSettings(previous => ({ ...previous, [key]: value }));
  }

  function addFiles(list) {
    const incoming = Array.from(list);
    const valid = incoming.filter(file => /\.(png|jpe?g|webp|pdf)$/i.test(file.name));
    const rejected = incoming.length - valid.length;
    setFiles(previous => [...previous, ...valid.map(file => ({ id: `${Date.now()}-${Math.random()}`, file, selected: true, pageRange: '' }))]);
    setStatus(rejected ? `${rejected} unsupported file(s) skipped. Choose JPG, PNG, WEBP, or PDF.` : '');
  }

  function changeUseCase(value) {
    const firstPreset = Object.entries(PRESETS[value] || PRESETS.Custom)[0];
    setSavedPreset('');
    setSettings(previous => ({ ...previous, useCase: value, preset: firstPreset[0], width: firstPreset[1][0], height: firstPreset[1][1] }));
  }

  function changeDpi(value) {
    const dpi = Number(value);
    if (!Number.isFinite(dpi) || dpi < 36 || dpi > 1200) {
      setStatus('Resolution must be between 36 and 1,200 DPI.');
      return false;
    }
    setSettings(previous => {
      const scale = previous.useCase === 'Print & publishing' ? dpi / Number(previous.dpi || 300) : 1;
      return { ...previous, dpi, width: Math.round(Number(previous.width) * scale), height: Math.round(Number(previous.height) * scale) };
    });
    return true;
  }

  function changePreset(value) {
    const dimensions = currentPresets[value];
    setSettings(previous => ({ ...previous, preset: value, ...(dimensions ? { width: dimensions[0], height: dimensions[1] } : {}) }));
  }

  function moveFile(index, direction) {
    setFiles(previous => {
      const target = index + direction;
      if (target < 0 || target >= previous.length) return previous;
      const result = [...previous];
      [result[index], result[target]] = [result[target], result[index]];
      return result;
    });
  }

  function changeDimension(axis, value) {
    const pixels = dimensionInPixels(value, settings.unit, settings.dpi);
    if (!Number.isFinite(pixels) || pixels < 100 || pixels > 10000) {
      setStatus('Width and height must each be between 100 and 10,000 pixels.');
      return false;
    }
    update(axis, pixels);
    update('preset', 'Custom');
    return true;
  }

  function saveCustomPreset() {
    const name = window.prompt('Name this preset');
    if (!name?.trim()) return;
    const preset = { ...settings, name: name.trim(), width: Number(settings.width), height: Number(settings.height), dpi: Number(settings.dpi), quality: Number(settings.quality) };
    setCustomPresets(previous => [...previous.filter(item => item.name !== preset.name), preset]);
    setSavedPreset(preset.name);
    setStatus(`Saved “${preset.name}” to your custom presets.`);
  }

  function exportPresets() {
    saveBlob(new Blob([JSON.stringify(customPresets, null, 2)], { type: 'application/json' }), 'alpharino-presets.json');
  }

  async function importPresets(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imported = JSON.parse(await file.text());
      if (!Array.isArray(imported) || imported.some(item => !item || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 80 || !Number.isFinite(Number(item.width)) || !Number.isFinite(Number(item.height)) || Number(item.width) < 100 || Number(item.width) > 10000 || Number(item.height) < 100 || Number(item.height) > 10000)) throw new Error('Preset file must contain named presets with dimensions from 100 to 10,000 pixels.');
      const cleanPresets = imported.map(item => ({ ...DEFAULT_SETTINGS, ...item, name: item.name.trim(), width: Number(item.width), height: Number(item.height) }));
      setCustomPresets(previous => [...previous.filter(item => !cleanPresets.some(next => next.name === item.name)), ...cleanPresets]);
      setStatus(`Imported ${cleanPresets.length} preset(s).`);
    } catch (error) {
      setStatus(`Could not import presets: ${error.message}`);
    } finally { setImportFileKey(value => value + 1); }
  }

  async function exportAll() {
    if (!selectedFiles.length || busy) return;
    if (!Number.isFinite(Number(settings.width)) || !Number.isFinite(Number(settings.height)) || settings.width < 100 || settings.height < 100 || settings.width > 10000 || settings.height > 10000) {
      setStatus('Width and height must each be between 100 and 10,000 pixels.');
      return;
    }
    if (!Number.isFinite(Number(settings.dpi)) || settings.dpi < 36 || settings.dpi > 1200) {
      setStatus('Resolution must be between 36 and 1,200 DPI.');
      return;
    }
    if (Number(settings.margin) * 2 * Number(settings.dpi) / 25.4 >= Math.min(settings.width, settings.height)) {
      setStatus('Margins must be less than half the shorter page dimension.');
      return;
    }
    setBusy(true); setDone(0); setTotal(selectedFiles.length); setStatus('Preparing your pages…');
    const isImageOutput = settings.exportMode !== 'document';
    const extension = isImageOutput ? imageExtension : 'jpg';
    const jobSettings = {
      ...settings,
      width: Number(settings.width),
      height: Number(settings.height),
      dpi: Number(settings.dpi),
      margin: Number(settings.margin),
      bleed: Number(settings.bleed),
      brightness: Number(settings.brightness),
      contrast: Number(settings.contrast),
      quality: Number(settings.quality),
      watermarkOpacity: Number(settings.watermarkOpacity),
      rotation: Number(settings.rotation),
      mimeType: isImageOutput ? mimeType : 'image/jpeg',
      extension,
      pageNumbers: Boolean(settings.pageNumbers)
    };
    try {
      let completed = 0;
      const usedNames = new Set();
      const pagesOut = [];
      const textParts = [];
      for (const entry of selectedFiles) {
        const file = entry.file;
        if (/\.pdf$/i.test(file.name)) {
          if (settings.format === 'txt' && settings.extractPdfText) textParts.push(`${file.name}\n${await extractPdfText(file, entry.pageRange)}`);
          const convertedPages = await processPdf(file, jobSettings, (page, pageIndex, count) => {
            setDone(completed + pageIndex);
            setTotal(completed + count);
            setStatus(`Converting ${file.name}: page ${page} (${pageIndex} of ${count} selected)`);
          }, entry.pageRange);
          convertedPages.forEach(item => {
            const name = uniqueName(formatName(settings.filenamePattern, safeFileName(file.name), item.sourcePage, extension), usedNames);
            pagesOut.push({ ...item, name });
          });
          completed += convertedPages.length;
        } else {
          const pageNumber = completed + 1;
          const blob = await processImage(file, { ...jobSettings, pageNumber });
          const name = uniqueName(formatName(settings.filenamePattern, safeFileName(file.name), pageNumber, extension), usedNames);
          pagesOut.push({ name, blob, width: outputWidth, height: outputHeight, source: file.name, sourcePage: pageNumber });
          completed++;
        }
        setDone(completed);
      }
      if (!pagesOut.length) throw new Error('The selected files did not contain any pages to export.');
      setTotal(completed);
      const dimensionsLabel = `${settings.width} × ${settings.height} px${settings.bleed ? ` + ${settings.bleed} mm bleed` : ''}`;
      if (settings.exportMode === 'individual') {
        setStatus(`Preparing ${pagesOut.length} separate image downloads…`);
        for (const page of pagesOut) {
          saveBlob(page.blob, page.name);
          await new Promise(resolve => setTimeout(resolve, 120));
        }
        setStatus(`Finished! ${pagesOut.length} image(s) downloaded individually (${dimensionsLabel}). Your browser may ask permission for multiple downloads.`);
        return;
      }
      if (settings.exportMode === 'zip') {
        const zip = new JSZip();
        pagesOut.forEach(page => zip.file(page.name, page.blob));
        saveBlob(await zip.generateAsync({ type: 'blob', mimeType: 'application/zip' }), 'alpharino-images.zip');
        setStatus(`Finished! ${pagesOut.length} image(s) bundled in a ZIP (${imageExtension.toUpperCase()}, ${dimensionsLabel}).`);
        return;
      }
      setStatus(`Creating ${settings.format.toUpperCase()} download…`);
      let output;
      let outputExtension = settings.format;
      if (settings.format === 'pdf') output = await createPdf(pagesOut, settings.width, settings.height, settings.dpi, settings.bleed);
      else if (settings.format === 'epub') output = await createEpub(pagesOut, settings.width, settings.height);
      else if (settings.format === 'docx') output = await createDocx(pagesOut, settings.width, settings.height, settings.dpi);
      else if (settings.format === 'rtf') output = await createRtf(pagesOut, settings.width, settings.height, settings.dpi);
      else if (['html', 'htm', 'zip'].includes(settings.format)) {
        output = await createHtml(pagesOut, settings.width, settings.height, settings.format);
        if (settings.format === 'zip') outputExtension = 'zip';
      } else if (settings.format === 'txt') {
        const index = pagesOut.map((page, i) => `${i + 1}. ${page.name}`).join('\n');
        const extracted = textParts.filter(Boolean).join('\n\n--------------------\n\n');
        output = new Blob([`Alpharino page index\n${pagesOut.length} page(s), ${dimensionsLabel}\n\n${settings.extractPdfText ? 'Selectable PDF text is extracted when available. Image-only PDFs and uploaded images require a dedicated OCR engine, which is not included.' : 'PDF text extraction is disabled.'}\n\n${index}\n\nExtracted PDF text:\n${extracted || '(No selectable PDF text found.)'}\n`], { type: 'text/plain' });
      } else throw new Error(`The ${settings.format.toUpperCase()} format is not supported by this browser export.`);
      saveBlob(output, `alpharino-pages.${outputExtension}`);
      setStatus(`Finished! ${completed} page(s) exported as ${outputExtension.toUpperCase()} (${dimensionsLabel}).`);
    } catch (error) {
      console.error(error);
      setStatus(`Could not finish: ${error.message}`);
    } finally { setBusy(false); }
  }

  const widthDisplay = dimensionFromPixels(settings.width, settings.unit, settings.dpi);
  const heightDisplay = dimensionFromPixels(settings.height, settings.unit, settings.dpi);

  return <main className="app-shell">
    <AppHeader />
    <div className="workspace">
      <div className="editor-column">
        <FileManager
          files={files}
          selectedCount={selectedFiles.length}
          onAddFiles={addFiles}
          onSelectAll={() => setFiles(previous => previous.map(entry => ({ ...entry, selected: true })))}
          onClear={() => setFiles([])}
          onToggle={(id, selected) => setFiles(previous => previous.map(entry => entry.id === id ? { ...entry, selected } : entry))}
          onMove={moveFile}
          onRemove={id => setFiles(previous => previous.filter(entry => entry.id !== id))}
          onRangeChange={(id, pageRange) => setFiles(previous => previous.map(entry => entry.id === id ? { ...entry, pageRange } : entry))}
        />
        <PageSettings
          settings={settings}
          useCases={Object.keys(PRESETS)}
          presets={currentPresets}
          customPresets={customPresets}
          savedPreset={savedPreset}
          widthDisplay={widthDisplay}
          heightDisplay={heightDisplay}
          outputWidth={outputWidth}
          outputHeight={outputHeight}
          importFileKey={importFileKey}
          onUpdate={update}
          onDimensionChange={changeDimension}
          onUseCaseChange={changeUseCase}
          onPresetChange={changePreset}
          onDpiChange={changeDpi}
          onSavePreset={saveCustomPreset}
          onExportPresets={exportPresets}
          onImportPresets={importPresets}
          onSavedPresetChange={value => {
            setSavedPreset(value);
            const custom = customPresets.find(item => item.name === value);
            if (custom) {
              const { name, ...presetSettings } = custom;
              setSettings(previous => ({ ...previous, ...presetSettings, preset: name }));
            }
          }}
          onDeletePreset={() => {
            setCustomPresets(previous => previous.filter(item => item.name !== savedPreset));
            setSavedPreset('');
          }}
        />
        <ExportSettings settings={settings} estimate={estimate} imageExtension={imageExtension} onUpdate={update} />
      </div>
      <PreviewPanel settings={settings} width={outputWidth} height={outputHeight} selectedCount={selectedFiles.length} busy={busy} done={done} total={total} status={status} onExport={exportAll} />
    </div>
    <footer className="app-footer"><span>© Alpharino Toolkit</span><span>Print · social · web · tablet</span></footer>
  </main>;

  return <main className="app-shell">
    <header className="topbar"><a className="brand" href="#" aria-label="Alpharino home"><span className="brand-mark">A</span><span className="brand-name">alpharino<span>.</span></span></a><span className="privacy-pill"><span className="privacy-dot" />Private by design</span></header>
    <section className="hero"><div><p className="eyebrow"><span className="eyebrow-line" />CREATOR TOOLKIT</p><h1>One workspace.<br /><span>Every kind of page.</span></h1><p className="hero-copy">Prepare pages for print, social, web, or your tablet. Your files stay on your device.</p></div><div className="hero-art" aria-hidden="true"><span className="art-sparkle sparkle-one">✳</span><span className="art-sparkle sparkle-two">✦</span><div className="art-page"><span /><span /><span /><i>A</i></div></div></section>
    <nav className="steps" aria-label="Resize steps"><span className="step active"><i>01</i> Add files</span><span className="step-divider" /><span className="step"><i>02</i> Customize</span><span className="step-divider" /><span className="step"><i>03</i> Export</span></nav>
    <div className="workspace">
      <div className="editor-column">
        <section className="card upload-card">
          <div className="section-heading"><div><span className="section-kicker">YOUR WORKSPACE</span><h2>Add and arrange files</h2></div><span className="step-number">01</span></div>
          <label className="drop-zone" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); addFiles(event.dataTransfer.files); }}><input type="file" multiple accept="image/png,image/jpeg,image/webp,application/pdf,.pdf" onChange={event => addFiles(event.target.files)} /><span className="upload-symbol"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 15.5v3A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-3" /></svg></span><strong>Drop your files here</strong><span className="drop-caption">or <b>browse files</b> on your device</span><span className="file-types"><span>JPG</span><span>PNG</span><span>WEBP</span><span>PDF</span><small>Processed locally</small></span></label>
          <div className="filebar"><span><span className="file-count">{selectedFiles.length}</span> of {files.length} files selected</span><div className="file-actions"><button className="text-button" onClick={() => setFiles(previous => previous.map(entry => ({ ...entry, selected: true })))} disabled={!files.length}>Select all</button><button className="text-button" onClick={() => setFiles([])} disabled={!files.length}>Clear all</button></div></div>
          {!!files.length && <ul className="filelist">{files.map((entry, index) => <li key={entry.id} className={!entry.selected ? 'file-row unselected' : 'file-row'}><input aria-label={`Include ${entry.file.name}`} type="checkbox" checked={entry.selected} onChange={event => setFiles(previous => previous.map(item => item.id === entry.id ? { ...item, selected: event.target.checked } : item))} /><span className="file-type-icon">{/\.pdf$/i.test(entry.file.name) ? 'PDF' : 'IMG'}</span><span className="file-name" title={entry.file.name}>{entry.file.name}<small>{(entry.file.size / 1024 / 1024).toFixed(1)} MB</small></span>{/\.pdf$/i.test(entry.file.name) && <input className="page-range" aria-label={`Page range for ${entry.file.name}`} placeholder="Pages: all" value={entry.pageRange} onChange={event => setFiles(previous => previous.map(item => item.id === entry.id ? { ...item, pageRange: event.target.value } : item))} /> }<button className="icon-button" aria-label={`Move ${entry.file.name} up`} disabled={index === 0} onClick={() => moveFile(index, -1)}>↑</button><button className="icon-button" aria-label={`Move ${entry.file.name} down`} disabled={index === files.length - 1} onClick={() => moveFile(index, 1)}>↓</button><button className="icon-button remove-button" aria-label={`Remove ${entry.file.name}`} onClick={() => setFiles(previous => previous.filter(item => item.id !== entry.id))}>×</button></li>)}</ul>}
          <p className="format-note">Reorder files with the arrows. For PDFs, enter page ranges like <b>1-3, 5</b>; leave blank for every page.</p>
        </section>

        <section className="card settings-card">
          <div className="section-heading"><div><span className="section-kicker">PAGE SETTINGS</span><h2>Choose a use case and size</h2></div><span className="step-number">02</span></div>
          <label className="field">What are you making?<select value={settings.useCase} onChange={event => changeUseCase(event.target.value)}>{Object.keys(PRESETS).map(name => <option key={name}>{name}</option>)}</select></label>
          <div className="dimensions"><label className="field">Page preset<select value={currentPresets[settings.preset] ? settings.preset : savedPreset || 'Custom'} onChange={event => { setSavedPreset(event.target.value); changePreset(event.target.value); }}>{Object.keys(currentPresets).map(name => <option key={name}>{name}</option>)}</select></label><label className="field">Units<select value={settings.unit} onChange={event => update('unit', event.target.value)}><option value="px">Pixels</option><option value="in">Inches</option><option value="cm">Centimeters</option><option value="mm">Millimeters</option></select></label></div>
          <div className="dimensions"><label className="field">Width <span className="unit-label">{settings.unit}</span><input type="number" min="0.1" max="10000" step={settings.unit === 'px' ? 1 : 0.01} value={widthDisplay} onChange={event => { update('width', dimensionInPixels(event.target.value, settings.unit, settings.dpi)); update('preset', 'Custom'); }} /></label><span className="dimension-times">×</span><label className="field">Height <span className="unit-label">{settings.unit}</span><input type="number" min="0.1" max="10000" step={settings.unit === 'px' ? 1 : 0.01} value={heightDisplay} onChange={event => { update('height', dimensionInPixels(event.target.value, settings.unit, settings.dpi)); update('preset', 'Custom'); }} /></label></div>
          <div className="dimensions"><label className="field">Resolution <span className="unit-label">DPI</span><input type="number" min="36" max="1200" value={settings.dpi} onChange={event => changeDpi(event.target.value)} /></label><div className="ratio ratio-inline"><span>Output dimensions</span><b>{outputWidth} × {outputHeight} px</b></div></div>
          <div className="dimensions fit-options"><label className="field">Image fit<select value={settings.mode} onChange={event => update('mode', event.target.value)}><option>Fit (no crop)</option><option>Fill (crop)</option></select></label><label className="field">Crop anchor<select value={settings.cropPosition} onChange={event => update('cropPosition', event.target.value)}><option>Center</option><option>Top</option><option>Bottom</option><option>Left</option><option>Right</option><option>Top left</option><option>Top right</option><option>Bottom left</option><option>Bottom right</option></select></label></div>
          <div className="dimensions fit-options"><label className="field">Background<select value={settings.background} onChange={event => update('background', event.target.value)}><option value="#ffffff">White</option><option value="#f7f3ff">Soft lavender</option><option value="#000000">Black</option></select></label><label className="field">Rotate page<select value={settings.rotation} onChange={event => update('rotation', Number(event.target.value))}><option value="0">No rotation</option><option value="90">90° clockwise</option><option value="180">180°</option><option value="270">90° counter-clockwise</option></select></label></div>
          <div className="dimensions fit-options"><label className="field">Inner margin <span className="unit-label">MM</span><input type="number" min="0" max="1000" step="0.5" value={settings.margin} onChange={event => update('margin', Number(event.target.value))} /></label><label className="field">Print bleed <span className="unit-label">MM</span><input type="number" min="0" max="20" step="0.5" value={settings.bleed} onChange={event => update('bleed', Number(event.target.value))} /></label></div>
          <details className="advanced-options"><summary>Image enhancement</summary><div className="range-field"><label htmlFor="brightness">Brightness <b>{settings.brightness}%</b></label><input id="brightness" type="range" min="50" max="150" value={settings.brightness} onChange={event => update('brightness', Number(event.target.value))} /></div><div className="range-field"><label htmlFor="contrast">Contrast <b>{settings.contrast}%</b></label><input id="contrast" type="range" min="50" max="150" value={settings.contrast} onChange={event => update('contrast', Number(event.target.value))} /></div><label className="toggle-field"><input type="checkbox" checked={settings.sharpen} onChange={event => update('sharpen', event.target.checked)} />Apply sharpening (slower on large batches)</label></details>
          <details className="advanced-options"><summary>Watermark and page numbers</summary><label className="field">Watermark text<input type="text" maxLength="80" placeholder="Optional" value={settings.watermark} onChange={event => update('watermark', event.target.value)} /></label><div className="dimensions"><label className="field">Watermark color<input type="color" value={settings.watermarkColor || '#555555'} onChange={event => update('watermarkColor', event.target.value)} /></label><label className="field">Opacity <span className="unit-label">%</span><input type="number" min="5" max="100" value={settings.watermarkOpacity} onChange={event => update('watermarkOpacity', Number(event.target.value))} /></label></div><label className="toggle-field"><input type="checkbox" checked={settings.pageNumbers} onChange={event => update('pageNumbers', event.target.checked)} />Add page numbers</label></details>
          <div className="preset-tools"><button className="secondary-button" onClick={saveCustomPreset}>Save current settings as preset</button><button className="secondary-button" onClick={exportPresets}>Export presets</button><label className="secondary-button import-button">Import presets<input key={importFileKey} type="file" accept="application/json,.json" onChange={importPresets} /></label></div>
          {customPresets.length > 0 && <div className="saved-presets"><label className="field">Saved presets<select value={savedPreset} onChange={event => { setSavedPreset(event.target.value); const custom = customPresets.find(item => item.name === event.target.value); if (custom) setSettings(previous => ({ ...previous, ...custom, preset: custom.name })); }}>{customPresets.map(item => <option key={item.name} value={item.name}>{item.name}</option>)}</select></label><button className="text-button" onClick={() => setCustomPresets(previous => previous.filter(item => item.name !== savedPreset))} disabled={!savedPreset}>Delete selected preset</button></div>}
        </section>

        <section className="card format-card"><div className="section-heading"><div><span className="section-kicker">DELIVERY</span><h2>Choose how to export</h2></div><span className="step-number">03</span></div>
          <label className="field">Delivery<select value={settings.exportMode} onChange={event => update('exportMode', event.target.value)}><option value="document">One document</option><option value="zip">Images in one ZIP bundle</option><option value="individual">Separate image downloads</option></select></label>
          {settings.exportMode === 'document' && <label className="field export-format">Document format<select value={settings.format} onChange={event => update('format', event.target.value)}><option value="pdf">PDF</option><option value="epub">EPUB (image pages)</option><option value="docx">Microsoft Word (.docx)</option><option value="rtf">Rich Text (.rtf)</option><option value="html">Self-contained HTML</option><option value="htm">Self-contained HTML (.htm)</option><option value="zip">HTML + images ZIP</option><option value="txt">Text index + selectable PDF text</option></select></label>}
          {settings.exportMode !== 'document' && <><label className="field export-format">Image format<select value={settings.imageFormat} onChange={event => update('imageFormat', event.target.value)}><option value="jpeg">JPG</option><option value="png">PNG</option><option value="webp">WebP</option></select></label><div className="range-field"><label htmlFor="quality">Image quality <b>{Math.round(settings.quality * 100)}%</b></label><input id="quality" type="range" min="40" max="100" value={Math.round(settings.quality * 100)} onChange={event => update('quality', Number(event.target.value) / 100)} /><small>Applies to JPG and WebP; PNG is lossless.</small></div></>}
          <label className="field filename-field">File naming pattern<input type="text" maxLength="100" value={settings.filenamePattern} onChange={event => update('filenamePattern', event.target.value)} /><small>Use {'{name}'} and {'{page}'} placeholders.</small></label>
          {settings.format === 'txt' && settings.exportMode === 'document' && <label className="toggle-field"><input type="checkbox" checked={settings.extractPdfText} onChange={event => update('extractPdfText', event.target.checked)} />Extract selectable text from PDFs (not OCR)</label>}
          <p className="format-note">Estimated output: <b>{estimate > 1024 * 1024 ? `${(estimate / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(estimate / 1024))} KB`}</b> (rough image-size estimate). Text extraction works for PDFs with selectable text; image OCR is not bundled.</p>
        </section>
      </div>
      <aside className="preview-column"><section className="preview-card"><div className="preview-topline"><span><span className="live-dot" />LIVE PREVIEW</span><span className="preview-badge">{settings.preset === 'Custom' ? 'CUSTOM' : settings.useCase.toUpperCase()}</span></div><h2>Your page canvas</h2><p className="preview-description">Updates as you adjust your page settings.</p><div className="preview-stage"><div className="pagePreview" style={{ aspectRatio: `${outputWidth}/${outputHeight}`, backgroundColor: settings.background, transform: `rotate(${settings.rotation}deg)`, boxShadow: `inset 0 0 0 ${Math.min(14, Number(settings.margin) * 0.5)}px #7662e822` }}><span className="preview-lines"><i /><i /><i /><i /></span><span className="preview-watermark">{settings.watermark || 'A'}</span></div></div><div className="preview-dimensions"><span>Canvas size</span><strong>{outputWidth} <i>×</i> {outputHeight} <small>px</small></strong></div><div className="preview-details"><span>Resolution</span><b>{settings.dpi} DPI</b></div><div className="preview-details"><span>Fit / rotation</span><b>{settings.mode === 'Fit (no crop)' ? 'No crop' : 'Fill & crop'} / {settings.rotation}°</b></div><div className="preview-details"><span>Selected files</span><b>{selectedFiles.length}</b></div><button className="primary" disabled={!selectedFiles.length || busy} onClick={exportAll}>{busy ? <><span className="button-spinner" /> Processing… {total ? Math.min(100, Math.round(done / total * 100)) : 0}%</> : <>Export {selectedFiles.length || ''} file{selectedFiles.length === 1 ? '' : 's'} <span className="button-format">{settings.exportMode === 'document' ? settings.format.toUpperCase() : settings.exportMode === 'zip' ? 'ZIP' : imageExtension.toUpperCase()}</span><span className="button-arrow">↗</span></>}</button>{busy && <div className="progress" role="progressbar" aria-valuenow={total ? Math.min(100, Math.round(done / total * 100)) : 0} aria-valuemin="0" aria-valuemax="100"><div style={{ width: `${total ? Math.min(100, done / total * 100) : 8}%` }} /></div>}{status && <p className="status" aria-live="polite">{status}</p>}<p className="privacy-note"><span>⌑</span> Your files never leave this device</p></section><p className="preview-footnote">For image-only PDFs, export each page as an image. Plain Text does not include image OCR.</p></aside>
    </div>
    <footer className="app-footer"><span>© Alpharino Toolkit</span><span>Print · social · web · tablet</span></footer>
  </main>;
}

export default App;
