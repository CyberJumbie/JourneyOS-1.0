"""
Journey OS — PPTX Renderer Sidecar
Extracts text + slide images from PowerPoint files.
POST /extract  { file: <multipart> }  → { slides: [{text, slide_number, has_image}] }
GET  /health   → { status: "ok" }
"""
import os, io, base64
from flask import Flask, request, jsonify
from pptx import Presentation
from pptx.util import Inches
from PIL import Image

app = Flask(__name__)
PORT = int(os.environ.get("PORT", 5000))

@app.route("/health")
def health():
    return jsonify({"status": "ok", "service": "pptx-renderer"})

@app.route("/extract", methods=["POST"])
def extract():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    f = request.files["file"]
    prs = Presentation(io.BytesIO(f.read()))
    slides = []

    for i, slide in enumerate(prs.slides):
        text_parts = []
        has_image = False

        for shape in slide.shapes:
            if shape.has_text_frame:
                for para in shape.text_frame.paragraphs:
                    line = " ".join(r.text for r in para.runs).strip()
                    if line:
                        text_parts.append(line)
            if shape.shape_type == 13:  # MSO_SHAPE_TYPE.PICTURE
                has_image = True

        body_text = "\n".join(text_parts)
        char_count = len(body_text)
        # entity_density heuristic: chars with medical terms / total chars
        # simplified: flag slides with very low text as image-heavy
        entity_density = min(1.0, char_count / 500) if char_count > 0 else 0.0

        slides.append({
            "slide_number": i + 1,
            "text": body_text,
            "char_count": char_count,
            "has_image": has_image,
            "entity_density": entity_density,
        })

    return jsonify({
        "slide_count": len(slides),
        "slides": slides,
        "filename": f.filename,
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT)
