export type WritableFileHandle = {
  name?: string;
  queryPermission?(descriptor: { mode: 'readwrite' }): Promise<PermissionState>;
  requestPermission?(descriptor: { mode: 'readwrite' }): Promise<PermissionState>;
  createWritable(): Promise<{
    write(data: string): Promise<void>;
    close(): Promise<void>;
  }>;
};

export type FilePickerWindow = Window & {
  showOpenFilePicker?: (options?: {
    multiple?: boolean;
    types?: Array<{
      description?: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<WritableFileHandle[]>;
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    types?: Array<{
      description?: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<WritableFileHandle>;
};

export const diagramPickerTypes = [
  {
    description: 'Diagram',
    accept: {
      'application/x-yaml': ['.yml', '.yaml'],
      'application/json': ['.json'],
    },
  },
] as const;

export function buildSuggestedSaveName(sourceName: string | undefined): string {
  return sourceName?.replace(/\.(json|yaml|yml)$/i, '.yml') || 'diagram.yml';
}

export function shouldAutosaveWorkbenchYaml(currentYaml: string, lastSavedYaml: string | null): boolean {
  return lastSavedYaml !== currentYaml;
}

/** Request write access in the same user gesture chain as showOpenFilePicker. */
export async function grantWriteAccessAfterOpen(handle: WritableFileHandle): Promise<boolean> {
  return ensureReadWritePermission(handle);
}

export async function writeYamlToFileHandle(handle: WritableFileHandle, yaml: string): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(yaml);
  await writable.close();
}

export async function ensureReadWritePermission(handle: WritableFileHandle): Promise<boolean> {
  if (typeof handle.queryPermission !== 'function' || typeof handle.requestPermission !== 'function') {
    return true;
  }

  const current = await handle.queryPermission({ mode: 'readwrite' });
  if (current === 'granted') {
    return true;
  }

  const requested = await handle.requestPermission({ mode: 'readwrite' });
  return requested === 'granted';
}

export async function pickDiagramFile(
  pickerWindow: FilePickerWindow,
): Promise<{ handle: WritableFileHandle; file: File } | null> {
  if (typeof pickerWindow.showOpenFilePicker !== 'function') {
    return null;
  }

  const [handle] = await pickerWindow.showOpenFilePicker({
    multiple: false,
    types: [...diagramPickerTypes],
  });
  const file = await getFileFromHandle(handle);
  return { handle, file };
}

export async function getFileFromHandle(handle: WritableFileHandle): Promise<File> {
  const withGetFile = handle as WritableFileHandle & { getFile(): Promise<File> };
  if (typeof withGetFile.getFile !== 'function') {
    throw new Error('Selected file handle cannot be read.');
  }
  return withGetFile.getFile();
}

export async function pickSaveDiagramFile(
  pickerWindow: FilePickerWindow,
  suggestedName: string,
): Promise<WritableFileHandle | null> {
  if (typeof pickerWindow.showSaveFilePicker !== 'function') {
    return null;
  }

  return pickerWindow.showSaveFilePicker({
    suggestedName,
    types: [...diagramPickerTypes],
  });
}
