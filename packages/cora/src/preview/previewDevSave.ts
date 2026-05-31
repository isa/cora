export type PreviewServerSaveWindow = Window & {
  __CORA_PREVIEW_WORKSPACE__?: string;
};

export const PREVIEW_DIAGRAMS_DIR = 'examples';

export function displayNameForWorkspaceDiagram(diagramPath: string): string {
  const segments = diagramPath.split(/[/\\]/);
  return segments[segments.length - 1] ?? diagramPath;
}

export function folderPathForWorkspaceDiagram(diagramPath: string): string | null {
  const normalized = diagramPath.replace(/\\/g, '/');
  const lastSlash = normalized.lastIndexOf('/');
  if (lastSlash <= 0) {
    return null;
  }
  return normalized.slice(0, lastSlash);
}

export function defaultWorkspaceDiagramPath(
  diagramsDir: string = PREVIEW_DIAGRAMS_DIR,
  fileName: string = 'diagram.yml',
): string {
  const normalizedName = fileName.replace(/^[/\\]+/, '');
  return `${diagramsDir.replace(/[/\\]+$/, '')}/${normalizedName}`.replace(/\\/g, '/');
}

export interface WorkspaceDiagramGroup {
  folder: string;
  paths: string[];
}

export function groupWorkspaceDiagramsByFolder(paths: string[]): WorkspaceDiagramGroup[] {
  const groups = new Map<string, string[]>();

  for (const path of paths) {
    const folder = folderPathForWorkspaceDiagram(path) ?? '';
    const list = groups.get(folder) ?? [];
    list.push(path);
    groups.set(folder, list);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([folder, folderPaths]) => ({
      folder,
      paths: folderPaths.sort((left, right) =>
        displayNameForWorkspaceDiagram(left).localeCompare(displayNameForWorkspaceDiagram(right)),
      ),
    }));
}

export interface PreviewServerConfig {
  workspace: string;
  diagramsDir: string;
  defaultSavePath: string;
  openPath: string | null;
}

export function getPreviewWorkspace(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  const workspace = (window as PreviewServerSaveWindow).__CORA_PREVIEW_WORKSPACE__;
  return typeof workspace === 'string' && workspace.length > 0 ? workspace : undefined;
}

export async function fetchPreviewServerConfig(): Promise<PreviewServerConfig | null> {
  const response = await fetch('/__cora/preview/config');
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as PreviewServerConfig;
}

export async function fetchWorkspaceDiagrams(): Promise<string[]> {
  const response = await fetch('/__cora/preview/diagrams');
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Could not list workspace diagrams (${response.status}).`);
  }
  const json = (await response.json()) as { paths: string[] };
  return json.paths;
}

export async function fetchPreviewServerSource(
  diagramPath: string,
): Promise<{ path: string; name: string; content: string }> {
  const response = await fetch(
    `/__cora/preview/source?path=${encodeURIComponent(diagramPath)}`,
  );
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Could not load diagram (${response.status}).`);
  }
  return (await response.json()) as { path: string; name: string; content: string };
}

export async function saveYamlViaPreviewServer(
  diagramPath: string,
  yaml: string,
): Promise<{ path: string; name: string }> {
  const response = await fetch('/__cora/preview/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: diagramPath, yaml }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Could not save diagram (${response.status}).`);
  }

  return (await response.json()) as { path: string; name: string };
}
