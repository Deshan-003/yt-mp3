import { writeFileSync } from 'node:fs';
writeFileSync('dist-electron/package.json', JSON.stringify({ type: 'commonjs' }));
