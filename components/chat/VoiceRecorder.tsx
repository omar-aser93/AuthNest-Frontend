"use client";

import { useState, useRef } from "react";
import { Mic, Send, X, CirclePause } from "lucide-react";
import { Button } from "@/components/ui/button";


// VoiceRecorder component, used to start/stop voice messages & send them
export default function VoiceRecorder({ onSend }: { onSend: (blob: Blob) => void }) {
  // States (recording, blob, seconds) & refs (recorder, chunks, timer)
  const [recording, setRecording] = useState(false);
  const [blob, setBlob]           = useState<Blob | null>(null);
  const [seconds, setSeconds]     = useState(0);
  const recorderRef  = useRef<MediaRecorder | null>(null);
  const chunksRef    = useRef<Blob[]>([]);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  // Function to Start voice recording
  const start = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });  // get audio stream
    const recorder = new MediaRecorder(stream);       // create recorder from the stream (browser's native MediaRecorder API)
    recorderRef.current = recorder;                   // store recorder in ref
    chunksRef.current = [];                           // clear chunks array
    // ------------- Event handlers ------------------
    // at data available event, store chunks in ref
    recorder.ondataavailable = e => chunksRef.current.push(e.data);     
    //at onstop event, create audio blob, stop stream
    recorder.onstop = () => {
      const audio = new Blob(chunksRef.current, { type: "audio/webm" });
      setBlob(audio);
      stream.getTracks().forEach(t => t.stop());
    };

    recorder.start();                  // start recording
    setRecording(true);                // set recording state to true
    setSeconds(0);                     // reset seconds
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);  // start timer
  };

  // Function to Stop voice recording
  const stop = () => {
    recorderRef.current?.stop();            // stop recording
    setRecording(false);                    // set recording state to false
    if (timerRef.current) clearInterval(timerRef.current);   // clear timer
  };

  // Function to Send the voice recording
  const send = () => {
    if (blob) { onSend(blob); setBlob(null); setSeconds(0); }       // if blob exists, send it & clear
  };

  // Function to Discard the voice recording
  const discard = () => { setBlob(null); setSeconds(0); };          

  // Format seconds to MM:SS
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;


  // If blob exists, render audio player
  if (blob) return (
    <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-xl border w-full md:w-auto max-w-[335px] md:max-w-none">
      <audio controls src={URL.createObjectURL(blob)} className="h-8" />
      <Button size="icon" variant="ghost" onClick={discard}><X size={16} /></Button>
      <Button size="icon" className="bg-blue-500 text-white" onClick={send}><Send size={16} /></Button>
    </div>
  );

  // Otherwise, render voice recorder button
  return (
    <Button type="button" variant={recording ? "destructive" : "ghost"} size="icon" className="cursor-pointer shrink-0 text-gray-400 hover:text-blue-500 mb-0.5"
      onClick={recording ? stop : start} title={recording ? "Stop recording" : "Record voice message"}>
      {recording ? (
        <span className="flex flex-col items-center text-white text-xs"><CirclePause size={10} />{fmt(seconds)}</span>
      ) : (
        <Mic size={18} />
      )}
    </Button>
  );
}