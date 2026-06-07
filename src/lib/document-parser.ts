// Dynamic browser-side document text extractor supporting PDF, DOCX, TXT, MD, and CSV files.
// Performs parsing entirely client-side to guarantee speed, privacy, and zero server storage overhead.

declare global {
  interface Window {
    pdfjsLib?: any;
    mammoth?: any;
  }
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

/**
 * Loads a script dynamically in the browser and returns a promise.
 */
function loadExternalScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // If script is already in the document, resolve
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load external script: ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * Dynamically loads and configures PDF.js
 */
async function getPdfJsLib(): Promise<any> {
  if (window.pdfjsLib) return window.pdfjsLib;

  // Load the core PDF.js library
  await loadExternalScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js");

  const pdfjsLib = window.pdfjsLib;
  if (!pdfjsLib) {
    throw new Error("PDF.js library was not initialized correctly.");
  }

  // Set the worker source path
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
  return pdfjsLib;
}

/**
 * Dynamically loads Mammoth.js for Word DOCX extraction
 */
async function getMammoth(): Promise<any> {
  if (window.mammoth) return window.mammoth;

  await loadExternalScript(
    "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js",
  );

  const mammoth = window.mammoth;
  if (!mammoth) {
    throw new Error("Mammoth.js library was not initialized correctly.");
  }

  return mammoth;
}

/**
 * Extracted document data interface
 */
export interface ExtractedDocument {
  text: string;
  name: string;
  size: number;
}

/**
 * Parses and extracts clean raw text from a variety of document formats.
 */

/**
 * Runs Tesseract OCR on an image File and returns extracted text
 */
async function getTesseract(): Promise<any> {
  if ((window as any).Tesseract) return (window as any).Tesseract;
  await loadExternalScript("https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js");
  const Tesseract = (window as any).Tesseract;
  if (!Tesseract) throw new Error("Tesseract.js failed to load.");
  return Tesseract;
}

async function ocrImage(file: File): Promise<string> {
  const Tesseract = await getTesseract();
  const url = URL.createObjectURL(file);
  try {
    const result = await Tesseract.recognize(url, "eng", {
      logger: () => {},
    });
    return result.data.text.trim();
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Renders a PDF page to a canvas and returns it as a Blob for OCR
 */
async function pdfPageToBlob(page: any): Promise<Blob> {
  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx, viewport }).promise;
  return new Promise((res) => canvas.toBlob((b) => res(b!), "image/png"));
}

export async function parseDocument(file: File): Promise<ExtractedDocument> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File exceeds the maximum size limit of 10MB (Size: ${(file.size / 1024 / 1024).toFixed(1)}MB).`,
    );
  }

  const name = file.name;
  const size = file.size;
  const extension = name.split(".").pop()?.toLowerCase();

  try {
    switch (extension) {
      case "txt":
      case "md":
      case "csv":
      case "json": {
        const text = await file.text();
        return { text: text.trim(), name, size };
      }

      case "pdf": {
        const pdfjsLib = await getPdfJsLib();
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";

        // Extract text page by page
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str || "").join(" ");

          fullText += pageText + "\n";
        }

        if (!fullText.trim()) {
          // Scanned PDF — fall back to Tesseract OCR page by page
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const blob = await pdfPageToBlob(page);
            const imageFile = new File([blob], `page-${i}.png`, { type: "image/png" });
            fullText += await ocrImage(imageFile) + "\n";
          }
          if (!fullText.trim()) {
            throw new Error("Could not extract text from this PDF even with OCR.");
          }
        }

        return { text: fullText.trim(), name, size };
      }

      case "docx": {
        const mammoth = await getMammoth();
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        const text = result.value || "";

        if (!text.trim()) {
          throw new Error("The Word document is empty.");
        }

        return { text: text.trim(), name, size };
      }

      case "jpg":
      case "jpeg":
      case "png":
      case "webp": {
        const text = await ocrImage(file);
        if (!text) throw new Error("Could not extract any text from this image.");
        return { text, name, size };
      }

      default:
        throw new Error(
          `Unsupported file type (.${extension}). Please upload a PDF, DOCX, TXT, MD, CSV, or image file (JPG, PNG, WEBP).`,
        );
    }
  } catch (err: any) {
    console.error(`[DocumentParser] Failed to extract text from ${name}:`, err);
    throw new Error(err.message || `An error occurred while parsing ${name}.`);
  }
}
