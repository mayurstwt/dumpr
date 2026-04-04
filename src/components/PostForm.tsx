import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LOCATIONS, type LocationTag } from '@/lib/weekend';
import { ImagePlus, Send, X } from 'lucide-react';
import { toast } from 'sonner';

interface PostFormProps {
  userId: string;
  onPosted: () => void;
}

export function PostForm({ userId, onPosted }: PostFormProps) {
  const [content, setContent] = useState('');
  const [location, setLocation] = useState<LocationTag>('Remote');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Honeypot
  const [honeypot, setHoneypot] = useState('');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      toast.error('Max file size is 10MB');
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!content.trim() || honeypot) return;
    setSubmitting(true);

    try {
      let media_url: string | null = null;

      if (file) {
        const ext = file.name.split('.').pop();
        const path = `${userId}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('weekend_media')
          .upload(path, file);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage
          .from('weekend_media')
          .getPublicUrl(path);
        media_url = urlData.publicUrl;
      }

      const { error } = await supabase.from('posts').insert({
        user_id: userId,
        content: content.trim(),
        media_url,
        location_tag: location,
      });

      if (error) throw error;
      setContent('');
      setFile(null);
      setPreview(null);
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

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What happened this weekend? 🍻"
        maxLength={280}
        rows={3}
        className="w-full bg-transparent text-foreground placeholder:text-muted-foreground resize-none outline-none text-base"
      />

      {preview && (
        <div className="relative mt-2 rounded-lg overflow-hidden">
          <img src={preview} alt="Preview" className="w-full max-h-48 object-cover rounded-lg" />
          <button
            onClick={() => { setFile(null); setPreview(null); }}
            className="absolute top-2 right-2 bg-background/80 rounded-full p-1"
          >
            <X className="w-4 h-4 text-foreground" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mt-3 gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <ImagePlus className="w-5 h-5" />
          </button>
          <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFile} className="hidden" />

          <select
            value={location}
            onChange={(e) => setLocation(e.target.value as LocationTag)}
            className="bg-secondary text-secondary-foreground text-xs rounded-lg px-2 py-1 outline-none border-none"
          >
            {LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground tabular-nums">
            {content.length}/280
          </span>
          <button
            onClick={submit}
            disabled={!content.trim() || submitting}
            className="bg-primary text-primary-foreground rounded-lg px-4 py-1.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
