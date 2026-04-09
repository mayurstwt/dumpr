import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { type LocationTag } from '@/lib/weekend';
import { ImagePlus, Send, X, Loader2, MessageSquare, Mic, Clock, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import imageCompression from 'browser-image-compression';
import { useWeekendCountdown } from '@/hooks/useWeekendCountdown';
import confetti from 'canvas-confetti';
import { getWeeklyPersona } from '@/lib/personas';

interface PostFormProps {
  userId: string;
  onPosted: () => void;
  replyTo?: { id: string; content: string } | null;
  onCancelReply?: () => void;
}

// SVG character count ring
function CharCountRing({ count, max }: { count: number; max: number }) {
  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(count / max, 1);
  const offset = circumference * (1 - progress);
  const isNearLimit = count >= max * 0.85;
  const isAtLimit = count >= max;

  return (
    <svg width="28" height="28" viewBox="0 0 28 28" className="rotate-[-90deg]">
      <circle
        cx="14" cy="14" r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        className="text-border"
      />
      <circle
        cx="14" cy="14" r={radius}
        fill="none"
        strokeWidth="2.5"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className={cn(
          'transition-all duration-150',
          isAtLimit ? 'text-destructive' : isNearLimit ? 'text-amber-500' : 'text-primary',
        )}
      />
    </svg>
  );
}

const VIBE_PROMPTS = [
  "What's the corporate tea today? ☕",
  "The watercooler is whispering... what did you hear? 🤫",
  "Drop a confession from the office floor. 💼",
  "Silicon Valley secrets. No names, just vibes. 🏙️",
  "What's the most unhinged thing a PM said today? 🌀"
];

const WEEKEND_PROMPTS = [
  "What happened this weekend? 🍻",
  "The Sunday Scaries have arrived... tell all. 🧟",
  "Who's the mystery roommate this time? 🏠",
  "Damage report: how much did we spend? 📉",
  "Post that 3 AM photo you regret... 🎞️"
];

export function PostForm({ userId, onPosted, replyTo, onCancelReply }: PostFormProps) {
  const [content, setContent] = useState(() => localStorage.getItem('weekend_draft') || '');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [vibe, setVibe] = useState('glass');
  const [burnHours, setBurnHours] = useState<number | null>(null);
  const [revealDelay, setRevealDelay] = useState<number | null>(null);
  const [isNsfw, setIsNsfw] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>([]);
  const [showPoll, setShowPoll] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [personaType, setPersonaType] = useState<'weekly' | 'seasonal'>('weekly');
  const [isRecording, setIsRecording] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { mode } = useWeekendCountdown();
  const isWeekend = mode === 'weekend';

  const [placeholder, setPlaceholder] = useState('');
  const persona = getWeeklyPersona(userId, personaType);

  useEffect(() => {
    const list = isWeekend ? WEEKEND_PROMPTS : VIBE_PROMPTS;
    setPlaceholder(list[Math.floor(Math.random() * list.length)]);
  }, [isWeekend]);

  useEffect(() => {
    localStorage.setItem('weekend_draft', content);
  }, [content]);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;
    if (files.length + selectedFiles.length > 4) {
      toast.error('Max 4 files allowed');
      return;
    }
    const validFiles = selectedFiles.filter(f => {
      const isVideo = f.type.startsWith('video/');
      const limit = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
      return f.size <= limit;
    });
    setFiles(prev => [...prev, ...validFiles]);
    setPreviews(prev => [...prev, ...validFiles.map(f => URL.createObjectURL(f))]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Voice-to-text not supported in this browser');
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setContent(prev => prev + (prev.length > 0 ? ' ' : '') + transcript);
      toast.success('Voice captured! 🎙️');
    };
    recognition.start();
  };

  const submit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      let media_urls: string[] = [];
      if (files.length > 0) {
        for (const file of files) {
          let fileToUpload = file;
          if (file.type.startsWith('image/')) {
            fileToUpload = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1080, useWebWorker: true });
          }
          const ext = file.name.split('.').pop();
          const path = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
          const { error: uploadError } = await supabase.storage.from('weekend_media').upload(path, fileToUpload);
          if (uploadError) throw uploadError;
          const { data: urlData } = supabase.storage.from('weekend_media').getPublicUrl(path);
          media_urls.push(urlData.publicUrl);
        }
      }

      const finalContent = replyTo ? `>>[${replyTo.id}] ${content.trim()}` : content.trim();
      const legacyPayload = {
        user_id: userId,
        content: finalContent,
        media_url: media_urls.length > 0 ? JSON.stringify(media_urls) : null,
        location_tag: 'Remote',
      };

      let { error } = await supabase.from('posts').insert(legacyPayload);

      if (error) throw error;

      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      setContent('');
      localStorage.removeItem('weekend_draft');
      setFiles([]);
      setPreviews([]);
      onPosted();
      toast.success('Dumped! 🍺');
    } catch (err: any) {
      toast.error(err.message || 'Failed to post');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-3xl md:rounded-[2rem] p-4 md:p-8 neon-border shadow-2xl overflow-hidden transition-all">

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4 px-1">
        <div className="text-sm md:text-base uppercase tracking-[0.2em] text-primary font-black italic">
          {isWeekend ? '🌙 Weekend Mode' : '💼 Weekday Mode'}
        </div>
      </div>

      <div className="mb-8 p-4 rounded-3xl bg-primary/5 border border-primary/20 flex items-center justify-between transition-all hover:bg-primary/10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center font-black text-xl text-primary shadow-inner">
            {persona.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black uppercase tracking-wider text-primary">{persona.name}</span>
              {persona.badge && <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-black">{persona.badge}</span>}
            </div>
            <p className="text-[10px] font-bold text-muted-foreground opacity-60 tracking-tight">{persona.handle}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6 mb-6 px-1 border-b border-border/30 pb-6">
        <div className="flex items-center gap-3">
          <span className="text-xs font-black text-muted-foreground uppercase tracking-wider shrink-0">Burn:</span>
          <div className="flex gap-1.5">
            {[null, 1, 6, 24].map((h) => (
              <button key={h || 'none'} onClick={() => setBurnHours(h)} className={cn("px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all", burnHours === h ? "bg-destructive text-white" : "bg-secondary text-muted-foreground")}>
                {h ? `${h}h` : 'OFF'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-black text-muted-foreground uppercase tracking-wider shrink-0">Reveal:</span>
          <div className="flex gap-1.5">
            {[null, 1, 4, 12].map((h) => (
              <button key={h || 'now'} onClick={() => setRevealDelay(h)} className={cn("px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all", revealDelay === h ? "bg-primary text-primary-foreground shadow-lg" : "bg-card border border-border/40 text-muted-foreground hover:bg-secondary")}>
                {h ? `${h}h` : 'NOW'}
              </button>
            ))}
          </div>
        </div>

        <button onClick={() => setIsNsfw(!isNsfw)} className={cn("px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-all", isNsfw ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" : "bg-secondary text-muted-foreground")}>
          {isNsfw ? 'NSFW ON' : 'SAFE'}
        </button>

        <button onClick={() => { setShowPoll(!showPoll); if (!showPoll && pollOptions.length === 0) setPollOptions(['', '']); }} className={cn("px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-all flex items-center gap-2", showPoll ? "bg-primary/20 text-primary border border-primary/50" : "bg-secondary text-muted-foreground")}>
          📊 Polls
        </button>
      </div>

      {showPoll && (
        <div className="mb-6 p-6 rounded-2xl bg-secondary/30 space-y-3 border border-border/40 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase text-primary tracking-[0.2em]">Poll Options</span>
            <button onClick={() => setShowPoll(false)} className="text-muted-foreground hover:text-foreground p-1"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pollOptions.map((opt, i) => (
              <input key={i} value={opt} onChange={(e) => { const newOpts = [...pollOptions]; newOpts[i] = e.target.value; setPollOptions(newOpts); }} placeholder={`Option ${i + 1}`} className="w-full bg-background border border-border/40 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-primary/50 transition-colors shadow-inner" />
            ))}
          </div>
          {pollOptions.length < 4 && (
            <button onClick={() => setPollOptions([...pollOptions, ''])} className="text-xs font-black text-primary hover:underline uppercase tracking-widest">+ Add Option</button>
          )}
        </div>
      )}

      {replyTo && (
        <div className="mb-6 p-4 rounded-2xl bg-primary/5 border border-primary/20 relative animate-in fade-in slide-in-from-left-4 duration-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
              <MessageSquare className="w-3 h-3" /> Replying to Thread
            </span>
            <button onClick={onCancelReply} className="p-1 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"><X className="w-4 h-4" /></button>
          </div>
          <p className="text-sm text-foreground/80 font-medium italic line-clamp-2 pl-4 border-l-2 border-primary/30">"{replyTo.content}"</p>
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); submit(); } }}
        placeholder={placeholder}
        maxLength={280}
        rows={4}
        className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/60 resize-none outline-none text-xl sm:text-2xl md:text-3xl mb-4 font-black tracking-tight leading-tight"
        autoFocus
      />

      {previews.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2 mb-6">
          {previews.map((url, i) => (
            <div key={url} className="relative rounded-2xl overflow-hidden group border border-border/50 aspect-square shadow-xl">
              <img src={url} alt="Preview" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
              <button onClick={() => removeFile(i)} className="absolute top-2 right-2 bg-black/60 backdrop-blur-md rounded-full p-2 text-white hover:bg-black/80 shadow-lg"><X className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between mt-6 gap-6 pt-6 border-t border-border/50">
        <div className="flex items-center gap-3">
          <button onClick={() => fileRef.current?.click()} className="flex items-center justify-center w-12 h-12 rounded-2xl bg-secondary text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all border border-border/50 shadow-lg active:scale-95" title="Upload Media"><ImagePlus className="w-6 h-6" /></button>
          <input ref={fileRef} type="file" accept="image/*,video/*" multiple onChange={handleFiles} className="hidden" />
        </div>

        <div className="flex items-center justify-end gap-3 sm:gap-5">
          <CharCountRing count={content.length} max={280} />
          <button onClick={submit} disabled={!content.trim() || submitting} className="relative px-6 sm:px-10 py-3 sm:py-4 rounded-xl sm:rounded-[1.5rem] text-sm sm:text-base font-black flex items-center gap-2 sm:gap-3 transition-all shadow-2xl active:scale-95 disabled:opacity-50 bg-primary text-primary-foreground hover:shadow-primary/30 group overflow-hidden">
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <> <span className="uppercase tracking-widest">Dump</span> <Send className="w-5 h-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" /> </>}
          </button>
        </div>
      </div>
      <p className="text-[11px] font-black text-muted-foreground/30 text-center sm:text-right mt-6 select-none uppercase tracking-widest">⌘↵ to post</p>
    </div>
  );
}
