declare module 'websockify' {
  export function websockify(
    webPort: number,
    target_host: string,
    target_port: number,
    options?: {
      cert?: string | null;
      key?: string | null;
      web_dir?: string | null;
    }
  ): void;
}
