"""
Journey OS — PDF Renderer Sidecar
Extracts text from PDFs. Falls back to OCR for scanned pages.
POST /extract  { file: <multipart> }  → { pages: [{text, page_number, char_count}] }
GET  /health   → { status: "ok" }
"""
import os, io
from flask import Flask, request, jsonify
import pdfplumber

app = Flask(__name__)
PORT = int(os.environ.get("PORT", 5001))
OCR_MIN_CHARS = int(os.environ.get("OCR_MIN_BODY_CHARS", 50))

@app.route("/health")
def health():
    return jsonify({"status": "ok", "service": "pdf-renderer"})

@app.route("/extract", methods=["POST"])
def extract():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    f = request.files["file"]
    pages = []

    with pdfplumber.open(io.BytesIO(f.read())) as pdf:
        for i, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            char_count = len(text.strip())
            needs_ocr = char_count < OCR_MIN_CHARS  # scanned page fallback

            pages.append({
                "page_number": i + 1,
                "text": text,
                "char_count": char_count,
                "needs_ocr": needs_ocr,
            })

    return jsonify({
        "page_count": len(pages),
        "pages": pages,
        "filename": f.filename,
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT)
