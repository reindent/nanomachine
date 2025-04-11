declare module 'novnc-core' {
  export class RFB {
    constructor(
      target: HTMLElement,
      url: string,
      options?: {
        credentials?: {
          password?: string;
        };
        shared?: boolean;
        repeaterID?: string;
        wsProtocols?: string[];
      }
    );
    
    disconnect(): void;
    sendCredentials(credentials: { password: string }): void;
    addEventListener(event: string, callback: (e?: any) => void): void;
    removeEventListener(event: string, callback: (e?: any) => void): void;
  }
}
