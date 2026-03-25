import { writeBuildMeta } from './dist-build-meta.mjs';

const meta = await writeBuildMeta();
console.log(`[story-mode] wrote dist/build-meta.json at ${meta.builtAt}`);
