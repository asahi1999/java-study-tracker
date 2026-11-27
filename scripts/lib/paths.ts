// リポジトリの中の場所（scripts/ から使う）
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { TEAVM_DIR } from '../../src/runtime/java/assets.ts';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PUBLIC_DIR = path.join(ROOT, 'public');
export const TEAVM_ASSET_DIR = path.join(PUBLIC_DIR, TEAVM_DIR);
export const JAVA_DIR = path.join(ROOT, 'java');
export const CONTENT_DIR = path.join(ROOT, 'content');
