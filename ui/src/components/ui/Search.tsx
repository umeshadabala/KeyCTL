import { forwardRef } from 'react';
import { Search as SearchIcon, X } from 'lucide-react';
import { cn } from '../../lib/cn';

interface SearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  shortcutHint?: string;
  ariaLabel?: string;
}

export const Search = forwardRef<HTMLInputElement, SearchProps>(function Search(
  {
    value,
    onChange,
    placeholder = 'Search events, identities, services...',
    className,
    shortcutHint = '/',
    ariaLabel = 'Search security telemetry',
  },
  ref,
) {
  return (
    <div className={cn('relative flex items-center', className)}>
      <SearchIcon
        aria-hidden="true"
        className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-[#71717A]"
      />
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="h-8 w-full rounded-md border border-[#27272A] bg-[#090A0B] pl-8 pr-11 text-xs text-[#F4F4F5] placeholder:text-[#71717A] transition-colors focus:border-[#52525B] focus:bg-[#141517] focus:outline-none"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2 rounded p-0.5 text-[#71717A] transition-colors hover:bg-[#19191C] hover:text-[#F4F4F5]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : shortcutHint ? (
        <kbd className="pointer-events-none absolute right-2 rounded border border-[#27272A] bg-[#141517] px-1.5 py-0.5 font-mono text-[10px] text-[#71717A]">
          {shortcutHint}
        </kbd>
      ) : null}
    </div>
  );
});
