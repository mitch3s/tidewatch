/** Everything that differs between running in a browser and on a webOS TV. */
export interface Platform {
  readonly name: 'browser' | 'webos';
  /**
   * Keep the TV from showing its own screensaver over the app.
   * TODO (Milestone 8.2): investigate the right webOS approach on a real TV.
   */
  keepAwake(): void;
  /** Called with `true` when the app is shown and `false` when hidden. */
  onVisibilityChange(cb: (visible: boolean) => void): void;
  /** Close the app. In a browser this is a no-op. */
  exitApp(): void;
}
