import { useState, useRef } from "react";
import axios from "axios";
import logo from "./assets/logo.png";

export default function App() {
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [translations, setTranslations] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const [sourceLang, setSourceLang] = useState("auto");

  const available = [
    { code: "en", name: "English" },
    { code: "hi", name: "Hindi" },
    { code: "fr", name: "French" },
    { code: "es", name: "Spanish" },
    { code: "ja", name: "Japanese" },
    { code: "zh", name: "Chinese (Simplified)" },
    { code: "ar", name: "Arabic" },
    { code: "ru", name: "Russian" }
  ];

  const defaultTargets = ["en", "hi", "fr"];
  const [targets, setTargets] = useState(defaultTargets);

  const audioRef = useRef(null);

  // ----------------------- TOAST FUNCTION -----------------------
  function showToast(message = "Copied!") {
    const toast = document.createElement("div");
    toast.innerText = message;

    Object.assign(toast.style, {
      position: "fixed",
      bottom: "30px",
      right: "30px",
      background: "rgba(34,197,94,0.95)",
      padding: "12px 20px",
      borderRadius: "10px",
      color: "white",
      fontWeight: "bold",
      zIndex: 999999,
      fontSize: "14px",
      boxShadow: "0 0 20px rgba(0,255,140,0.4)",
      opacity: "1",
      transition: "opacity 0.6s ease"
    });

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 600);
    }, 800);
  }

  // COPY wrap
  function copy(text) {
    navigator.clipboard.writeText(text);
    showToast("Copied!");
  }

  // ---------------- PDF Upload ----------------
  async function uploadPDF() {
    if (!file) return alert("Upload a PDF first");
    setLoading(true);
    setText("");
    setTranslations({});
    setErrors({});

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await axios.post("http://localhost:5000/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (res.data?.success) setText(res.data.extractedText || "");
      else if (res.data?.extractedText) setText(res.data.extractedText);
      else alert("Extraction failed: " + (res.data?.error || "unknown"));
    } catch (err) {
      console.error(err);
      alert("Extraction error.");
    }

    setLoading(false);
  }

  // Toggle selecting language
  function toggleTarget(code) {
    setTargets(t =>
      t.includes(code) ? t.filter(x => x !== code) : [...t, code]
    );
  }

  // ---------------- MULTI TRANSLATE ----------------
  async function translateAll() {
    if (!text.trim()) return alert("No text");
    if (!targets.length) return alert("Pick at least one language");

    setLoading(true);
    setTranslations({});
    setErrors({});

    try {
      const res = await axios.post(
        "http://localhost:5000/multi-translate",
        { text, sourceLanguage: sourceLang, targets },
        { timeout: 60000 }
      );

      setTranslations(res.data?.translations || {});
      setErrors(res.data?.errors || {});
    } catch (err) {
      console.error(err);
      alert("Translation failed.");
    }

    setLoading(false);
  }

  // ---------------- PLAY AUDIO ----------------
  async function playTTS(lang, txt) {
    try {
      const url = `http://localhost:5000/tts?lang=${lang}&text=${encodeURIComponent(
        txt.slice(0, 1000)
      )}`;
      const r = await axios.get(url, { responseType: "blob" });
      const audioUrl = URL.createObjectURL(new Blob([r.data], { type: "audio/mpeg" }));
      audioRef.current.src = audioUrl;
      audioRef.current.play();
    } catch (err) {
      console.error("TTS play error", err);
      alert("Audio failed.");
    }
  }

  // ---------------- DOWNLOAD MP3 ----------------
  async function downloadTTS(lang, txt, filename) {
    try {
      const url = `http://localhost:5000/tts?lang=${lang}&text=${encodeURIComponent(
        txt.slice(0, 1000)
      )}`;
      const r = await axios.get(url, { responseType: "blob" });
      const blob = new Blob([r.data], { type: "audio/mpeg" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename || `tts_${lang}.mp3`;
      a.click();
    } catch (err) {
      console.error("TTS download error", err);
      alert("Download failed.");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#06071a] via-[#0b1130] to-[#14142b] text-white p-6 flex items-center justify-center">
      <audio ref={audioRef} />
      <div className="w-full max-w-4xl">
        <div className="bg-white/6 backdrop-blur-md rounded-2xl p-6 shadow-xl">

          {/* HEADER */}
          <div className="flex items-center gap-4 mb-4">
            <img src={logo} alt="logo" className="w-16 h-16 rounded-full object-cover border border-white/10" />
            <div>
              <h1 className="text-2xl font-bold">Galaxy PDF Translator</h1>
              <div className="text-sm text-white/70">
                Upload → Choose languages → Translate → Play & Copy
              </div>
            </div>
          </div>

          {/* UPLOAD */}
          <div className="mb-4">
            <label className="block text-sm font-semibold">Upload PDF</label>
            <div className="flex gap-3 mt-2">
              <input
                type="file"
                accept="application/pdf"
                onChange={e => setFile(e.target.files?.[0] || null)}
              />
              <button
                className="px-3 py-2 bg-blue-600 rounded"
                onClick={uploadPDF}
                disabled={loading}
              >
                {loading ? "..." : "Extract"}
              </button>
            </div>
          </div>

          {/* EXTRACTED */}
          <div className="mb-4">
            <label className="block text-sm font-semibold">Extracted Text</label>
            <textarea
              rows="6"
              className="w-full mt-2 p-3 bg-black/40 rounded"
              value={text}
              onChange={e => setText(e.target.value)}
            />
          </div>

          {/* LANG SELECTION */}
          <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold">Source Language</label>
              <select
                value={sourceLang}
                onChange={e => setSourceLang(e.target.value)}
                className="w-full p-2 bg-black/30 rounded mt-2"
              >
                <option value="auto">Auto Detect</option>
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="fr">French</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold">Choose Target Languages</label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {available.map(l => (
                  <label key={l.code} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={targets.includes(l.code)}
                      onChange={() => toggleTarget(l.code)}
                    />
                    {l.name} ({l.code})
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* TRANSLATE BUTTON */}
          <button
            onClick={translateAll}
            className="w-full py-3 bg-purple-600 rounded mb-4"
            disabled={loading}
          >
            {loading ? "Translating..." : "Translate"}
          </button>

          {/* TRANSLATION RESULTS */}
          <h2 className="text-lg font-semibold mb-2">Translations</h2>

          <div className="space-y-3">
            {targets.map(t => (
              <div
                key={t}
                className="bg-black/30 p-3 rounded flex flex-col md:flex-row md:items-start md:justify-between gap-3"
              >
                <div className="flex-1">
                  <div className="text-sm font-medium text-white/80">
                    {available.find(a => a.code === t)?.name} — {t}
                  </div>

                  <div className="mt-2 text-sm whitespace-pre-wrap">
                    {translations[t] || errors[t] || "—"}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    className="px-3 py-1 bg-blue-600 rounded"
                    onClick={() => playTTS(t, translations[t] || text)}
                  >
                    Play
                  </button>

                  <button
                    className="px-3 py-1 bg-green-600 rounded"
                    onClick={() => downloadTTS(t, translations[t], `tts_${t}.mp3`)}
                  >
                    Download MP3
                  </button>

                  <button
                    className="px-3 py-1 bg-gray-700 rounded"
                    onClick={() => copy(translations[t] || text)}
                  >
                    Copy
                  </button>
                </div>

              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
