import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Inbox, Loader2 } from 'lucide-react';

/** A single shimmer placeholder bar. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-lg ${className}`} aria-hidden="true" />;
}

/** A grid of skeleton cards for list/card views while data loads. */
export function SkeletonCards({ count = 4, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`} role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white border border-joppli-grey rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="flex-1 flex flex-col gap-2">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-2.5 w-1/3" />
            </div>
          </div>
          <Skeleton className="h-2.5 w-full" />
          <Skeleton className="h-2.5 w-4/5" />
        </div>
      ))}
    </div>
  );
}

/** Centered spinner with a label, for full-panel loading. */
export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="py-16 flex flex-col items-center justify-center text-joppli-dark/50" role="status">
      <Loader2 className="w-8 h-8 animate-spin mb-3 text-joppli-blue" />
      <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
    </div>
  );
}

/** Friendly empty state with an icon, title, optional hint and action. */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  hint,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="py-16 flex flex-col items-center justify-center text-center border border-dashed border-joppli-grey rounded-2xl bg-white/40">
      <div className="w-12 h-12 rounded-full bg-joppli-grey/40 flex items-center justify-center text-joppli-dark/40 mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <span className="text-sm font-extrabold uppercase tracking-widest text-joppli-dark/70">{title}</span>
      {hint && <p className="text-xs text-joppli-dark/45 font-medium mt-1 max-w-xs">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
