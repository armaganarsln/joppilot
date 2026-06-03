import type { WorkspaceProject } from '../types';
import glarusFlag from '../assets/glarus.svg';
import zurichFlag from '../assets/zurich.svg';

/**
 * Official canton coats of arms (public-domain artwork from Wikimedia Commons):
 * - Zürich: per bend argent and azure.
 * - Glarus: red field with St. Fridolin.
 *
 * Rendered as <img> so the real vector artwork is used rather than an
 * approximation. The container is rounded/clipped to fit the app's badge style.
 */
const FLAG_SRC: Record<WorkspaceProject, string> = {
  zurich: zurichFlag,
  glarus: glarusFlag,
};

const FLAG_BG: Record<WorkspaceProject, string> = {
  zurich: '#0F47AF',
  glarus: '#E8403A',
};

export function CantonFlag({ project, className = 'w-8 h-8' }: { project: WorkspaceProject; className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center overflow-hidden ${className}`}
      style={{ backgroundColor: FLAG_BG[project] }}
    >
      <img
        src={FLAG_SRC[project]}
        alt={`Canton of ${project === 'glarus' ? 'Glarus' : 'Zürich'} coat of arms`}
        className="w-full h-full object-contain"
        draggable={false}
      />
    </span>
  );
}
