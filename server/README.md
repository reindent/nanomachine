# Nanomachine Bridge Server

A WebSocket and HTTP bridge server for communication between the nanobrowser extension and nanomachine service.

## Features

- WebSocket bridge for real-time communication
- MongoDB integration for data persistence
- RESTful API endpoints for chat and task management
- Socket.IO for real-time client updates

## Models

The server uses MongoDB with the following models:

1. **Chat** - Stores chat sessions
2. **Message** - Stores individual messages within chats
3. **Task** - Tracks task execution from start to finish
4. **TaskEvent** - Records detailed events during task execution

## API Endpoints

### Chat Endpoints

- `GET /api/chats` - Get all chats
- `GET /api/chats/:id` - Get a specific chat
- `POST /api/chats` - Create a new chat
- `PUT /api/chats/:id` - Update a chat
- `DELETE /api/chats/:id` - Delete a chat (soft delete)

### Message Endpoints

- `GET /api/chats/:chatId/messages` - Get messages for a chat
- `POST /api/chats/:chatId/messages` - Create a new message
- `DELETE /api/chats/messages/:id` - Delete a message

### Task Endpoints

- `GET /api/tasks` - Get all tasks
- `GET /api/tasks/:id` - Get a specific task
- `POST /api/tasks` - Create a new task
- `PUT /api/tasks/:id` - Update a task status
- `GET /api/tasks/:id/events` - Get events for a task
- `POST /api/tasks/:id/events` - Create a task event

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Configure environment variables:
   Copy `.env.template` to `.env` and update the values.

3. Start the server:
   ```
   npm run dev
   ```

## WebSocket Events

The server uses Socket.IO for real-time communication:

- `chat:message` - Send/receive chat messages
- `agent:event` - Receive agent events
- `tasks:update` - Receive task updates
- `tasks:refresh` - Request task refresh
- `status:update` - Receive system status updates

## MongoDB Integration

The server connects to MongoDB using Mongoose. Make sure MongoDB is running and accessible at the URI specified in your `.env` file.
