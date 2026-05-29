export const SETTINGS_UPDATED_EVENT = "sts-settings-updated";

export function notifySettingsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SETTINGS_UPDATED_EVENT));
  }
}
