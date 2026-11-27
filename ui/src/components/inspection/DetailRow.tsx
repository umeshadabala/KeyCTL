import { cn } from '../../lib/cn';

interface DetailRowProps {
  label: string;
  value: string;
  mono?: boolean;
}

export function DetailRow({ label, value, mono = false }: DetailRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 px-3 py-2.5">
      <dt className="shrink-0 text-[#71717A]">{label}</dt>
      <dd className={cn('text-right text-[#F4F4F5]', mono && 'font-mono text-[11px]')}>
        {value}
      </dd>
    </div>
  );
}
