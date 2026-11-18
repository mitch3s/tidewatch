/** Everything that differs between running in a browser and on a webOS TV. */
export interface Platform {
  readonly name: 'browser' | 'webos';
  /** Keep the TV (or computer) from showing its own screensaver over the app. */
  keepAwake(): void;
  /** How keeping awake is going, for the debug readout. */
  keepAwakeStatus(): string;
  /** Called with `true` when the app is shown and `false` when hidden. */
  onVisibilityChange(cb: (visible: boolean) => void): void;
  /** Close the app. In a browser this is a no-op. */
  exitApp(): void;
}
