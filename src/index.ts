import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";

interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface Todo {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high";
  createdAt: string;
  updatedAt: string;
}
// Define our MCP agent with tools
export class MyMCP extends McpAgent {
  server = new McpServer({
    name: "Project Planner",
    version: "1.0.0",
  });

  private get kv(): KVNamespace {
    return (this.env as Env).Project_Planner_Store;
  }
  private async getProjectList(): Promise<string[]> {
    const listData = await this.kv.get("project:list");
    return listData ? JSON.parse(listData) : [];
  }
  private async getTodoList(projectId: string): Promise<string[]> {
    const listData = await this.kv.get(`project:${projectId}:todos`);
    return listData ? JSON.parse(listData) : [];
  }

  private async getTodosByProject(projectId: string): Promise<Todo[]> {
    const todoList = await this.getTodoList(projectId);
    const todos: Todo[] = [];

    for (const todoId of todoList) {
      const todoData = await this.kv.get(`todo:${todoId}`);
      if (todoData) {
        todos.push(JSON.parse(todoData));
      }
    }
    return todos;
  }
  async init() {
    this.server.tool(
      "create_project",
      "Create a new project",
      {
        name: z.string().describe("Project name"),
        description: z.string().optional().describe("Project description"),
      },
      async ({ name, description }) => {
        const projectId = crypto.randomUUID();

        const project: Project = {
          id: projectId,
          name,
          description: description || "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await this.kv.put(`project:${projectId}`, JSON.stringify(project)); //created new project

        const projectList = await this.getProjectList(); //updated the list of projects
        projectList.push(projectId);
        await this.kv.put("project:list", JSON.stringify(projectList));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(project, null, 2),
            },
          ],
        };
      },
    );
    this.server.tool(
      "update_project",
      "Update a project",
      {
        projectId: z.string().describe("Project Id for update"),
        name: z.string().optional().describe("Update Project name"),
        description: z.string().optional().describe("Update Project description"),
      },
      async ({projectId, name, description }) => {
        
        const projectList = await this.kv.get(`project:${projectId}`);
        if(!projectList){
          throw new Error(`Project with this id:${projectId} does not exist`)
        }
        const pro: Project = JSON.parse(projectList);

        if(name !== undefined) pro.name = name
        if(description !== undefined) pro.description = description
        await this.kv.put(`project:${projectId}`, JSON.stringify(pro));
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(pro, null, 2),
            },
          ],
        };
      },
    );

    this.server.tool("list_projects", "List All projects", {}, async () => {
      const projectList = await this.getProjectList();
      const projects: Project[] = [];
      for (const projectId of projectList) {
        const projectData = await this.kv.get(`project:${projectId}`);
        if (projectData) {
          projects.push(JSON.parse(projectData));
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(projects, null, 2),
          },
        ],
      };
    });
    this.server.tool(
      "get_projects",
      "Get specific projects by ID",
      { project_id: z.string().describe("Project Id") },
      async ({ project_id }) => {
        const projectList = await this.kv.get(`project:${project_id}`);
        if (!projectList) {
          throw new Error(`Project with this ID:${project_id} not found`);
        }
        const project: Project = JSON.parse(projectList);
        const todos = await this.getTodosByProject(project_id);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ project, todos }, null, 2),
            },
          ],
        };
      },
    );
    this.server.tool(
      "delete_projects",
      "Delete a project and all its todos",
      { project_id: z.string().describe("Project Id") },
      async ({ project_id }) => {
        const projectList = await this.kv.get(`project:${project_id}`);
        if (!projectList) {
          throw new Error(`Project with this ID:${project_id} not found`);
        }
        const project: Project = JSON.parse(projectList);
        const todos = await this.getTodosByProject(project_id);
        for (const todo of todos) {
          await this.kv.delete(`todo:${todo.id}`);
        }

        //delete project todo list
        (await this.kv.delete(`project:${project_id}:todos`),
          //delete project
          await this.kv.delete(`project:${project_id}`));
        //remove project from the project list
        const projectLists = await this.getProjectList();

        const updatedList = projectLists.filter((id) => id !== project_id);
        await this.kv.put("project:list", JSON.stringify(updatedList));
        return {
          content: [
            {
              type: "text",
              text: `Project ${project_id} and all its todos have been deleted!!`,
            },
          ],
        };
      },
    );

    this.server.tool(
      "create_todo",
      "Create a new todo in a project",
      {
        project_id: z.string().describe("Project ID"),
        title: z.string().describe("Todo title"),
        description: z.string().optional().describe("Todo description"),
        priority: z
          .enum(["low", "medium", "high"])
          .optional()
          .describe("Priority Set"),
      },
      async ({ project_id, title, description, priority }) => {
        const projectData = await this.kv.get(`project:${project_id}`);
        if (!projectData) {
          throw new Error(`Project not found with this id: ${project_id}`);
        }
        const todoId = crypto.randomUUID();
        const todo: Todo = {
          id: todoId,
          projectId: project_id,
          title,
          description: description || "",
          status: "pending",
          priority: priority || "medium",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const todoList = await this.getTodoList(project_id);
        todoList.push(todoId);
        await this.kv.put(
          `project:${project_id}:todos`,
          JSON.stringify(todoList),
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(todo, null, 2),
            },
          ],
        };
      },
    );
    this.server.tool(
      "update_todo",
      "Update a todo's properties",
      {
        todo_id: z.string().describe("Todo ID"),
        title: z.string().optional().describe("New Todo title"),
        description: z.string().optional().describe("New Todo description"),
        status: z
          .enum(["pending", "in_progress", "completed"])
          .optional()
          .describe("New Status Set"),
        priority: z
          .enum(["low", "medium", "high"])
          .optional()
          .describe("New Priority Set"),
      },
      async ({ todo_id, title, description, status, priority }) => {
        const todoData = await this.kv.get(`todo:${todo_id}`);
        if (!todoData) {
          throw new Error(`Todo with ID: ${todo_id} not found!`);
        }
        const todo: Todo = JSON.parse(todoData);
        if (title !== undefined) todo.title = title;
        if (description !== undefined) todo.description = description;
        if (status !== undefined) todo.status = status;
        if (priority !== undefined) todo.priority = priority;

        todo.updatedAt = new Date().toISOString();
        await this.kv.put(`todo:${todo_id}`, JSON.stringify(todo));
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(todo, null, 2),
            },
          ],
        };
      },
    );
    this.server.tool(
      "delete_todo",
      "Delete a todo from a project",
      {
        todo_id: z.string().describe("Todo ID"),
      },
      async ({ todo_id }) => {
        const todoData = await this.kv.get(`todo:${todo_id}`);
        if (!todoData) {
          throw new Error(`Todo with ID: ${todo_id} not found!`);
        }
        const todo: Todo = JSON.parse(todoData);

        //Remove from project todo list
        const todoList = await this.getTodoList(todo.projectId);
        const updatedList = todoList.filter((id) => id !== todo_id);
        await this.kv.put(
          `project:${todo.projectId}:todos`,
          JSON.stringify(updatedList),
        );

        return {
          content: [
            {
              type: "text",
              text: `Todo ${todo_id} has been deleted`,
            },
          ],
        };
      },
    );
    this.server.tool(
      "get_todo",
      "Get specific todo by ID",
      {
        todo_id: z.string().describe("Todo ID"),
      },
      async ({ todo_id }) => {
        const todoData = await this.kv.get(`todo:${todo_id}`);
        if (!todoData) {
          throw new Error(`Todo with ID: ${todo_id} not found!`);
        }
        const todo: Todo = JSON.parse(todoData);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(todo, null, 2),
            },
          ],
        };
      },
    );
    this.server.tool(
      "list_todos",
      "List all todos in a project",
      {
        project_id: z.string().describe("Project ID"),
        status: z
          .enum(["pending", "in_progress", "completed", "all"])
          .optional()
          .describe("Filter by status"),
      },
      async ({ project_id, status }) => {
        const projectData = await this.kv.get(`todo:${project_id}`);
        if (!projectData) {
          throw new Error(`Project with this ID: ${project_id} not found!`);
        }
        let todos = await this.getTodosByProject(project_id);

        if (status && status !== "all") {
          todos = todos.filter((todo) => todo.status === status);
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(todos, null, 2),
            },
          ],
        };
      },
    );
  }
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === "/sse" || url.pathname === "/mcp") {
      return MyMCP.serve("/sse").fetch(request, env, ctx);
    }

    return new Response("Not found", { status: 404 });
  },
};
