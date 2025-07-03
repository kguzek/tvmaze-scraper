const now = () => new Date().toISOString();

/** Stub logging module if I ever want to add a more professional one in future. */
export const log = {
  info(...args: unknown[]) {
    console.info(now(), ...args);
  },

  warn(...args: unknown[]) {
    console.warn(now(), ...args);
  },

  error(...args: unknown[]) {
    console.error(now(), ...args);
  },
};
