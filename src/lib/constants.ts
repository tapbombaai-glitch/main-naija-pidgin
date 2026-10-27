// Main Naija Pidgin — Shared Application Constants

export const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";

export const MAX_RECORDING_SECONDS = 60;

export const MAX_AUDIO_BYTES = 15 * 1024 * 1024;

export const SUPPORTED_LANGUAGES = [
  "pidgin",
  "hausa",
  "igbo",
  "yoruba",
] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];