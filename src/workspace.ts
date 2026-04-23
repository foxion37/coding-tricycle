import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type EventRecord = {
  type: string;
  createdAt: string;
} & Record<string, unknown>;

export interface StateRecord {
  goal?: string;
  planPath?: string;
  lastCommand?: string;
  lastResult?: string;
  verification?: string;
  nextAction?: string;
  updatedAt?: string;
}

export function workspaceDir(cwd = process.cwd()): string {
  return join(cwd, ".tricycle");
}

export function ensureWorkspace(cwd = process.cwd()): string {
  const dir = workspaceDir(cwd);
  mkdirSync(join(dir, "plans"), { recursive: true });

  const configPath = join(dir, "config.json");
  if (!existsSync(configPath)) {
    writeFileSync(configPath, `${JSON.stringify({ version: 1, createdAt: new Date().toISOString() }, null, 2)}\n`);
  }

  const eventsPath = join(dir, "events.jsonl");
  if (!existsSync(eventsPath)) {
    writeFileSync(eventsPath, "");
  }

  const statePath = join(dir, "state.json");
  if (!existsSync(statePath)) {
    writeFileSync(statePath, `${JSON.stringify({ updatedAt: new Date().toISOString() }, null, 2)}\n`);
  }

  return dir;
}

export function appendEvent(event: { type: string } & Record<string, unknown>, cwd = process.cwd()): EventRecord {
  ensureWorkspace(cwd);
  const record: EventRecord = { ...event, createdAt: new Date().toISOString() };
  appendFileSync(join(workspaceDir(cwd), "events.jsonl"), `${JSON.stringify(record)}\n`);
  return record;
}

export function readState(cwd = process.cwd()): StateRecord {
  const statePath = join(workspaceDir(cwd), "state.json");
  if (!existsSync(statePath)) return {};
  return JSON.parse(readFileSync(statePath, "utf8")) as StateRecord;
}

export function writeState(next: StateRecord, cwd = process.cwd()): StateRecord {
  ensureWorkspace(cwd);
  const state = { ...next, updatedAt: new Date().toISOString() };
  writeFileSync(join(workspaceDir(cwd), "state.json"), `${JSON.stringify(state, null, 2)}\n`);
  return state;
}

export function updateState(patch: StateRecord, cwd = process.cwd()): StateRecord {
  const current = readState(cwd);
  return writeState({ ...current, ...patch }, cwd);
}
