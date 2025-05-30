"use client";

import { useState, useEffect } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function Home() {
  const [copied, setCopied] = useState<string | null>(null);
  const [origin, setOrigin] = useState<string>("");
  
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Resolver v1.0.0</h1>
            <p className="text-sm text-slate-400">
              No more cryptic errors. Vomits full JSON response from endpoint so you know for sure.
            </p>
          </div>
        </div>

        <Separator className="my-4 bg-slate-800" />

        <main className="max-w-5xl mx-auto">
          <section className="mb-10">
            <h2 className="text-xl font-semibold mb-4 text-white">How to Use</h2>
            
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="bg-slate-900 border-slate-800 shadow overflow-hidden">
                <CardContent className="pt-5 px-5 pb-5">
                  <h3 className="text-lg font-medium mb-3 text-white">Standard Endpoints</h3>
                  <div className="bg-slate-800 p-3 rounded-md mb-3">
                    <div className="flex justify-between items-center mb-2">
                      <code className="text-emerald-400 text-sm">GET/POST</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-slate-400 hover:text-white hover:bg-slate-700"
                        onClick={() => copyToClipboard(`${origin}/api/proxy?url=https://example.com/api/endpoint`, "endpoint")}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="text-xs font-mono text-slate-300 break-all">
                      {origin}/api/proxy?url=https://example.com/api/endpoint
                    </p>
                  </div>
                  <p className="text-xs text-slate-400">
                    For standard JSON requests. Passes through all headers and returns formatted response.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border-slate-800 shadow overflow-hidden">
                <CardContent className="pt-5 px-5 pb-5">
                  <h3 className="text-lg font-medium mb-3 text-white">Streaming Endpoints</h3>
                  <div className="bg-slate-800 p-3 rounded-md mb-3">
                    <div className="flex justify-between items-center mb-2">
                      <code className="text-emerald-400 text-sm">GET/POST</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-slate-400 hover:text-white hover:bg-slate-700"
                        onClick={() => copyToClipboard(`${origin}/api/proxy/stream?url=https://example.com/api/streaming-endpoint`, "stream")}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="text-xs font-mono text-slate-300 break-all">
                      {origin}/api/proxy/stream?url=https://example.com/api/streaming-endpoint
                    </p>
                  </div>
                  <p className="text-xs text-slate-400">
                    For Server-Sent Events (SSE). Handles streaming responses and formats each event.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>
        </main>
        
        {copied && (
          <div className="fixed bottom-4 right-4 p-3 bg-emerald-800 text-white text-xs rounded-md shadow-lg animate-fade-in-out">
            Copied {copied} to clipboard
          </div>
        )}
      </div>
    </div>
  );
} 