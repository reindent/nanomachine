import express from 'express';
import { SystemStatus } from '../types';

const router = express.Router();

const mockSystemStatus: SystemStatus = {
  websocketStatus: 'connected',
  nanomachineClientVersion: '0.1.4',
  nanobrowserVersion: '1.2.0',
  serverStatus: 'online',
  activeSessions: 1
};

// GET system status
router.get('/', (req, res) => {
  res.json(mockSystemStatus);
});

// GET websocket status
router.get('/websocket', (req, res) => {
  res.json({ status: mockSystemStatus.websocketStatus });
});

// GET server status
router.get('/server', (req, res) => {
  res.json({ status: mockSystemStatus.serverStatus });
});

export { router };
