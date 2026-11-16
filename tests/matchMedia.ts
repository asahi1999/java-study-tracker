// jsdom には window.matchMedia がないので、テスト用の実装を用意する。
// OSのダークモード設定をテストから切り替えられるようにしている

type ChangeListener = (event: MediaQueryListEvent) => void;

const DARK_QUERY = '(prefers-color-scheme: dark)';

let systemPrefersDark = false;
const listeners = new Set<ChangeListener>();

export function installMatchMedia(): void {
  window.matchMedia = (query: string) => {
    const mediaQueryList = {
      get matches() {
        return query === DARK_QUERY && systemPrefersDark;
      },
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: ChangeListener) => {
        listeners.add(listener);
      },
      removeEventListener: (_type: string, listener: ChangeListener) => {
        listeners.delete(listener);
      },
      addListener: (listener: ChangeListener) => {
        listeners.add(listener);
      },
      removeListener: (listener: ChangeListener) => {
        listeners.delete(listener);
      },
      dispatchEvent: () => true,
    };
    return mediaQueryList as unknown as MediaQueryList;
  };
}

/** OSのダークモード設定が切り替わったことにする */
export function setSystemPrefersDark(value: boolean): void {
  systemPrefersDark = value;
  for (const listener of listeners) {
    listener({ matches: value, media: DARK_QUERY } as MediaQueryListEvent);
  }
}

export function resetMatchMedia(): void {
  systemPrefersDark = false;
  listeners.clear();
}
