import fs from 'fs';
import path from 'path';
import { Frame } from '../../renderer/frameBuffer.js';
import type { UpdateReason } from '../../deterministic/causality.js';

export interface SessionFrame {
  tree: any;
  buffer: any;
  hash: string;
  timestamp: number;
  index: number;
  updates?: UpdateReason[];
}

export interface SessionMetadata {
  createdAt: number;
  totalFrames: number;
  appEntry: string;
  rteVersion: string;
}

export interface Session {
  version: string;
  id: string;
  filename: string;
  frames: SessionFrame[];
  metadata: SessionMetadata;
}

export class SessionManager {
  private sessionsDir: string;
  private currentSession: Session | null = null;
  private currentFrameIndex: number = 0;
  private appEntry: string = 'unknown';

  constructor() {
    this.sessionsDir = path.join(process.cwd(), '.rte', 'sessions');
    this.ensureSessionsDir();
  }

  setAppEntry(entry: string): void {
    this.appEntry = entry;
  }

  private ensureSessionsDir(): void {
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  startNewSession(filename: string): Session {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.currentSession = {
      version: '1.1',
      id,
      filename,
      frames: [],
      metadata: {
        createdAt: Date.now(),
        totalFrames: 0,
        appEntry: this.appEntry,
        rteVersion: '1.1.0',
      },
    };
    this.currentFrameIndex = 0;
    return this.currentSession;
  }

  addFrame(frame: Frame): void {
    if (!this.currentSession) {
      this.startNewSession('unknown');
    }

    const sessionFrame: SessionFrame = {
      tree: frame.tree,
      buffer: frame.buffer,
      hash: frame.hash,
      timestamp: Date.now(),
      index: this.currentSession!.frames.length,
      updates: frame.updates,
    };

    this.currentSession!.frames.push(sessionFrame);
    this.currentSession!.metadata.totalFrames = this.currentSession!.frames.length;
    this.currentFrameIndex = this.currentSession!.frames.length - 1;
  }

  saveSession(): string | null {
    if (!this.currentSession || this.currentSession.frames.length === 0) {
      return null;
    }

    const filename = `session-${this.currentSession.id}.json`;
    const filepath = path.join(this.sessionsDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(this.currentSession, null, 2));
    console.log(`\x1b[32mSession saved: ${filepath}\x1b[0m`);

    return filepath;
  }

  loadSession(filepath: string): Session {
    const content = fs.readFileSync(filepath, 'utf-8');
    const session = JSON.parse(content) as Session;
    this.currentSession = session;
    this.currentFrameIndex = 0;
    return session;
  }

  getCurrentSession(): Session | null {
    return this.currentSession;
  }

  getCurrentFrameIndex(): number {
    return this.currentFrameIndex;
  }

  setCurrentFrameIndex(index: number): void {
    if (this.currentSession) {
      if (index >= 0 && index < this.currentSession.frames.length) {
        this.currentFrameIndex = index;
      }
    }
  }

  getFrameAt(index: number): SessionFrame | null {
    if (!this.currentSession) return null;
    if (index < 0 || index >= this.currentSession.frames.length) return null;
    return this.currentSession.frames[index];
  }

  getTotalFrames(): number {
    return this.currentSession?.frames.length || 0;
  }

  listSessions(): string[] {
    this.ensureSessionsDir();
    return fs.readdirSync(this.sessionsDir)
      .filter(f => f.startsWith('session-') && f.endsWith('.json'))
      .map(f => path.join(this.sessionsDir, f));
  }

  nextFrame(): SessionFrame | null {
    if (!this.currentSession) return null;
    if (this.currentFrameIndex < this.currentSession.frames.length - 1) {
      this.currentFrameIndex++;
      return this.currentSession.frames[this.currentFrameIndex];
    }
    return null;
  }

  previousFrame(): SessionFrame | null {
    if (!this.currentSession) return null;
    if (this.currentFrameIndex > 0) {
      this.currentFrameIndex--;
      return this.currentSession.frames[this.currentFrameIndex];
    }
    return null;
  }
}