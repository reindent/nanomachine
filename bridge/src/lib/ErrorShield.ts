/**
 * Error Shield – Library to keep your app running even when errors occur
 * 
 * Provides graceful error handling and process lifecycle management
 * for Node.js applications.
 * 
 * Copyright (c) 2025-present Reindent LLC
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export default
class ErrorShield {
  constructor() {
    console.log('🛡️ App shield initialized');

    process.on('SIGINT', () => {
      console.log('🛡️👋 App exited gracefully');
      process.exit(0);
    });

    process.on('uncaughtException', (error: Error) => {
      const timestamp = new Date().toISOString();
      console.error(`🛡️❌ [${timestamp}] Uncaught Exception:`, error);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      const timestamp = new Date().toISOString();
      console.error(`🛡️⚠️ [${timestamp}] Unhandled Promise Rejection:`, reason);
    });

    process.on('beforeExit', (code: number) => {
      const emoji = code === 0 ? '🟢' : '🔴';
      console.log(`🛡️${emoji} About to exit with code: ${code}`);
    });
    
    process.on('exit', (code: number) => {
      const emoji = code === 0 ? '🟢' : '🔴';
      console.log(`🛡️${emoji} Exit with code: ${code}`);
    });
  }
}
