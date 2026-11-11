import process from 'node:process';

export interface CliIo {
  cwd: string;
  stdout: (text: string) => void;
  stderr: (text: string) => void;
  color: boolean;
}

export function processIo(): CliIo {
  const noColor = process.env.NO_COLOR !== undefined && process.env.NO_COLOR !== '';
  return {
    color: process.stdout.isTTY === true && !noColor,
    cwd: process.cwd(),
    stderr: text => {
      process.stderr.write(text);
    },
    stdout: text => {
      process.stdout.write(text);
    },
  };
}
