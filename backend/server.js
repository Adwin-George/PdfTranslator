// server.js (CommonJS)
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const pdfParse = require("pdf-parse");

const app = express();
const upload = multer({ dest: path.join(__dirname, "uploads/") });

app.use(cors());
app.use(express.json({ limit: "30mb" }));

if (!fs.existsSync(path.join(__dirname, "uploads"))) fs.mkdirSync(path.join(__dirname, "uploads"));

const PORT = process.env.PORT || 5000;
console.log("Backend starting...");
app.listen(PORT, () => console.log(`Backend running at http://localhost:${PORT}`));

// ---------------------- UPLOAD (PDF extract) ----------------------
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: "No file uploaded (field: file)" });
    const filePath = req.file.path;
    let extracted = "";

    // Try standard text extraction
    try {
      const data = fs.readFileSync(filePath);
      const pdfData = await pdfParse(data);
      extracted = pdfData.text || "";
    } catch (e) {
      console.warn("pdf-parse failed, will fall back to OCR if configured", e?.message);
    }

    // If extraction looks broken/empty, fallback to OCR if user has tesseract installed
    const isBroken = !extracted || extracted.replace(/\W+/g, "").length < 10;
    if (isBroken) {
      try {
        // spawn tesseract via node-tesseract-ocr would be nicer but we avoid extra dependency in server here
        // If you already use node-tesseract-ocr inside other code, you can swap in that call.
        const { execFileSync } = require("child_process");
        // try english+hin+fra+spa+jpn as general fallback; adjust if you want
        const configLangs = "eng+hin+fra+spa+jpn";
        // Output plain text to stdout
        const out = execFileSync("tesseract", [filePath, "stdout", "-l", configLangs], { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
        extracted = out || extracted;
        console.log("OCR fallback used.");
      } catch (ocrErr) {
        console.warn("OCR fallback failed or tesseract not installed:", ocrErr?.message || ocrErr);
      }
    }

    fs.unlink(filePath, () => {});
    return res.json({ success: true, extractedText: (extracted || "").trim() });
  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// ---------------------- MULTI-TRANSLATE ----------------------
// Accepts { text, sourceLanguage, targets: ["hi","fr", ...] }
// Uses translate.py which returns JSON
app.post("/multi-translate", async (req, res) => {
  try {
    const { text = "", sourceLanguage = "auto", targets = [] } = req.body;
    if (!text || !targets || !Array.isArray(targets) || targets.length === 0) {
      return res.status(400).json({ success: false, error: "Provide text and targets array" });
    }

    const py = spawn("python", [path.join(__dirname, "translate.py")], {
      cwd: __dirname,
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
    });

    let stdout = "";
    let stderr = "";
    py.stdout.setEncoding("utf8");
    py.stderr.setEncoding("utf8");
    py.stdout.on("data", (c) => (stdout += c));
    py.stderr.on("data", (c) => (stderr += c));

    py.on("close", (code) => {
      if (stderr && stderr.trim()) console.warn("PYTHON STDERR:", stderr);
      try {
        const json = JSON.parse(stdout);
        return res.json(json);
      } catch (e) {
        console.error("Invalid python output:", e, "stdout:", stdout);
        return res.status(500).json({ success: false, error: "Invalid python output", details: stderr || e.message });
      }
    });

    const payload = { text, sourceLanguage, targets };
    py.stdin.write(JSON.stringify(payload));
    py.stdin.end();

    // safety: kill if python doesn't respond in 30s
    setTimeout(() => {
      if (!stdout) {
        try { py.kill(); } catch {}
        return res.status(504).json({ success: false, error: "Translation timeout" });
      }
    }, 30000);
  } catch (err) {
    console.error("MULTI-TRANSLATE ROUTE ERROR:", err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// ---------------------- TTS (Google Translate TTS trick) ----------------------
// Accepts GET /tts?text=...&lang=hi
// Returns audio/mp3
app.get("/tts", async (req, res) => {
  try {
    const text = String(req.query.text || "");
    const lang = String(req.query.lang || "en");
    if (!text) return res.status(400).send("No text");

    // Google TTS endpoint (free trick). Length limit ~200 chars; we chunk.
    const chunkSize = 200;
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize) chunks.push(text.slice(i, i + chunkSize));

    // fetch each chunk and concatenate buffers
    const buffers = [];
    for (const q of chunks) {
      // build URL
      const url = new URL("https://translate.google.com/translate_tts");
      url.searchParams.set("ie", "UTF-8");
      url.searchParams.set("q", q);
      url.searchParams.set("tl", lang);
      url.searchParams.set("client", "tw-ob");

      const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Referer": "https://translate.google.com/",
      };

      const r = await fetch(url.toString(), { headers });
      if (!r.ok) {
        console.warn("TTS fetch failed", r.status, await r.text().catch(()=>""));
        return res.status(502).json({ success: false, error: "TTS fetch failed" });
      }
      const buf = Buffer.from(await r.arrayBuffer());
      buffers.push(buf);
      // small sleep to avoid being throttled
      await new Promise((r2) => setTimeout(r2, 120));
    }

    const final = Buffer.concat(buffers);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", final.length);
    // recommended cache control for repeated TTS
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.end(final);
  } catch (err) {
    console.error("TTS ERROR:", err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});
