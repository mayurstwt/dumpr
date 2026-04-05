import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LOCATIONS, type LocationTag } from '@/lib/weekend';
import { ImagePlus, Send, X, Search, Sparkles, Moon, Sun, Wind, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import imageCompression from 'browser-image-compression';

interface PostFormProps {
  userId: string;
  onPosted: () => void;
  replyTo?: { id: string; content: string };
  onCancelReply?: () => void;
}

export function PostForm({ userId, onPosted, replyTo, onCancelReply }: PostFormProps) {
  const [content, setContent] = useState(() => localStorage.getItem('weekend_draft') || '');
  const [location, setLocation] = useState<LocationTag>('Remote');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [showGifSearch, setShowGifSearch] = useState(false);
  const [vibe, setVibe] = useState('glass');
  const [submitting, setSubmitting] = useState(false);
  const [drink, setDrink] = useState(() => localStorage.getItem('weekend_drink') || 'Beer');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('weekend_draft', content);
  }, [content]);

  // Honeypot & Captcha
  const [honeypot, setHoneypot] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaExpected, setCaptchaExpected] = useState(0);
  const [captchaQuestion, setCaptchaQuestion] = useState('');

  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    setCaptchaQuestion(`${num1} + ${num2} = `);
    setCaptchaExpected(num1 + num2);
    setCaptchaAnswer('');
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    if (files.length + selectedFiles.length > 4) {
      toast.error('Max 4 files allowed');
      return;
    }

    const validFiles = selectedFiles.filter(f => f.size <= 10 * 1024 * 1024);
    if (validFiles.length < selectedFiles.length) {
      toast.error('Some files were too large (max 10MB)');
    }

    setFiles(prev => [...prev, ...validFiles]);
    setPreviews(prev => [...prev, ...validFiles.map(f => URL.createObjectURL(f))]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const submit = async () => {
    if (!content.trim() || honeypot) return;
    
    if (parseInt(captchaAnswer) !== captchaExpected) {
      toast.error('Incorrect math validation. Bots not allowed. 🤖');
      generateCaptcha();
      return;
    }

    setSubmitting(true);

    try {
      let media_urls: string[] = [];

      if (files.length > 0) {
        for (const file of files) {
          let fileToUpload = file;
          // Apply compression only to images, videos bypass
          if (file.type.startsWith('image/')) {
            try {
              fileToUpload = await imageCompression(file, {
                maxSizeMB: 0.5,
                maxWidthOrHeight: 1080,
                useWebWorker: true,
                initialQuality: 0.7,
              });
            } catch (err) {
              console.error("Compression error:", err);
            }
          }

          const ext = file.name.split('.').pop();
          const path = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
          const { error: uploadErr } = await supabase.storage
            .from('weekend_media')
            .upload(path, fileToUpload, { cacheControl: '3600', upsert: false });
          if (uploadErr) throw uploadErr;
          const { data: urlData } = supabase.storage
            .from('weekend_media')
            .getPublicUrl(path);
          media_urls.push(urlData.publicUrl);
        }
      }

      const finalContent = replyTo
        ? `>>[${replyTo.id}] ${content.trim()}`
        : content.trim();

      const { error } = await supabase.from('posts').insert({
        user_id: userId,
        content: finalContent,
        media_url: media_urls.length > 0 ? JSON.stringify(media_urls) : null,
        location_tag: vibe, // Reusing location_tag as 'vibe' for now to avoid migration
      });

      if (error) throw error;
      setContent('');
      localStorage.removeItem('weekend_draft');
      setFiles([]);
      setPreviews([]);
      generateCaptcha();
      onPosted();
      toast.success('Dumped! 🍺');
    } catch (err: any) {
      toast.error(err.message || 'Failed to post');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 neon-border">
      {/* Honeypot - hidden from humans */}
      <input
        type="text"
        name="website"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        className="absolute opacity-0 h-0 w-0 pointer-events-none"
        aria-hidden="true"
      />

      <div className="flex items-center justify-between mb-4 px-1">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold italic opacity-50">
          Weekend Mode: ON
        </div>
      </div>

      {replyTo && (
        <div className="flex items-center justify-between mb-2 px-2 py-1 bg-secondary rounded-md text-xs">
          <span className="text-muted-foreground truncate max-w-[80%]">
            Replying to: <span className="text-foreground italic">"{replyTo.content}"</span>
          </span>
          <button onClick={onCancelReply} className="text-muted-foreground hover:text-foreground">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What happened this weekend? 🍻"
        maxLength={280}
        rows={3}
        className="w-full bg-transparent text-foreground placeholder:text-muted-foreground resize-none outline-none text-base"
      />

      {previews.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          {previews.map((url, i) => (
            <div key={url} className="relative rounded-lg overflow-hidden group">
              <img src={url} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
              <button
                onClick={() => removeFile(i)}
                className="absolute top-1 right-1 bg-background/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 text-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showGifSearch && (
        <div className="mt-3 p-3 border border-border rounded-lg bg-secondary/20 animate-in fade-in slide-in-from-top-2">
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search GIFs..."
                className="w-full bg-background border border-border rounded-md pl-8 pr-3 py-1.5 text-sm outline-none focus:border-primary/50"
                autoFocus
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 h-32 overflow-y-auto pr-1 custom-scrollbar">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-square bg-muted rounded animate-pulse" />
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            Giphy integration coming soon... 🔜
          </p>
        </div>
      )}

      <div className="flex items-center justify-between mt-3 gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="text-muted-foreground hover:text-primary transition-colors p-1.5 rounded-full hover:bg-secondary"
            title="Upload Media"
          >
            <ImagePlus className="w-5 h-5" />
          </button>
          <input ref={fileRef} type="file" accept="image/*,video/*" multiple onChange={handleFiles} className="hidden" />

          <button
            onClick={() => setShowGifSearch(!showGifSearch)}
            className={cn(
              "text-xs font-bold px-2 py-1 rounded border transition-all",
              showGifSearch ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground border-border hover:border-primary/50"
            )}
          >
            GIF
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 ml-2 border bg-secondary/20 rounded-full px-3 py-1">
            <span className="text-xs text-muted-foreground whitespace-nowrap font-medium select-none">
              {captchaQuestion}
            </span>
            <input 
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={captchaAnswer}
              onChange={(e) => setCaptchaAnswer(e.target.value)}
              className="w-8 bg-transparent text-xs font-bold outline-none text-primary"
              placeholder="?"
              required
            />
          </div>

          <span className="text-xs text-muted-foreground tabular-nums">
            {content.length}/280
          </span>
          <button
            onClick={submit}
            disabled={!content.trim() || submitting}
            className="bg-primary text-primary-foreground rounded-lg px-4 py-1.5 text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {submitting ? '' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
