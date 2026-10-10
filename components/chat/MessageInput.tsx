"use client";

import { useState, useRef, useTransition, useEffect } from "react";
import Image from "next/image";
import { useMentions } from "@/lib/hooks/useMentions";
import { formatMentionsForStorage } from "../renderWithTags-helper";
import VoiceRecorder from "@/components/chat/VoiceRecorder";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Paperclip, Send, X, FileText, Loader2, Smile, Image as ImageIcon } from "lucide-react";
import GifPicker, { GifResult } from "./GifPicker";
import { Theme, type EmojiClickData } from "emoji-picker-react";
import dynamic from "next/dynamic";
const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false, loading: () => <div className="w-[320px] h-[400px] bg-white border rounded-lg" />});

// Typescript interface for the props of the MessageInput component
interface Props {
  onSendText: (content: string, taggedUserIds?: string[]) => void;
  onSendFiles: (content: string, files: File[], taggedUserIds?: string[]) => Promise<void>;
  onSendGif: (gif: GifResult) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  klipyKey: string;
}

// Allowed file types for chat attachments (mirrors backend upload.js allowedChatAttachmentTypes)
const ACCEPTED_TYPES = [
  "image/png", "image/jpg", "image/jpeg", "image/gif", "image/webp",
  "video/mp4", "video/quicktime", "video/webm",
  "application/pdf", "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
].join(",");


// MessageInput component — textarea, file picker, send button
export default function MessageInput({ onSendText, onSendFiles, onSendGif, onTypingStart, onTypingStop, klipyKey }: Props) {
  // States & refs to hold input values, files, etc...
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [isSending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const gifRef = useRef<HTMLDivElement>(null);

  // Reuse the same mention hook pattern as PostForm and CommentForm
  const { mentionResults, taggedUsers, handleMentionSearch, insertMention, resetMentions } = useMentions();

  // Send button handler
  const handleSend = () => {
    const trimmed = content.trim();              // remove leading/trailing whitespace    
    if (!trimmed && files.length === 0) return;  // Must have text or files — not both empty

    // Convert plain mentions to stored format & extract tagged IDs
    const storedContent = formatMentionsForStorage(trimmed, taggedUsers);
    const taggedIds = taggedUsers.map((u) => u.id); 

    if (files.length > 0) {
      // File path — REST upload, server broadcasts via socket after Cloudinary upload
      startTransition(async () => {
        try {
          await onSendFiles(storedContent, files, taggedIds.length ? taggedIds : undefined);
          setContent("");                       // clear textarea
          setFiles([]);                         // clear files
          resetMentions();                      // clear mentions
          onTypingStop();                       // clear typing indicator
          textareaRef.current?.focus();         // refocus textarea
        } catch {
          toast.error("Failed to send files. Please try again.");   // toast an error
        }
      });
    } else {
      // Text-only path — socket, instant
      onSendText(storedContent, taggedIds.length ? taggedIds : undefined);
      setContent("");                           // clear textarea
      resetMentions();                          // clear mentions
      onTypingStop();                           // clear typing indicator
      textareaRef.current?.focus();             // refocus textarea
    }
  };

  // ─── Textarea change ───────────────────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);           // update content state
    handleMentionSearch(e.target.value);  // mentions — same pattern as PostForm / CommentForm
    onTypingStart();                      // emit typing_start + auto-stop timer in useChat
  };

  // ─── Enter to send (Shift+Enter = new line) ────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ─── File picker ───────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Get picked files, if no files picked, return out (do nothing)
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;

    // Cap at 10 files total (mirrors backend .array("attachments", 10))
    const combined = [...files, ...picked].slice(0, 10);
    setFiles(combined);
    // Reset input so same file can be re-picked after removal
    e.target.value = "";
  };

  // ─── File removal & filter ─────────────────────────────────────────────────
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // ─── Voice recording ───────────────────────────────────────────────────────
  const handleVoiceSend = (blob: Blob) => {
    const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
    setFiles(prev => [...prev, file]);
  };
  

  // ─── Emoji & Gif picker ──────────────────────────────────────────────────────────
  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmojiPicker(false);
      if (gifRef.current && !gifRef.current.contains(e.target as Node)) setShowGifPicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowEmojiPicker(false);
        setShowGifPicker(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // handle emoji selection
  const handleEmojiSelect = (emojiData: EmojiClickData) => {
    setContent(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };
  // handle gif selection
  const handleGifSelect = (gif: GifResult) => {
    onSendGif(gif);
    setShowGifPicker(false);
  };


  return (
    <div className="border-t bg-white px-3 sm:px-4 py-3 shrink-0">

      {/* File previews, using FilePreview Sub-component */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {files.map((file, i) => (<FilePreview key={i} file={file} onRemove={() => removeFile(i)} /> ))}
        </div>
      )}

      {/* Mention dropdown — same pattern as CommentForm */}
      {mentionResults.length > 0 && (
        <div className="mb-1 border rounded-lg bg-white shadow-md overflow-hidden">
          {mentionResults.map(user => (
            <button key={user.id} type="button" className="flex w-full items-center cursor-pointer gap-2 px-3 py-2 hover:bg-gray-50 text-left text-sm"
              onClick={() => {
                // insertMention updates the content string — same pattern as PostForm
                insertMention(user, content, (val) => setContent(val));
                textareaRef.current?.focus();
              }}
            >
              <Image src={user.image || "/default-avatar.png"} alt={user.name} width={24} height={24} className="rounded-full w-6 h-6 object-cover" />
              <span>{user.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="flex flex-col gap-2">
        
        <div className="flex items-end gap-2">
          {/* Action buttons — desktop: left of textarea */}
          <div className="hidden md:flex items-center gap-1 shrink-0">
          {/* Attach files */}
          <Button type="button" variant="ghost" size="icon" aria-label="Attach files" className="shrink-0 text-gray-400 hover:text-blue-500 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending || files.length >= 10}
            title="Attach files"
          >
            <Paperclip size={18} />
          </Button>
          <input ref={fileInputRef} type="file" multiple accept={ACCEPTED_TYPES} className="hidden" onChange={handleFileChange} />

          {/* Emoji */}
          <div className="relative" ref={emojiRef}>
            <Button type="button" variant="ghost" size="icon" aria-label="Emoji picker" disabled={isSending} className="shrink-0 text-gray-400 hover:text-blue-500 cursor-pointer"
              onClick={() => {
                setShowEmojiPicker((p) => !p);
                setShowGifPicker(false);
              }}
            >
              <Smile size={20} />
            </Button>
            {showEmojiPicker && (
              <div className="absolute bottom-12 left-0 z-50 max-w-[calc(100vw-1.5rem)]">
                <EmojiPicker 
                  onEmojiClick={handleEmojiSelect}
                  theme={Theme.LIGHT} 
                  width={320}
                  height={Math.min(400, typeof window !== "undefined" ? window.innerHeight * 0.6 : 400)} lazyLoadEmojis />
              </div>
            )}
          </div>

          {/* GIF */}
          <div className="relative" ref={gifRef}>
            <Button type="button" variant="ghost" size="icon" aria-label="GIF picker" disabled={isSending || !klipyKey} className="shrink-0 text-gray-400 hover:text-blue-500 cursor-pointer"
              onClick={() => {
                setShowGifPicker((p) => !p);
                setShowEmojiPicker(false);
              }}
            >
              <ImageIcon size={20} />
            </Button>
            {showGifPicker && (
              <div className="absolute bottom-12 left-0 z-50 max-w-[calc(100vw-1.5rem)]">
                <GifPicker onSelect={handleGifSelect} klipyKey={klipyKey} />
              </div>
            )}
          </div>

          {/* Voice recorder */}
          <VoiceRecorder onSend={handleVoiceSend} />
        </div>  

          {/* Textarea */}
          <div className="relative min-w-0 flex-1">
            <Textarea ref={textareaRef} value={content} onChange={handleChange}
              onKeyDown={handleKeyDown} placeholder="Write a message... (@ to mention)"
              rows={1}  disabled={isSending}
              className="resize-none min-h-[42px] max-h-32 py-2.5 pr-3 text-sm leading-relaxed overflow-y-auto"
            />
          </div>

          {/* Send button */}
          <Button type="button" size="icon" title="Send (Enter)" onClick={handleSend} disabled={ isSending || (!content.trim() && files.length === 0) }
            className="shrink-0 mb-0.5 bg-blue-500 hover:bg-blue-600 text-white cursor-pointer"
          >
            {isSending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </Button>
        </div>

        {/* Action buttons — mobile only */}
        <div className="flex md:hidden items-center justify-between gap-1">

          {/* Attach files */}
          <Button type="button" variant="ghost" size="icon" aria-label="Attach files" className="shrink-0 text-gray-400 hover:text-blue-500 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending || files.length >= 10}
            title="Attach files"
          >
            <Paperclip size={18} />
          </Button>
          <input ref={fileInputRef} type="file" multiple accept={ACCEPTED_TYPES} className="hidden" onChange={handleFileChange} />

          {/* Emoji */}
          <div className="relative" ref={emojiRef}>
            <Button type="button" variant="ghost" size="icon" aria-label="Emoji picker" disabled={isSending} className="shrink-0 text-gray-400 hover:text-blue-500 cursor-pointer"
              onClick={() => {
                setShowEmojiPicker((p) => !p);
                setShowGifPicker(false);
              }}
            >
              <Smile size={20} />
            </Button>
            {showEmojiPicker && (
              <div className="absolute bottom-12 left-[-95px] z-50 max-w-[calc(100vw-1.5rem)]">
                <EmojiPicker 
                  onEmojiClick={handleEmojiSelect}
                  theme={Theme.LIGHT} 
                  width={320}
                  height={Math.min(400, typeof window !== "undefined" ? window.innerHeight * 0.6 : 400)} lazyLoadEmojis />
              </div>
            )}
          </div>

          {/* GIF */}
          <div className="relative" ref={gifRef}>
            <Button type="button" variant="ghost" size="icon" aria-label="GIF picker" disabled={isSending || !klipyKey} className="shrink-0 text-gray-400 hover:text-blue-500 cursor-pointer"
              onClick={() => {
                setShowGifPicker((p) => !p);
                setShowEmojiPicker(false);
              }}
            >
              <ImageIcon size={20} />
            </Button>
            {showGifPicker && (
              <div className="absolute bottom-12 -left-40 z-50 max-w-[calc(100vw-1.5rem)]">
                <GifPicker onSelect={handleGifSelect} klipyKey={klipyKey} />
              </div>
            )}
          </div>

          {/* Voice recorder */}
          <VoiceRecorder onSend={handleVoiceSend} />
        </div>
      </div>
      
      {/* Hint */}
      <p className="text-xs hidden md:block text-gray-300 mt-1.5 text-right"> Enter to send · Shift+Enter for new line </p>

    </div>
  );
}


// ─── File preview tile Sub-component ────────────────────────────────────────────────────────
function FilePreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const isImage = file.type.startsWith("image/");      // Check if file is an image
  const sizeKB  = Math.round(file.size / 1024);        // Get file size in KB

  return (
    <div className="relative group flex items-center gap-2 bg-gray-100 rounded-lg px-2 py-1.5 pr-6 max-w-40">
      {/* If it's an image, display it, otherwise display an icon */}
      {isImage ? (        
        <Image src={URL.createObjectURL(file)} alt={file.name} width={32} height={32} className="w-8 h-8 rounded object-cover shrink-0" unoptimized/>
      ) : (
        <FileText size={20} className="text-gray-400 shrink-0" />
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium truncate text-gray-700">{file.name}</p>
        <p className="text-xs text-gray-400">{sizeKB} KB</p>
      </div>
      {/* Remove file - button */}
      <button type="button" onClick={onRemove} aria-label="Remove file"
        className="absolute top-0.5 right-0.5 w-4 h-4 bg-gray-400 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-colors" >
        <X size={10} />
      </button>
    </div>
  );
}