import { spawn } from 'node:child_process';

export function runChildProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { ...options, windowsHide: true });
    const stderr = [];
    child.stderr?.on('data', (chunk) => stderr.push(Buffer.from(chunk)));
    child.once('error', reject);
    child.once('close', (exitCode, signal) => {
      resolve({
        exitCode,
        signal,
        stderr: Buffer.concat(stderr).toString('utf8'),
      });
    });
  });
}
