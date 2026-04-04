"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

interface Message { role: "user" | "assistant"; content: string }

const QUICK_QUESTIONS = [
  "利益を改善するには？",
  "外注比率を下げるには？",
  "来年の採用計画は？",
  "設備投資の優先順位は？",
];

const SCOPES = [
  { key: "financials", label: "決算データ", default: true },
  { key: "cost_masters", label: "コストマスタ", default: true },
  { key: "analysis", label: "5ステップ分析", default: true },
  { key: "workforce", label: "要員計画", default: true },
  { key: "targets", label: "目標設定", default: true },
  { key: "simulations", label: "シミュレーション", default: false },
];

export default function AiChatPage() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "こんにちは！御社の経営データを分析しました。何かご質問はありますか？" },
  ]);
  const [input, setInput] = useState(searchParams.get("q") || "");
  const [isStreaming, setIsStreaming] = useState(false);
  const [scopes, setScopes] = useState<string[]>(SCOPES.filter(s => s.default).map(s => s.key));
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-send if query param
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) { setInput(q); setTimeout(() => sendMessage(q), 500); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || isStreaming) return;
    setInput("");
    setIsStreaming(true);

    const newMessages: Message[] = [...messages, { role: "user", content: msg }];
    setMessages(newMessages);

    // Add streaming placeholder
    setMessages(prev => [...prev, { role: "assistant", content: "" }]);

    try {
      const history = newMessages.filter(m => m.role !== "assistant" || m.content).slice(-10); // Last 10 messages
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history: history.slice(0, -1), context_scope: scopes }),
      });

      if (!res.ok) {
        setMessages(prev => { const n = [...prev]; n[n.length - 1] = { role: "assistant", content: "エラーが発生しました。ANTHROPIC_API_KEYが設定されているか確認してください。" }; return n; });
        setIsStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) { setIsStreaming(false); return; }

      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "text") {
              fullText += data.content;
              setMessages(prev => { const n = [...prev]; n[n.length - 1] = { role: "assistant", content: fullText }; return n; });
            }
          } catch { /* skip non-JSON */ }
        }
      }
    } catch {
      setMessages(prev => { const n = [...prev]; n[n.length - 1] = { role: "assistant", content: "通信エラーが発生しました。" }; return n; });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const resetChat = () => {
    setMessages([{ role: "assistant", content: "新しい会話を開始しました。何かご質問はありますか？" }]);
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-120px)]">
      {/* Sidebar: Context */}
      <Card className="w-56 flex-shrink-0 hidden lg:block">
        <CardHeader className="py-3"><CardTitle className="text-xs">コンテキスト</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {SCOPES.map(s => (
            <label key={s.key} className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox checked={scopes.includes(s.key)} onCheckedChange={(v) => setScopes(prev => v ? [...prev, s.key] : prev.filter(p => p !== s.key))} />
              <span>{scopes.includes(s.key) ? "✅" : "☐"} {s.label}</span>
            </label>
          ))}
          <Button variant="outline" size="sm" className="w-full mt-3 text-xs" onClick={resetChat}>新しい会話</Button>
        </CardContent>
      </Card>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${msg.role === "user" ? "bg-blue-600 text-white" : "bg-white border shadow-sm text-slate-700"}`}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: simpleMarkdown(msg.content || (isStreaming && i === messages.length - 1 ? "考え中..." : "")) }} />
                ) : msg.content}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick questions */}
        <div className="flex flex-wrap gap-2 pb-2">
          {QUICK_QUESTIONS.map(q => (
            <button key={q} onClick={() => sendMessage(q)} disabled={isStreaming} className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors disabled:opacity-50">
              {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="質問を入力..."
            rows={2}
            className="flex-1 resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            disabled={isStreaming}
          />
          <Button onClick={() => sendMessage()} disabled={isStreaming || !input.trim()} className="self-end">
            {isStreaming ? "..." : "送信"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function simpleMarkdown(text: string): string {
  return text
    .replace(/### (.+)/g, '<h3 class="font-bold text-base mt-3 mb-1">$1</h3>')
    .replace(/## (.+)/g, '<h2 class="font-bold text-lg mt-4 mb-1">$1</h2>')
    .replace(/# (.+)/g, '<h1 class="font-bold text-xl mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\- (.+)/gm, '<li class="ml-4">$1</li>')
    .replace(/^\d+\. (.+)/gm, '<li class="ml-4 list-decimal">$1</li>')
    .replace(/\n/g, '<br/>');
}
