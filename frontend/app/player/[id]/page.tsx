"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

interface Chapter {
  index: number;
  title: string;
  summary: string;
  audio_url: string;
}

interface Message {
  role: "user" | "ai";
  text: string;
}

export default function PlayerPage() {
  const { id } = useParams();
  const router = useRouter();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`https://audionotebook.onrender.com/player/${id}`)
      .then((r) => r.json())
      .then((d) => {
        const chs = d.chapters || [];
        setChapters(chs);
        if (chs.length > 0 && audioRef.current) {
          audioRef.current.src = `https://audionotebook.onrender.com${chs[0].audio_url}`;
          audioRef.current.load();
        }
      });
  }, [id]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectChapter = (i: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setCurrent(i);
    audio.src = `https://audionotebook.onrender.com${chapters[i].audio_url}`;
    audio.load();
    audio.oncanplay = () => { audio.play().catch(() => {}); audio.oncanplay = null; };
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

  const sendQuestion = async () => {
    if (!question.trim() || chatLoading) return;
    const q = question.trim();
    setQuestion("");
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setChatLoading(true);
    try {
      const res = await fetch(`https://audionotebook.onrender.com/chat/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "ai", text: data.answer }]);
    } catch {
      setMessages((prev) => [...prev, { role: "ai", text: "Failed to get answer. Try again." }]);
    }
    setChatLoading(false);
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
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-3 flex items-center gap-4 shrink-0">
        <button onClick={() => router.push("/")} className="text-gray-400 hover:text-white text-sm">← Upload another</button>
        <h1 className="text-base font-bold">AudioNotebook</h1>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-gray-800 overflow-y-auto p-3 shrink-0">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Chapters</p>
          {chapters.map((c, i) => (
            <button key={i} onClick={() => selectChapter(i)}
              className={`w-full text-left px-3 py-2 rounded-lg mb-1 transition-colors text-sm ${
                i === current ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-800"
              }`}>
              <p className="font-medium truncate">{c.title}</p>
            </button>
          ))}
        </aside>

        {/* Main area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Summary */}
          <div className="p-6 border-b border-gray-800 shrink-0">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Chapter {ch.index}</p>
            <h2 className="text-xl font-bold mb-3 line-clamp-2">{ch.title}</h2>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">AI Summary</p>
              <p className="text-gray-300 text-sm leading-relaxed">{ch.summary}</p>
            </div>
          </div>

          {/* Chat */}
          <div className="flex-1 flex flex-col overflow-hidden p-4">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">Chat with this book</p>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-3">
              {messages.length === 0 && (
                <p className="text-gray-600 text-sm text-center mt-6">Ask anything about the content...</p>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-xl text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-200 border border-gray-700"
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 border border-gray-700 px-4 py-2.5 rounded-xl text-sm text-gray-400">
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendQuestion()}
                placeholder="Ask something about the book..."
                className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <button onClick={sendQuestion} disabled={chatLoading || !question.trim()}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-xl text-sm font-medium transition-colors">
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Audio player bar */}
      <div className="border-t border-gray-800 bg-gray-900 px-6 py-3 flex items-center gap-4 shrink-0">
        <button onClick={() => current > 0 && selectChapter(current - 1)}
          disabled={current === 0} className="text-gray-400 hover:text-white disabled:opacity-30 text-lg">⏮</button>

        <button onClick={togglePlay}
          className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
          {playing ? "⏸" : "▶"}
        </button>

        <button onClick={() => current < chapters.length - 1 && selectChapter(current + 1)}
          disabled={current === chapters.length - 1} className="text-gray-400 hover:text-white disabled:opacity-30 text-lg">⏭</button>

        <div className="flex-1">
          <p className="text-sm font-medium text-white truncate">{ch.title}</p>
          <p className="text-xs text-gray-500">Chapter {ch.index} of {chapters.length}</p>
        </div>

        <audio ref={audioRef} onEnded={onEnded}
          onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
      </div>
    </main>
  );
}
