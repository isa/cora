import type { ThemeTokens } from '../../layout-ir.js';
import { defaultTheme } from './default.js';
import { toDarkTheme } from './transforms.js';

export const darkTheme: ThemeTokens = toDarkTheme(defaultTheme);
