interface BrowserPage {
  document: { documentElement: { dataset: { theme?: string } } };
  location: { hash: string; replace: (url: string) => void };
  localStorage: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
  };
  matchMedia: (query: string) => { matches: boolean };
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
  setInterval: (listener: () => void, ms: number) => unknown;
}

export function browserPage(): BrowserPage {
  return globalThis as unknown as BrowserPage;
}
