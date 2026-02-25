# MCP Project Planner (Cloudflare Workers + Model Context Protocol)

## Overview

MCP Project Planner is a cloud-based project and task management system built using the **Model Context Protocol (MCP)** and deployed on **Cloudflare Workers**. It allows AI clients (such as Cursor) to create, manage, and organize projects and todos through structured MCP tools.

This project demonstrates how to build a production-ready MCP server with persistent storage, scalable serverless infrastructure, and seamless AI integration.

The system enables AI assistants to directly interact with structured project data, making it possible to automate planning, track progress, and manage tasks efficiently.

---

## Key Features

* Create and manage projects
* Create, update, delete, and list todos
* Organize todos by project
* Persistent storage using Cloudflare KV
* Fully serverless deployment using Cloudflare Workers
* MCP-compatible tool interface for AI assistants
* Real-time interaction via SSE transport
* Scalable and production-ready architecture

---

## MCP Tools Implemented

### Project Management

* `create_project` — Create a new project
* `list_projects` — List all projects
* `get_projects` — Get project details and its todos
* `delete_projects` — Delete a project and all associated todos

### Todo Management

* `create_todo` — Add a todo to a project
* `update_todo` — Update todo properties (status, priority, etc.)
* `delete_todo` — Remove a todo
* `get_todo` — Retrieve specific todo
* `list_todos` — List todos with optional status filtering

---

## Tech Stack

* Cloudflare Workers (Serverless backend)
* Model Context Protocol (MCP SDK)
* Cloudflare KV (Persistent storage)
* Durable Objects (Stateful coordination)
* TypeScript
* Node.js
* Cursor MCP Client Integration

---

## Architecture

```
Cursor (AI Client)
      ↓
mcp-remote transport
      ↓
Cloudflare Worker (MCP Server)
      ↓
Durable Object (McpAgent)
      ↓
Cloudflare KV (Project and Todo storage)
```

---

## Storage Design

Data is stored using Cloudflare KV with the following structure:

```
project:list
project:{projectId}
project:{projectId}:todos
todo:{todoId}
```

This enables fast lookup, scalability, and persistent state.

---

## Deployment

The MCP server is deployed using Wrangler:

```
wrangler deploy
```

Server endpoint:

```
https://remote-mcp-server-authless.<your-subdomain>.workers.dev/sse
```

---

## AI Integration (Cursor)

This project integrates directly with Cursor via MCP:

Example MCP configuration:

```
{
  "mcpServers": {
    "project-planner-mcp": {
      "command": "mcp-remote",
      "args": ["https://your-worker-url.workers.dev/sse"]
    }
  }
}
```

This allows Cursor to call tools automatically.

---

## Example Usage

Example AI prompt:

```
Create a project named "Startup App"
Add todos for backend, frontend, and deployment
```

Cursor will automatically call MCP tools and manage data.

---

## Learning Outcomes

This project demonstrates:

* MCP server implementation
* Cloudflare Workers deployment
* Serverless backend architecture
* AI tool integration
* Persistent storage design
* Production-ready scalable backend development

---

## Future Improvements

* User authentication
* Multi-user support
* Deadlines and reminders
* Project sharing
* AI-generated task planning
* Dashboard frontend

---

## Conclusion

MCP Project Planner showcases how AI systems can interact with structured tools and persistent storage using the Model Context Protocol. It represents a modern approach to building AI-integrated, serverless, scalable applications.

This project is ideal for learning MCP, Cloudflare Workers, and AI-native backend development.
