"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface ProgressEvent {
  step: string;
  message: string;
  current?: number;
  total?: number;
  job_id?: string;
}

export default function ProcessingPage() {
  const { id } = useParams();
  const router = useRouter();
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const es = new EventSource(`https://audionotebook.onrender.com/process/${id}`);

    es.onmessage = (e) => {
      const data: ProgressEvent = JSON.parse(e.data);
      setLogs((prev) => [...prev, data.message]);

      if (data.step === "extract") setProgress(10);
      else if (data.step === "split") setProgress(25);
      else if (data.step === "ai") {
        if (data.current && data.total) {
          setProgress(25 + Math.round((data.current / data.total) * 40));
        }
      } else if (data.step === "tts") {
        if (data.current && data.total) {
          setProgress(65 + Math.round((data.current / data.total) * 30));
        }
      } else if (data.step === "done") {
        setProgress(100);
        setDone(true);
        es.close();
        setTimeout(() => router.push(`/player/${data.job_id}`), 1000);
      } else if (data.step === "error") {
        setError(data.message);
        es.close();
      }
    };

    es.onerror = () => {
      es.close();
    };

    return () => es.close();
  }, [id, router]);

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-2 text-center">Generating your Audiobook</h1>
        <p className="text-gray-400 text-center mb-8 text-sm">This may take a few minutes depending on PDF size.</p>

        {/* Progress bar */}
        <div className="w-full bg-gray-800 rounded-full h-3 mb-6">
          <div
            className="bg-blue-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-center text-sm text-blue-400 mb-6">{progress}% complete</p>

        {/* Live log */}
        <div className="bg-gray-900 rounded-xl p-4 h-56 overflow-y-auto border border-gray-800">
          {logs.map((log, i) => (
            <p key={i} className={`text-sm mb-1 ${i === logs.length - 1 ? "text-white" : "text-gray-500"}`}>
              {i === logs.length - 1 ? "▶ " : "✓ "}{log}
            </p>
          ))}
          {done && <p className="text-green-400 text-sm mt-2 font-medium">✓ Done! Redirecting to player...</p>}
          {error && <p className="text-red-400 text-sm mt-2">✗ Error: {error}</p>}
        </div>
      </div>
    </main>
  );
}
