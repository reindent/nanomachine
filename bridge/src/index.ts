/**
 * Nanomachine
 * 
 * Copyright (c) 2025-present Reindent LLC
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */


// Prevent errors from crashing the bridge
import ErrorShield from './lib/ErrorShield';
new ErrorShield();

// Start the API server
import { startServer } from './server';
startServer();
