# Nanomachine Server

The Nanomachine Server is the backend component of the Nanomachine AI agent dashboard. It provides WebSocket and HTTP APIs for communication between the client application, the bridge service, and the nanobrowser extension.

## Architecture Overview

The server is built with Node.js and Express, using a modular architecture with the following components:

- **HTTP API**: RESTful endpoints for chat and task management
- **WebSocket Server**: Real-time communication using Socket.IO
- **Database Integration**: MongoDB for data persistence
- **Bridge Communication**: WebSocket and HTTP integration with the bridge service
- **VNC Service**: Proxy for remote browser control

## Core Components

### Services

- **BridgeService**: Manages communication with the bridge component, handling agent events and task operations
- **NanobrowserService**: Configures the nanobrowser extension with LLM providers and agent models
- **VNCService**: Provides remote browser viewing and control capabilities
- **AgentCoordinator**: Coordinates the strategist and executor agents to process user requests
- **ContextManager**: Maintains context between tasks for coherent execution
- **TaskService**: Manages task creation, updates, and notifications

### Models

The server uses MongoDB with Mongoose for data persistence:

1. **Chat**: Stores chat sessions between users and AI agents
2. **Message**: Stores individual messages within chats
3. **Task**: Tracks AI agent tasks from creation to completion
4. **TaskEvent**: Records detailed events during task execution

### Controllers & Routes

The server implements a clean MVC pattern with dedicated controllers and routes for each resource:

- **Chat Routes**: Manage conversation sessions
- **Task Routes**: Handle task creation and monitoring
- **Status Routes**: Provide system status information
- **Bridge Routes**: Facilitate communication with the bridge service

### AI Agent System

The server includes a sophisticated AI agent system for processing user requests:

- **Agent Coordinator** (`/services/agents/agentCoordinator.ts`):
  - Central orchestration component that manages the entire agent workflow
  - Processes user requests through strategist and executor agents
  - Maintains context between tasks using the context manager
  - Extracts meaningful information from task results
  - Generates final responses to user requests based on all task results

- **Strategist Agent**: Creates multi-step plans for user requests
  - Analyzes user requests and generates structured task plans
  - Adapts plan complexity to match task requirements
  - Ensures tasks flow logically from research to execution to synthesis

- **Executor Agent**: Executes individual tasks using specialized tools
  - Selects the appropriate tool for each task
  - Enriches tasks with context from previous tasks
  - Extracts valuable information from task results

- **Agent Tools** (`/services/agents/tools/`):
  - **Browser Tool** (`browserTool.ts`): Interfaces with the Nanobrowser extension for web tasks
    - Handles asynchronous browser operations
    - Manages event listeners for browser task completion
    - Processes responses from the bridge service
  - **Shell Tool** (`shellTool.ts`): Executes shell commands in the Docker container
    - Safely runs commands in the isolated environment
    - Handles command output and error processing
  - **Data Tool** (`dataTool.ts`): Processes and synthesizes data from previous tasks
    - Cleans, deduplicates, and formats data
    - Generates structured summaries from collected information

## API Endpoints

### Chat Endpoints

- `GET /api/chats` - Get all chats
- `GET /api/chats/:id` - Get a specific chat
- `POST /api/chats` - Create a new chat
- `PUT /api/chats/:id` - Update a chat
- `DELETE /api/chats/:id` - Delete a chat
- `GET /api/chats/:chatId/messages` - Get messages for a chat
- `POST /api/chats/:chatId/messages` - Create a new message

### Task Endpoints

- `GET /api/tasks` - Get all tasks
- `GET /api/tasks/:id` - Get a specific task
- `POST /api/tasks` - Create a new task
- `PUT /api/tasks/:id` - Update a task status
- `GET /api/tasks/:id/events` - Get events for a task
- `POST /api/tasks/:id/events` - Create a task event

### Status Endpoints

- `GET /health` - Server health check
- `GET /api/status` - Get system status information

## WebSocket Events

The server uses Socket.IO for real-time communication with clients:

### Outgoing Events (Server to Client)

- `chat:message` - New chat message available
- `chat:created` - New chat session created
- `chat:select` - Request client to select a specific chat
- `agent:event` - Agent event notification (from bridge)
- `task:created` - New task created
- `task:completed` - Task completed successfully
- `task:failed` - Task failed with error
- `tasks:update` - Updated task list available
- `status:update` - System status information

### Incoming Events (Client to Server)

- `chat:message` - Client sends a new message
- `tasks:refresh` - Client requests updated task list
- `task:archive` - Client requests to archive a task

## Bridge Integration

The server communicates with the bridge service in two ways:

1. **WebSocket**: For real-time events and status updates
2. **HTTP API**: For task creation, provider configuration, and agent model setup

The bridge service forwards agent events from the nanobrowser extension to the server, which then processes them and forwards relevant information to connected clients.

## Setup and Configuration

### Prerequisites

- Node.js 18+
- MongoDB 4.4+
- Bridge service running and accessible

### Installation

```bash
npm install
```

### Configuration

Copy `.env.template` to `.env` and configure the following variables:

```
# Server Configuration
PORT=3100
MONGODB_URI=mongodb://localhost:27017/nanomachine

# Bridge Configuration
BRIDGE_URL=http://localhost:8787

# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key

# LLM Model Configuration
LLM_MODEL_NAMES=gpt-4.1,gpt-4o,gpt-4o-mini,o3-mini

# Agent Configuration
# Nanobrowser Agents
AGENT_PLANNER_MODEL=gpt-4.1
AGENT_PLANNER_TEMPERATURE=0.7
AGENT_PLANNER_TOP_P=0.9

AGENT_NAVIGATOR_MODEL=gpt-4.1
AGENT_NAVIGATOR_TEMPERATURE=0.3
AGENT_NAVIGATOR_TOP_P=0.85

AGENT_VALIDATOR_MODEL=gpt-4.1
AGENT_VALIDATOR_TEMPERATURE=0.1
AGENT_VALIDATOR_TOP_P=0.8

# Nanomachine Agents
STRATEGIST_MODEL=gpt-4.1
STRATEGIST_TEMPERATURE=0.7

EXECUTOR_MODEL=gpt-4.1
EXECUTOR_TEMPERATURE=0.2

# VNC Configuration
VNC_HOST=localhost
VNC_PORT=6080
VNC_PASSWORD=password
```

### Running the Server

Development mode with hot reloading:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

## Integration with Other Components

The server integrates with:

- **Client Application**: Provides API endpoints and WebSocket events for the frontend
- **Bridge Service**: Communicates with the bridge to send tasks and receive agent events
- **Nanobrowser Extension**: Indirectly communicates through the bridge service

## License

This component is licensed under the [MIT License](../LICENSE.md) unless otherwise specified. Some dependencies may have different licensing terms.

© 2025-present Reindent LLC <contact@reindent.com>
