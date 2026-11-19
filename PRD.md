# Product Requirements Document

## Alpharino Page Studio

| Field | Value |
|---|---|
| Status | Draft |
| Last updated | 2026-11-19 |
| Product | Alpharino Page Studio |
| Platform | Responsive browser application |

## 1. Product summary

Alpharino Page Studio is a local-first tool for preparing batches of images and PDF pages for different destinations: tablets and e-readers, print, social media, and web or email. Users choose a page preset or custom dimensions, adjust how content is fitted and enhanced, organize inputs, and export a document or image files without uploading source files to a service.

The product should make a flexible set of image and page-processing options approachable through a single responsive workspace, sensible presets, a live settings preview, and clear explanations of output limitations.

## 2. Problem and opportunity

People repurpose scans, worksheets, artwork, and existing PDFs across devices and publishing contexts. Resizing files one at a time is slow; manual tools can produce inconsistent dimensions, accidentally crop content, or require users to understand image and print settings.

Page Studio addresses this by combining batch processing, destination-specific presets, page controls, and multiple export choices in one browser-based workflow.

## 3. Goals

- Let users resize and prepare multiple supported files in a single workflow.
- Make common tablet, print, social, and web dimensions quick to select.
- Give users control over fit, crop position, background, rotation, margins, bleed, and basic image appearance.
- Support practical batch operations such as selecting, reordering, and choosing PDF page ranges.
- Produce predictable output names and useful merged-document or image-bundle downloads.
- Keep processing local and communicate privacy and format limitations accurately.
- Provide a responsive, accessible interface that works on desktop and mobile browsers.

## 4. Non-goals

- Reflowing page images into editable document content.
- OCR for image-only PDFs or uploaded images.
- Creating KPF or legacy DOC files in the browser.
- Cloud storage, accounts, shared libraries, or server-side processing.
- Guaranteeing print-provider compliance for every printer, trim size, color profile, or bleed specification.
- Replacing a full image editor or desktop publishing application.

## 5. Target users

### Primary users

- **Worksheet and e-book creators** preparing image-based pages for tablets and e-readers.
- **Independent publishers and print users** preparing pages for common paper and book sizes.
- **Social creators** adapting existing artwork for square, portrait, story, cover, and thumbnail placements.
- **Website and email publishers** preparing banners and content images at common dimensions.

### User needs

- “I want all my pages to use the same dimensions without losing important content.”
- “I need to select only the PDF pages I want and arrange inputs before exporting.”
- “I want to know what the output will look like and roughly how large it will be.”
- “I need a repeatable setup I can reuse for the next batch.”
- “I do not want my private source files uploaded.”

## 6. Core user journey

1. Open Page Studio and choose or add image and PDF files.
2. Select which files to include, set PDF page ranges, and reorder files.
3. Choose a destination/use case and a preset, or enter custom dimensions and units.
4. Adjust fit, crop anchor, background, rotation, resolution, margins, bleed, and optional enhancements.
5. Choose a document, image ZIP, or individual-image delivery and configure names and quality.
6. Review the live canvas and output estimate.
7. Export, follow progress, and receive a clear completion or error message.
8. Reuse saved browser presets or import/export preset JSON for later work.

## 7. Functional requirements

### 7.1 Input and batch management

- **FR-1:** Accept JPG/JPEG, PNG, WEBP, and PDF files through file selection and drag and drop.
- **FR-2:** Show selected files and their sizes. Allow users to include or exclude each file, remove files, clear the batch, and select all.
- **FR-3:** Allow users to reorder files; exported pages must follow the resulting input order.
- **FR-4:** For each PDF, allow a blank page range to mean all pages or a comma-separated range such as `1-3, 5`.
- **FR-5:** Validate page-range syntax and bounds. On invalid input, show an actionable error and do not silently skip pages.
- **FR-6:** Report unsupported file types rather than silently presenting them as accepted.

### 7.2 Destination presets and dimensions

- **FR-7:** Provide grouped use cases for tablet/e-reader, print/publishing, social media, and web/email, with destination-specific presets.
- **FR-8:** Permit custom dimensions in pixels, inches, centimeters, and millimeters.
- **FR-9:** Provide configurable DPI and show the corresponding output dimensions in pixels.
- **FR-10:** Validate export dimensions and resolution and explain invalid values before processing.
- **FR-11:** Allow presets and dimension changes without losing unrelated page-processing settings.

### 7.3 Page layout and image treatment

- **FR-12:** Provide fit-without-cropping and fill-with-cropping modes.
- **FR-13:** In crop mode, provide center and edge/corner crop anchors.
- **FR-14:** Let users set the background color, rotate the page, and specify inner margins.
- **FR-15:** Support an optional print-bleed value and represent trim and bleed page boxes in PDF output.
- **FR-16:** Provide brightness, contrast, and optional sharpening controls.
- **FR-17:** Provide optional text watermarking with color and opacity controls.
- **FR-18:** Provide optional page numbering.
- **FR-19:** Reflect the selected canvas dimensions and relevant visual settings in the live preview.

### 7.4 Export and naming

- **FR-20:** Support a merged document output in PDF, EPUB, DOCX, RTF, HTML/HTM, HTML-plus-images ZIP, or TXT index format.
- **FR-21:** Support image delivery as individual downloads or one ZIP bundle, using JPG, PNG, or WEBP.
- **FR-22:** Allow a naming pattern with `{name}` and `{page}` placeholders. Sanitize generated names and resolve collisions deterministically.
- **FR-23:** For JPG/WebP output, allow quality selection. For PNG, identify quality as lossless/not applicable.
- **FR-24:** Show a rough output-size estimate and label it as an estimate, not a guarantee.
- **FR-25:** Show conversion progress and a clear completion message. Show actionable errors when a file cannot be decoded, rendered, or exported.
- **FR-26:** For TXT export, include a page/file index and optionally extract selectable text from PDFs. Make clear that this is not OCR.

### 7.5 Preset persistence and privacy

- **FR-27:** Remember supported user settings and custom presets in browser storage.
- **FR-28:** Allow users to save, apply, delete, export, and import custom presets.
- **FR-29:** Validate imported preset data and dimensions before applying or saving it.
- **FR-30:** Process source files in the browser without uploading them to a remote service.
- **FR-31:** Surface errors if browser storage cannot save preferences or presets.

## 8. Non-functional requirements

- **Privacy:** No source file contents are sent to a server by the page-processing workflow.
- **Compatibility:** Use browser APIs and libraries supported by the project’s supported browsers; report unsupported output codecs instead of silently substituting another format.
- **Responsiveness:** The primary workflow and controls remain usable at narrow mobile viewport widths without horizontal page overflow.
- **Accessibility:** Use semantic headings and controls, associate inputs with labels, provide keyboard-visible focus, expose export progress/status to assistive technology, and respect reduced-motion preferences.
- **Reliability:** A failed input must not be reported as a successful export. Users retain their originals.
- **Performance:** Handle batches within browser memory limits; provide a useful error or recovery guidance if a batch is too large for the device.
- **Usability:** Defaults should favor preserving source content; potentially destructive crop behavior should be clear before export.

## 9. Acceptance criteria

1. A user can select multiple supported images and PDFs and remove, reorder, include, or exclude files before export.
2. A PDF range such as `1-3, 5` exports only those pages in the requested order; invalid syntax or out-of-range values produces an error.
3. Switching between destination presets updates dimensions; entering a custom dimension updates the preview and displayed pixel size.
4. Fit mode preserves the full source page. Fill mode crops according to the selected anchor.
5. Rotation, background, margin, bleed, and enabled enhancements are reflected in the processed output.
6. A user can export a merged PDF, an image ZIP, or individual image downloads in supported formats.
7. Generated names use the configured placeholders, are safe for download, and do not overwrite duplicate names within a ZIP.
8. A saved preset can be restored after reload and exported/imported as validated JSON.
9. The UI shows progress while exporting and a success or explicit failure state afterward.
10. With no files selected, export is unavailable. Invalid dimensions or DPI cannot be exported.
11. Page processing makes no network upload of source files. TXT labels selectable-PDF extraction accurately and does not claim OCR.
12. The interface remains operable at mobile sizes and keyboard focus is visible.

## 10. Success measures

Instrument these measures only if analytics can be added without collecting source content or sensitive file metadata; analytics are not a prerequisite for local use.

- **Task completion:** Share of export attempts that produce a completed download.
- **Time to first export:** Median time from opening the app to first successful export.
- **Batch success:** Share of selected pages included in the final output.
- **Repeat use:** Share of returning users who reuse a saved preset.
- **Usability:** Number of invalid-range, unsupported-format, and failed-export events per completed session.
- **Quality feedback:** User-reported cropping, dimension, or format mismatches.

## 11. Constraints and risks

- Browser memory and CPU vary by device; large PDFs and high-resolution batches can exceed available resources.
- Browser support for WebP encoding and multiple automatic downloads varies. Unsupported capabilities must be reported clearly.
- Browser print and PDF viewers may interpret page dimensions differently; print bleed is not a substitute for validating a printer’s specifications.
- The current TXT workflow can extract selectable PDF text but does not recognize text in images.
- Current document exports preserve page content as images; they do not produce editable, reflowable documents.
- Output-size estimates are inherently approximate because source content, codec, and browser encoder behavior affect final size.
- The current sharpening implementation can be expensive on large canvases; batch size and memory guidance may be needed.

## 12. Future opportunities

These are not required to satisfy the current product scope:

- Optional local OCR for image-only PDFs and images.
- Preview thumbnails of actual input pages and interactive crop positioning.
- Undo/redo for page order and settings.
- Preset import/export schema versioning and clearer preset management.
- Better batch-memory management, cancellation, and recovery after partial failures.
- Print profiles and validation against printer-specific requirements.
- Additional input/output formats based on user demand.

## 13. Current implementation reference

The source of truth for current implementation is `src/App.jsx` and the reusable components in `src/components/`. The implemented workflow is local-first and supports the features described above, subject to the constraints listed in this document. This PRD defines product intent and acceptance criteria; it does not imply that every browser or large-batch scenario has been independently certified.
