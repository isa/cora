import {
  compileThemePaletteFile,
  discoverExtensionThemePaletteFiles,
  discoverThemePaletteFiles,
} from './loader.js';
import { installThemeRegistryFromDisk, type DiagramThemeDefinition } from './registry.js';

export function loadThemesFromDisk(): DiagramThemeDefinition[] {
  const builtins = discoverThemePaletteFiles().map((file) => ({
    id: file.id,
    label: file.label,
    appearance: file.appearance,
    tokens: compileThemePaletteFile(file),
  }));

  const extensions = discoverExtensionThemePaletteFiles().map((file) => ({
    id: file.id,
    label: file.label,
    appearance: file.appearance,
    tokens: compileThemePaletteFile(file),
  }));

  return [...builtins, ...extensions];
}

export function hydrateThemeRegistryFromDisk(): void {
  installThemeRegistryFromDisk(loadThemesFromDisk());
}
