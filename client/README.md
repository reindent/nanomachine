# Nanomachine Client

The Nanomachine Client is a React-based web application that serves as the user interface for the Nanomachine AI agent dashboard. It provides a modern, intuitive interface for interacting with AI agents that control Virtual Cloud Network (VCN) connections.

## Architecture Overview

The client application is built with React and TypeScript, using a component-based architecture with real-time communication via WebSockets. It follows a modular design pattern with clear separation of concerns between UI components, services, and state management.

### Key Components

#### Dashboard

- **TaskLog**: Displays and manages tasks executed by AI agents, with real-time updates on task status, progress, and results
- **SystemStatus**: Shows the current status of connections to the server, bridge, and nanobrowser components
- **VMIFrame**: Provides a virtual machine interface with VNC connectivity for viewing and controlling browser sessions

#### Chat Interface

- **ChatList**: Manages chat sessions, allowing users to create, select, edit, and delete conversation threads
- **ChatInterface**: Handles message display and user input for communicating with AI agents

#### VNC Control

- **VncControl**: Implements keyboard and mouse input handling for remote browser control
- **PixelUtils**: Provides utilities for handling pixel data in the VNC canvas

### Services

- **SocketService**: Manages WebSocket communication with the server, including event subscriptions and message handling
- **VncSocketService**: Handles specialized socket communication for the VNC connection

## Features

- **Real-time Task Tracking**: Monitor AI agent tasks with live status updates and progress indicators
- **Chat-based Agent Interaction**: Communicate with AI agents through a familiar chat interface
- **Session Management**: Create and manage multiple agent sessions
- **Remote Browser Control**: View and control browser sessions through an embedded VNC interface
- **System Status Monitoring**: Track the status of all system components

## Technical Stack

- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS for responsive design
- **State Management**: React Hooks and Context API
- **Communication**: Socket.io for real-time WebSocket communication
- **Build Tool**: Vite for fast development and optimized production builds

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Running the Development Server

```bash
npm run dev
```

The application will be available at http://localhost:5173

### Building for Production

```bash
npm run build
```

## Integration

The client communicates with the Nanomachine server via WebSockets and REST APIs. It relies on the following backend services:

- **Nanomachine Server**: Provides API endpoints and WebSocket connections for task management and agent communication
- **Bridge Service**: Facilitates communication between the server and Nanobrowser extension
- **VNC Service**: Provides remote browser viewing and control capabilities

## Configuration

The client can be configured by creating a `.env` file based on the provided `.env.template`. The following environment variables are available:

```
# Server API URL (for HTTP requests)
VITE_API_URL=http://localhost:3100

# Socket server URL (for WebSocket connections)
VITE_SOCKET_URL=http://localhost:3100

# Bridge WebSocket URL
VITE_BRIDGE_URL=ws://localhost:8787

# VNC server URL
VITE_VNC_URL=http://localhost:3201/vnc/index.html?autoconnect=1&resize=remote&enable_perf_stats=0

# Use KasmVNC iframe instead of custom canvas (true/false)
VITE_USE_KASMVNC_IFRAME=true
```

To use these environment variables, copy the `.env.template` file to `.env` and modify the values as needed for your environment.

## License

This component is licensed under the [MIT License](../LICENSE.md) unless otherwise specified. Some dependencies may have different licensing terms.

© 2025-present Reindent LLC <contact@reindent.com>
