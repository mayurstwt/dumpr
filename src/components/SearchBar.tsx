import { Search, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  onSearch: (query: string) => void;
  className?: string;
  initialValue?: string;
}

export function SearchBar({ onSearch, className, initialValue = '' }: SearchBarProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(value);
  };

  return (
    <form 
      onSubmit={handleSearch}
      className={cn("relative group max-w-md w-full", className)}
    >
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
      <input
        type="text"
        placeholder="Search the dump..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full bg-secondary/50 border border-border/50 rounded-full pl-10 pr-10 py-2 outline-none focus:border-primary/50 focus:bg-secondary/80 transition-all text-sm"
      />
      {value && (
        <button
          type="button"
          onClick={() => { setValue(''); onSearch(''); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </form>
  );
}
