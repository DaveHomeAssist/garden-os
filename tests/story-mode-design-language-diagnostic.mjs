import { spawn } from 'node:child_process';

function escapeWorkflowCommand(value) {
  return String(value)
    .replaceAll('%', '%25')
    .replaceAll('\r', '%0D')
    .replaceAll('\n', '%0A');
}

const child = spawn(
  process.execPath,
  ['tests/story-mode-design-language-regression.mjs'],
  {
    cwd: process.cwd(),
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  },
);

let stdout = '';
let stderr = '';

child.stdout.on('data', (chunk) => {
  const text = chunk.toString();
  stdout += text;
  process.stdout.write(text);
});

child.stderr.on('data', (chunk) => {
  const text = chunk.toString();
  stderr += text;
  process.stderr.write(text);
});

child.on('error', (error) => {
  console.error(`::error title=Design-language gate launch failure::${escapeWorkflowCommand(error.stack ?? error.message)}`);
  process.exitCode = 1;
});

child.on('close', (code, signal) => {
  if (code === 0) return;

  const detail = stderr.trim()
    || stdout.trim()
    || `Process exited with code ${code ?? 'unknown'}${signal ? ` and signal ${signal}` : ''}.`;
  console.error(`::error title=Story Mode design-language viewport gate::${escapeWorkflowCommand(detail.slice(-6000))}`);
  process.exitCode = code ?? 1;
});
