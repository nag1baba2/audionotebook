"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

interface Chapter {
  index: number;
  title: string;
  summary: string;
  audio_url: string;
}

export default function PlayerPage() {
  const { id } = useParams();
  const router = useRouter();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    fetch(`http://localhost:8000/player/${id}`)
      .then((r) => r.json())
      .then((d) => {
        const chs = d.chapters || [];
        setChapters(chs);
        if (chs.length > 0 && audioRef.current) {
          audioRef.current.src = `http://localhost:8000${chs[0].audio_url}`;
          audioRef.current.load();
        }
      });
  }, [id]);

  const selectChapter = (i: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setCurrent(i);
    audio.src = `http://localhost:8000${chapters[i].audio_url}`;
    audio.load();
    audio.oncanplay = () => {
      audio.play().catch(() => {});
      audio.oncanplay = null;
    };
    setPlaying(true);
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play().catch(() => {}); setPlaying(true); }
  };

  const onEnded = () => {
    if (current < chapters.length - 1) selectChapter(current + 1);
    else setPlaying(false);
  };

  if (chapters.length === 0) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">Loading chapters...</p>
      </main>
    );
  }

  const ch = chapters[current];

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col">
      <div className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push("/")} className="text-gray-400 hover:text-white text-sm">← Upload another</button>
        <h1 className="text-lg font-bold">AudioNotebook</h1>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-72 border-r border-gray-800 overflow-y-auto p-4 shrink-0">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">Chapters</p>
          {chapters.map((c, i) => (
            <button
              key={i}
              onClick={() => selectChapter(i)}
              className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 transition-colors text-sm ${
                i === current ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-800"
              }`}
            >
              <p className="font-medium truncate">{c.title}</p>
            </button>
          ))}
        </aside>

        <div className="flex-1 flex flex-col p-8 overflow-y-auto">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Chapter {ch.index}</p>
          <h2 className="text-2xl font-bold mb-4 line-clamp-2">{ch.title}</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">AI Summary</p>
            <p className="text-gray-300 leading-relaxed text-sm">{ch.summary}</p>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-800 bg-gray-900 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => current > 0 && selectChapter(current - 1)}
          disabled={current === 0}
          className="text-gray-400 hover:text-white disabled:opacity-30 text-lg"
        >⏮</button>

        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center text-white font-bold"
        >
          {playing ? "⏸" : "▶"}
        </button>

        <button
          onClick={() => current < chapters.length - 1 && selectChapter(current + 1)}
          disabled={current === chapters.length - 1}
          className="text-gray-400 hover:text-white disabled:opacity-30 text-lg"
        >⏭</button>

        <div className="flex-1">
          <p className="text-sm font-medium text-white truncate">{ch.title}</p>
          <p className="text-xs text-gray-500">Chapter {ch.index} of {chapters.length}</p>
        </div>

        <audio
          ref={audioRef}
          onEnded={onEnded}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
      </div>
    </main>
  );
}
