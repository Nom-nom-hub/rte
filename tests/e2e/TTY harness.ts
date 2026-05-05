import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { EventEmitter } from 'events';

export interface TerminalSnapshot {
  output: string;
  lines: string[];
  cursorPosition: { x: number; y: number };
  timestamp: number;
}

let pty: any = null;
try {
  pty = require('node-pty');
} catch (e) {
  console.log('  [info] node-pty not available, using fallback mode');
}

export class TTYHarness extends EventEmitter {
  private fallbackProcess: ChildProcessWithoutNullStreams | null = null;
  private outputBuffer: string = '';
  private cols: number = 80;
  private rows: number = 24;
  private usePty: boolean = false;
  private ptyProcess: any = null;

  constructor(cols = 80, rows = 24) {
    super();
    this.cols = cols;
    this.rows = rows;
    this.usePty = !!pty;
  }

  async start(command: string, args: string[] = [], env: Record<string, string> = {}): Promise<void> {
    if (this.usePty && pty) {
      return this.startPty(command, args, env);
    }
    return this.startFallback(command, args, env);
  }

  private async startPty(command: string, args: string[], env: Record<string, string>): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
        const shellArgs = process.platform === 'win32' ? [] : ['-c'];

        this.ptyProcess = pty.spawn(shell, [...shellArgs, `${command} ${args.join(' ')}`], {
          name: 'xterm-color',
          cols: this.cols,
          rows: this.rows,
          env: {
            ...process.env,
            TERM: 'xterm-256color',
            FORCE_COLOR: '1',
            ...env,
          },
        });

        this.ptyProcess.onData((data: string) => {
          this.outputBuffer += data;
          this.emit('data', data);
        });

        this.ptyProcess.onExit(({ exitCode }: { exitCode: number }) => {
          this.emit('exit', exitCode);
        });

        setTimeout(() => resolve(), 500);
      } catch (err) {
        reject(err);
      }
    });
  }

  private async startFallback(command: string, args: string[], env: Record<string, string>): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const fullCommand = args.length > 0 ? `${command} ${args.join(' ')}` : command;
        this.fallbackProcess = spawn(fullCommand, {
          shell: true,
          env: { ...process.env, FORCE_COLOR: '1' },
        });

        this.fallbackProcess.stdout?.on('data', (data) => {
          const str = data.toString();
          this.outputBuffer += str;
          this.emit('data', str);
        });

        this.fallbackProcess.stderr?.on('data', (data) => {
          this.outputBuffer += data.toString();
        });

        this.fallbackProcess.on('close', () => {
          this.emit('exit', 0);
        });

        setTimeout(() => resolve(), 300);
      } catch (err) {
        reject(err);
      }
    });
  }

  async waitForReady(timeout = 5000): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, 500);
    });
  }

  write(data: string): void {
    if (this.usePty && this.ptyProcess) {
      this.ptyProcess.write(data);
    } else if (this.fallbackProcess) {
      this.fallbackProcess.stdin?.write(data);
    }
  }

  sendKey(key: string): void {
    const keyMap: Record<string, string> = {
      'enter': '\r',
      'tab': '\t',
      'escape': '\x1b',
      'ctrl-c': '\x03',
      'up': '\x1b[A',
      'down': '\x1b[B',
      'left': '\x1b[D',
      'right': '\x1b[C',
    };
    this.write(keyMap[key] || key);
  }

  resize(cols: number, rows: number): void {
    this.cols = cols;
    this.rows = rows;
    if (this.usePty && this.ptyProcess) {
      this.ptyProcess.resize(cols, rows);
    }
  }

  captureSnapshot(): TerminalSnapshot {
    const lines = this.outputBuffer.split('\n').filter(l => l.length > 0);
    const cursorMatch = this.outputBuffer.match(/\x1b\[(\d+);(\d+)H/);
    const cursorPosition = cursorMatch
      ? { x: parseInt(cursorMatch[2], 10), y: parseInt(cursorMatch[1], 10) }
      : { x: 1, y: 1 };

    return {
      output: this.outputBuffer,
      lines,
      cursorPosition,
      timestamp: Date.now(),
    };
  }

  getOutput(): string {
    return this.outputBuffer;
  }

  clear(): void {
    this.outputBuffer = '';
  }

  kill(): void {
    if (this.ptyProcess) {
      this.ptyProcess.kill();
      this.ptyProcess = null;
    }
    if (this.fallbackProcess) {
      this.fallbackProcess.kill();
      this.fallbackProcess = null;
    }
  }

  getLines(): string[] {
    return this.outputBuffer.split('\n');
  }

  waitForOutput(pattern: string | RegExp, timeout = 3000): Promise<boolean> {
    return new Promise((resolve) => {
      const check = () => {
        const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
        if (regex.test(this.outputBuffer)) {
          resolve(true);
          return;
        }
        if (timeout <= 0) {
          resolve(false);
          return;
        }
        setTimeout(check, 50);
        timeout -= 50;
      };
      setTimeout(check, 50);
    });
  }
}

export class CLIProcess {
  private process: ChildProcessWithoutNullStreams | null = null;
  private stdout: string = '';
  private stderr: string = '';

  async run(command: string, args: string[] = [], cwd?: string): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      this.process = spawn(command, args, {
        cwd: cwd || process.cwd(),
        env: { ...process.env, FORCE_COLOR: '1' },
        timeout: 15000,
      });

      this.stdout = '';
      this.stderr = '';

      this.process.stdout?.on('data', (data) => {
        this.stdout += data.toString();
      });

      this.process.stderr?.on('data', (data) => {
        this.stderr += data.toString();
      });

      this.process.on('close', (code) => {
        resolve({
          exitCode: code || 0,
          stdout: this.stdout,
          stderr: this.stderr,
        });
      });

      this.process.on('error', (err) => {
        reject(err);
      });

      setTimeout(() => {
        if (!this.process?.killed) {
          this.process?.kill();
        }
      }, 15000);
    });
  }

  kill(): void {
    if (this.process) {
      this.process.kill();
    }
  }
}

export function compareSnapshots(a: TerminalSnapshot, b: TerminalSnapshot): { equal: boolean; diff: string[] } {
  const diff: string[] = [];

  if (a.lines.length !== b.lines.length) {
    diff.push(`Line count mismatch: ${a.lines.length} vs ${b.lines.length}`);
  }

  const maxLines = Math.max(a.lines.length, b.lines.length);
  for (let i = 0; i < maxLines; i++) {
    if (a.lines[i] !== b.lines[i]) {
      diff.push(`Line ${i}: "${a.lines[i]}" vs "${b.lines[i]}"`);
    }
  }

  return {
    equal: diff.length === 0,
    diff,
  };
}