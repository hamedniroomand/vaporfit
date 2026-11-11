import type { CliIo } from '#cli/io.ts';

export function captureIo(cwd: string): CliIo & {
  output: () => string;
  errors: () => string;
} {
  let out = '';
  let err = '';
  return {
    color: false,
    cwd,
    errors: () => err,
    output: () => out,
    stderr: text => {
      err += text;
    },
    stdout: text => {
      out += text;
    },
  };
}
