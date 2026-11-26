import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { vendorFiles } from './vendor.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const destination = path.join(root, 'dist');
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await cp(path.join(root, 'public'), destination, { recursive: true });
await cp(path.join(root, 'index.html'), path.join(destination, 'index.html'));
await mkdir(path.join(destination, 'vendor'), { recursive: true });
await Promise.all(Object.entries(vendorFiles).map(([name, source]) =>
  cp(path.join(root, source), path.join(destination, 'vendor', name))
));
console.log('Built static First Run landing page in dist/');
