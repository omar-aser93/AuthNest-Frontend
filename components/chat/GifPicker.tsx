"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useDebounce } from "@/lib/hooks/useDebounce";

export interface GifResult {
  id: string;
  url: string;
  preview: string;
  width: number;
  height: number;
}

interface KlipyMediaFormat {
  url: string;
  dims?: [number, number];
}

interface KlipyResult {
  id: string;
  media_formats?: {
    gif?: KlipyMediaFormat;
    tinygif?: KlipyMediaFormat;
    nanogif?: KlipyMediaFormat;
  };
}

interface KlipyApiResponse {
  results?: KlipyResult[];
}

// GifPicker component used in the chat
export default function GifPicker({ onSelect, klipyKey }: { onSelect: (gif: GifResult) => void  ; klipyKey: string }) {
  // States to store the data
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 400);

  // Effect to fetch Gifs
  useEffect(() => {
    if (!klipyKey) { setGifs([]); return; }     // No key, no gifs
    const controller = new AbortController();
    const fetchGifs = async () => {
      setLoading(true);
      try { 
        const endpoint = debouncedQuery
          ? `https://api.klipy.com/v2/search?q=${encodeURIComponent(debouncedQuery)}&key=${klipyKey}&limit=20`
          : `https://api.klipy.com/v2/featured?key=${klipyKey}&limit=20`;

        const res = await fetch(endpoint, { signal: controller.signal });
        if (!res.ok) { throw new Error(`Klipy API error: ${res.status}`); }
        const data: KlipyApiResponse = await res.json();
        const parsedGifs: GifResult[] = (data.results ?? []).map((r): GifResult => {
            const media = r.media_formats ?? {};
            const gif = media.gif ?? media.tinygif;
            const preview = media.tinygif ?? media.nanogif ?? gif;
            const dims = preview?.dims ?? [200, 200];
            return {
              id: r.id,
              url: gif?.url ?? "",
              preview: preview?.url ?? "",
              width: dims[0],
              height: dims[1],
            };
          })
          .filter((gif) => gif.url !== "" && gif.preview !== "");
        setGifs(parsedGifs);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") { return; }
        console.error("GifPicker fetch failed:", err);
        setGifs([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchGifs();                         // call the function
    return () => controller.abort();     // Cleanup on unmount
  }, [debouncedQuery, klipyKey]);

  return (
    <div className="w-[288px] max-w-[calc(100vw-1rem)] box-border bg-white border rounded-xl shadow-lg p-3 flex flex-col gap-2">
      <Input placeholder="Search GIFs..." value={query} onChange={(e) => setQuery(e.target.value)} />
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 size={20} className="animate-spin text-gray-400" />
        </div>
      ) : gifs.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-6">No GIFs found</p>
      ) : (
        <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto">
          {gifs.map((gif) => (
            <button key={gif.id} type="button" onClick={() => onSelect(gif)} className="rounded overflow-hidden hover:opacity-80 transition" >
              <Image src={gif.preview} alt="gif" width={gif.width} height={gif.height} className="w-full h-auto object-cover" unoptimized />
            </button>
          ))}
        </div>
      )}
      <p className="text-xs text-gray-400 text-right">Powered by KLIPY</p>
    </div>
  );
}