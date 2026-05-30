import type { WorkspaceProject } from '../types';

/**
 * Display names for vehicles, keyed by workspace then vehicle id.
 * Avoids the `id === 'v1' ? 'JÖP-01' : 'JÖP-02'` magic strings that were
 * duplicated across the teleop/assistance components (and were wrong for the
 * Glarus workspace, where they still showed the Zürich "JÖP" names).
 */
const VEHICLE_NAMES: Record<WorkspaceProject, Record<string, string>> = {
  zurich: { v1: 'JÖP-01', v2: 'JÖP-02' },
  glarus: { v1: 'GL-01', v2: 'GL-02' },
};

export function vehicleName(
  vehicleId: string,
  project: WorkspaceProject = 'zurich',
): string {
  return VEHICLE_NAMES[project]?.[vehicleId] ?? vehicleId.toUpperCase();
}
