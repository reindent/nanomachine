# Nanomachine Bridge

The Nanomachine Bridge is a critical component that facilitates communication between the Nanomachine application and the Nanobrowser extension. It serves as a WebSocket and HTTP API gateway, enabling bidirectional data flow between these two systems.

## Architecture Overview

The bridge operates as a standalone service with two primary interfaces:

1. **WebSocket Server**: Handles real-time bidirectional communication
2. **HTTP REST API**: Provides endpoints for configuration and task management

### Key Components

- **Server**: WebSocket and HTTP server implementation
- **Client Management**: Tracks connected clients (Nanomachine and Nanobrowser)
- **Task Management**: Handles task creation, tracking, and event processing
- **Configuration API**: Endpoints for LLM provider and agent model configuration

## Communication Flow

```
┌─────────────┐                  ┌─────────────┐                  ┌─────────────┐
│             │   WebSocket/HTTP │             │     WebSocket    │             │
│  Nanomachine│ ◄──────────────► │    Bridge   │ ◄──────────────► │ Nanobrowser │
│   Server    │                  │   Service   │                  │  Extension  │
└─────────────┘                  └─────────────┘                  └─────────────┘
```

## Message Types

The bridge handles several types of messages:

- **Hello Messages**: Client identification and connection setup
- **Agent Events**: Status updates from the AI agents (planner, navigator, validator)
- **Task Messages**: Task creation, results, and error handling
- **Configuration Messages**: LLM provider and agent model settings

## API Endpoints

### WebSocket Interface

- **Connection**: `ws://localhost:8787`
- **Message Format**: JSON with a `type` field identifying the message type

### HTTP REST API

- **Health Check**: `GET /health` - Service status and connection information
- **Prompt Endpoint**: `POST /prompt` - Send tasks to Nanobrowser
- **Provider Configuration**: `POST /provider` - Configure LLM providers
- **Agent Model Configuration**: `POST /model` - Configure agent models
- **Task Information**: `GET /task/:taskId` - Get task details and events
- **Task Listing**: `GET /tasks` - List all tasks and their status

## Configuration

The bridge facilitates configuration of the Nanobrowser extension's AI agents. Through the bridge API, you can configure various LLM models and parameters for the agents:

- **Planner**: Responsible for task planning and decomposition
- **Navigator**: Handles browser navigation and interaction
- **Validator**: Validates task completion and results

The bridge supports a variety of LLM providers and models, which can be configured via the `/provider` and `/model` endpoints.

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Running the Bridge

```bash
npm start
```

The bridge will start on port 8787 by default.

## Integration

### Connecting from Nanomachine

The Nanomachine server connects to the bridge via WebSocket and identifies itself with a "hello" message:

```json
{
  "type": "hello",
  "name": "nanomachine-service"
}
```

### Connecting from Nanobrowser

The Nanobrowser extension connects to the bridge via WebSocket and identifies itself with a "hello" message:

```json
{
  "type": "hello",
  "name": "nanobrowser-extension",
  "version": "0.1.4"
}
```

### Resources

- [Nanomachine](https://github.com/reindent/nanomachine)
- [Nanobrowser](https://github.com/nanobrowser/nanobrowser)

NOTE: This bridge uses a forked version of Nanobrowser that exposes endpoints to operate and configure Nanobrowser. The fork is available at [Nanobrowser](https://github.com/reindent/nanobrowser).

## License

This component is licensed under the [MIT License](../LICENSE.md) unless otherwise specified. Some dependencies may have different licensing terms.

© 2025-present Reindent LLC <contact@reindent.com>