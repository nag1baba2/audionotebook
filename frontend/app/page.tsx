"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("story");
  const [language, setLanguage] = useState("en");
  const [tone, setTone] = useState("neutral");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === "application/pdf") setFile(dropped);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", mode);
      formData.append("language", language);
      formData.append("tone", tone);
      const res = await fetch("https://audionotebook.onrender.com/upload", { method: "POST", body: formData });
      const data = await res.json();
      router.push(`/processing/${data.job_id}`);
    } catch {
      setError("Failed to connect to backend. Make sure it's running.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-2">AudioNotebook</h1>
          <p className="text-gray-400">Upload a PDF and get an AI-narrated audiobook in minutes.</p>
        </div>

        {/* Drop zone */}
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors mb-5 ${
            dragging ? "border-blue-400 bg-blue-950/30" : "border-gray-700 hover:border-gray-500"
          }`}
        >
          <input ref={inputRef} type="file" accept=".pdf" className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)} />
          {file ? (
            <div>
              <p className="text-2xl mb-1">📄</p>
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-gray-400 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          ) : (
            <div>
              <p className="text-4xl mb-2">📂</p>
              <p className="text-gray-300 font-medium">Drop your PDF here</p>
              <p className="text-gray-500 text-sm mt-1">or click to browse</p>
            </div>
          )}
        </div>

        {/* Options */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div>
            <label className="text-xs text-gray-400 mb-1 block uppercase tracking-wider">Mode</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
              <option value="story">Story</option>
              <option value="technical">Technical</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block uppercase tracking-wider">Language</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block uppercase tracking-wider">Tone</label>
            <select value={tone} onChange={(e) => setTone(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
              <option value="neutral">Neutral</option>
              <option value="calm">Calm</option>
              <option value="excited">Excited</option>
              <option value="serious">Serious</option>
              <option value="friendly">Friendly</option>
            </select>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm mb-3 text-center">{error}</p>}

        <button onClick={handleSubmit} disabled={!file || loading}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 font-semibold text-white transition-colors">
          {loading ? "Uploading..." : "Generate Audiobook"}
        </button>
      </div>
    </main>
  );
}
