/**
 * Collaboration Server Entry Point
 *
 * Starts the Hocuspocus WebSocket server for real-time collaboration
 */

import 'dotenv/config';
import server from './collaboration';

// Start the server
server.listen();

console.log('[Hocuspocus] Server is running!');
console.log(`[Hocuspocus] WebSocket URL: ws://localhost:${server.configuration.port}`);
console.log('[Hocuspocus] Press Ctrl+C to stop');
