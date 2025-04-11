declare module '@novnc/novnc' {
  export class RFB {
    constructor(
      target: HTMLElement,
      url: string,
      options?: {
        credentials?: {
          password?: string;
        };
      }
    );
    
    disconnect(): void;
    sendCredentials(credentials: { password: string }): void;
    addEventListener(event: string, callback: (e?: any) => void): void;
    removeEventListener(event: string, callback: (e?: any) => void): void;
  }
}

declare module '@novnc/novnc/lib/websock' {
  // Type declarations for WebUtil
  export function init_logging(): void;
  export function get_include_uri(): string;
}
