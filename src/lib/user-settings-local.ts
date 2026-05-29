import fs from "fs/promises";
import path from "path";

import type { SiteTheme } from "@/lib/theme";

const settingsPath = path.join(process.cwd(), "data", "user-settings.json");

export type LocalUserSettings = {
  displayName: string | null;
  theme: SiteTheme;
};

type SettingsFile = Record<string, LocalUserSettings>;

const DEFAULT_SETTINGS: LocalUserSettings = {
  displayName: null,
  theme: "dark",
};

async function ensureSettingsFile() {
  try {
    await fs.access(settingsPath);
  } catch {
    await fs.mkdir(path.dirname(settingsPath), { recursive: true });
    await fs.writeFile(settingsPath, "{}\n", "utf-8");
  }
}

async function readSettingsFile(): Promise<SettingsFile> {
  await ensureSettingsFile();
  const raw = await fs.readFile(settingsPath, "utf-8");
  return JSON.parse(raw) as SettingsFile;
}

async function writeSettingsFile(settings: SettingsFile) {
  await fs.mkdir(path.dirname(settingsPath), { recursive: true });
  await fs.writeFile(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf-8");
}

export async function getLocalUserSettings(userId: string): Promise<LocalUserSettings> {
  const settings = await readSettingsFile();
  return settings[userId] ?? DEFAULT_SETTINGS;
}

export async function updateLocalUserSettings(
  userId: string,
  patch: Partial<LocalUserSettings>
): Promise<LocalUserSettings> {
  const settings = await readSettingsFile();
  const current = settings[userId] ?? DEFAULT_SETTINGS;
  const next = { ...current, ...patch };
  settings[userId] = next;
  await writeSettingsFile(settings);
  return next;
}
