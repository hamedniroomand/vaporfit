import { spawn } from 'node:child_process';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function eachSeries<T>(
  items: readonly T[],
  worker: (item: T) => Promise<void>,
): Promise<void> {
  const pending = [...items];
  const step = async (): Promise<void> => {
    const item = pending.shift();
    if (item === undefined) return;
    await worker(item);
    await step();
  };
  await step();
}

/** Runs a command. Rejects with the combined output when the exit code is not 0. */
export async function run(command: string, args: readonly string[], cwd: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', chunk => {
      output += String(chunk);
    });
    child.stderr.on('data', chunk => {
      output += String(chunk);
    });
    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) resolve();
      else {
        reject(
          new Error(`${command} ${args.join(' ')} failed in ${cwd} (exit ${code})\n${output}`),
        );
      }
    });
  });
}

export async function npmDistTags(name: string): Promise<Record<string, string>> {
  const spec = name.startsWith('@') ? name.replace('/', '%2f') : name;
  const response = await globalThis.fetch(`https://registry.npmjs.org/${spec}`);
  if (!response.ok) throw new Error(`npm ${name} returned ${response.status}`);
  const body: unknown = await response.json();
  if (!isRecord(body) || !isRecord(body['dist-tags'])) {
    throw new Error(`npm ${name} has no dist-tags`);
  }
  const tags: Record<string, string> = {};
  for (const [key, value] of Object.entries(body['dist-tags'])) {
    if (typeof value === 'string') tags[key] = value;
  }
  return tags;
}
