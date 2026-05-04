import { EventEmitter } from 'events';

export type KeyEvent = {
  name: string;
  shift: boolean;
  ctrl: boolean;
  meta: boolean;
  code: string;
  sequence: string;
};

export type InputHandler = (key: KeyEvent) => void;

class InputManager {
  private static instance: InputManager | null = null;
  private emitter = new EventEmitter();
  private rawMode = false;
  private oldState: any = null;

  private constructor() {}

  static getInstance(): InputManager {
    if (!InputManager.instance) {
      InputManager.instance = new InputManager();
    }
    return InputManager.instance;
  }

  on(key: string, handler: InputHandler): void {
    this.emitter.on(key, handler);
  }

  off(key: string, handler: InputHandler): void {
    this.emitter.off(key, handler);
  }

  once(key: string, handler: InputHandler): void {
    this.emitter.once(key, handler);
  }

  emit(key: string, event: KeyEvent): void {
    this.emitter.emit(key, event);
  }

  enableRawMode(): void {
    if (this.rawMode) return;
    if (typeof process !== 'undefined' && process.stdin) {
      this.oldState = process.stdin.isRaw;
      (process.stdin as any).isRaw = true;
      process.stdin.resume();
      this.rawMode = true;
    }
  }

  disableRawMode(): void {
    if (!this.rawMode) return;
    if (typeof process !== 'undefined' && process.stdin) {
      (process.stdin as any).isRaw = false;
      process.stdin.pause();
      this.rawMode = false;
    }
  }
}

export const inputManager = InputManager.getInstance();
