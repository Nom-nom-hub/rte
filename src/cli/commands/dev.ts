import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import React from 'react';
import { render } from '../../core/render.js';
import { getFrameStore } from '../../deterministic/frameStore.js';
import { DevMode } from '../components/DevMode.js';
import { SessionManager } from '../session/SessionManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runDev(file: string, options: { port: string; saveSession: boolean }) {
  const absolutePath = path.isAbsolute(file) ? file : path.resolve(process.cwd(), file);

  if (!fs.existsSync(absolutePath)) {
    console.error(`Error: File not found: ${absolutePath}`);
    process.exit(1);
  }

  const sessionManager = new SessionManager();
  sessionManager.setAppEntry(absolutePath);

  const module = await import(absolutePath);
  let AppComponent = module.default || module.App || module;

  if (!AppComponent) {
    console.error('Error: No default export found in file');
    process.exit(1);
  }

  console.log('\x1b[2J\x1b[0;H');
  console.log('\x1b[36mReact Terminal Engine - Dev Mode\x1b[0m');
  console.log('\x1b[90mLoading:', absolutePath, '\x1b[0m\n');

  const rootContainer = {
    children: [],
    __isTermContainer: true,
  };

  const instance = render(React.createElement(AppComponent), rootContainer);

  const devMode = new DevMode({
    sessionManager,
    saveSession: options.saveSession,
  });

  devMode.start();

  const cleanup = () => {
    instance.stop();
    devMode.stop();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}