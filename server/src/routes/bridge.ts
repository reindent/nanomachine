import express from 'express';
import bridgeService from '../services/bridgeService';

const router = express.Router();

/**
 * Send a prompt to the bridge
 * POST /api/bridge/prompt
 */
router.post('/prompt', async (req, res) => {
  try {
    const { task } = req.body;
    
    if (!task) {
      res.status(400).json({ error: 'Missing task parameter' });
      return;
    }
    
    const result = await bridgeService.sendPrompt(task);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error forwarding prompt to bridge:', error);
    res.status(500).json({ 
      error: 'Failed to send prompt to bridge',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get bridge connection status
 * GET /api/bridge/status
 */
router.get('/status', (req, res) => {
  let isConnected = false;
  
  // Use a promise to get the connection status
  const getStatus = new Promise<boolean>((resolve) => {
    const unsubscribe = bridgeService.onConnectionStatus((connected) => {
      isConnected = connected;
      unsubscribe();
      resolve(connected);
    });
  });
  
  // Wait for the status and respond
  getStatus.then(() => {
    res.status(200).json({
      connected: isConnected,
      bridgeUrl: process.env.BRIDGE_URL || 'http://localhost:8787'
    });
  });
});

export { router };
