# Alpharino Page Studio

A browser-based batch page editor for tablet, print, social, and web output. Images and PDFs are processed on your device.

## Features

- Use-case presets for tablets/e-readers, print publishing, social media, and web/email, plus custom pixel, inch, centimeter, and millimeter dimensions.
- Adjustable DPI, crop/fitting mode and anchor, background color, rotation, margins, and print bleed.
- Brightness, contrast, optional sharpening, text watermarking, page numbers, and JPG/WebP compression quality.
- Batch JPG, PNG, WEBP, and PDF input. Select or reorder files, include only chosen inputs, and set PDF page ranges such as `1-3, 5`.
- Export one merged PDF, EPUB, DOCX, RTF, HTML, or TXT index; bundle images as JPG/PNG/WEBP in ZIP; or download images separately.
- Custom filename patterns support `{name}` and `{page}`. Custom settings persist in browser storage and can be imported/exported as JSON.
- A live settings preview and approximate image-size estimate.
- PDF text extraction is available for selectable text. OCR for image-only pages is not included.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL shown by Vite, add files, choose a use case and settings, then export. Select “One document” to merge selected pages into a single document.

## Source structure

- `src/main.jsx` mounts the app and loads the stylesheet.
- `src/App.jsx` owns shared settings, file state, and conversion/export orchestration.
- `src/components/` contains the header, file manager, page settings, export settings, and preview components.
- `src/style.css` contains shared responsive styles and motion.

## Notes

- Processing stays in the browser. The app does not upload source files.
- PDF, EPUB, DOCX, RTF, and HTML exports contain page images; they do not reflow content into editable text. TXT extracts selectable PDF text only and does not perform OCR.
- Print bleed expands the output page; PDF exports include MediaBox, TrimBox, and BleedBox dimensions.
- Very large files or batches use browser memory. If the browser runs low on memory, process the files in smaller groups.
