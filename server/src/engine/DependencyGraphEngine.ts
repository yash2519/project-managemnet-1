import { GraphNode, WeightingStrategy, GraphStatistics, ProjectAnalysis } from "./types";
import { Task, TaskDependency } from "@prisma/client";

export class DependencyGraphEngine {
  private nodes: Map<number, GraphNode> = new Map();
  private projectId: number;

  constructor(projectId: number) {
    this.projectId = projectId;
  }

  /**
   * Initializes the in-memory graph from a list of tasks and dependencies.
   * O(V + E) time complexity.
   */
  public buildGraph(tasks: Task[], dependencies: TaskDependency[]): void {
    // Initialize all nodes
    for (const task of tasks) {
      this.nodes.set(task.id, {
        taskId: task.id,
        metadata: {
          title: task.title,
          status: task.status,
          priority: task.priority,
          points: task.points,
          startDate: task.startDate,
          dueDate: task.dueDate,
          assignedUserId: task.assignedUserId,
          // Prediction fields — callers may enrich these before running the engine
          progressPercent: undefined,
          actualCompletionDate: undefined,
          estimatedCompletionDate: undefined,
          sprintId: undefined,
          sprintEndDate: undefined,
        },
        incomingEdges: [],
        outgoingEdges: [],
        cachedAnalysis: {},
      });
    }

    // Populate edges
    for (const dep of dependencies) {
      // Only process edges if both nodes exist in the graph (should be true based on FKs)
      const predecessor = this.nodes.get(dep.predecessorId);
      const successor = this.nodes.get(dep.successorId);

      if (predecessor && successor) {
        predecessor.outgoingEdges.push(dep.successorId);
        successor.incomingEdges.push(dep.predecessorId);
      }
    }
  }

  public getNodes(): Map<number, GraphNode> {
    return this.nodes;
  }

  public getNode(taskId: number): GraphNode | undefined {
    return this.nodes.get(taskId);
  }

  /**
   * Finds all root tasks (tasks with no predecessors).
   */
  public findRootTasks(): number[] {
    const roots: number[] = [];
    for (const [taskId, node] of this.nodes.entries()) {
      if (node.incomingEdges.length === 0) {
        roots.push(taskId);
      }
    }
    return roots;
  }

  /**
   * Finds all leaf tasks (tasks with no successors).
   */
  public findLeafTasks(): number[] {
    const leafs: number[] = [];
    for (const [taskId, node] of this.nodes.entries()) {
      if (node.outgoingEdges.length === 0) {
        leafs.push(taskId);
      }
    }
    return leafs;
  }

  /**
   * Performs Kahn's Algorithm for Topological Sort.
   * Returns null if a cycle is detected.
   */
  public topologicalSort(): number[] | null {
    const inDegree = new Map<number, number>();
    for (const [taskId, node] of this.nodes.entries()) {
      inDegree.set(taskId, node.incomingEdges.length);
    }

    const queue: number[] = [];
    for (const [taskId, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(taskId);
      }
    }

    const sorted: number[] = [];
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      sorted.push(currentId);

      const node = this.nodes.get(currentId)!;
      for (const successorId of node.outgoingEdges) {
        const currentInDegree = inDegree.get(successorId)! - 1;
        inDegree.set(successorId, currentInDegree);
        if (currentInDegree === 0) {
          queue.push(successorId);
        }
      }
    }

    if (sorted.length !== this.nodes.size) {
      return null; // Cycle detected
    }

    return sorted;
  }

  /**
   * Detects cycles using DFS.
   * Returns a list of task IDs involved in the cycles, or empty array if none.
   */
  public detectCycles(): number[][] {
    const visited = new Set<number>();
    const recStack = new Set<number>();
    const cycles: number[][] = [];
    const currentPath: number[] = [];

    const dfs = (nodeId: number) => {
      visited.add(nodeId);
      recStack.add(nodeId);
      currentPath.push(nodeId);

      const node = this.nodes.get(nodeId)!;
      for (const neighborId of node.outgoingEdges) {
        if (!visited.has(neighborId)) {
          dfs(neighborId);
        } else if (recStack.has(neighborId)) {
          // Cycle detected
          const cycleStartIndex = currentPath.indexOf(neighborId);
          cycles.push([...currentPath.slice(cycleStartIndex), neighborId]);
        }
      }

      recStack.delete(nodeId);
      currentPath.pop();
    };

    for (const taskId of this.nodes.keys()) {
      if (!visited.has(taskId)) {
        dfs(taskId);
      }
    }

    return cycles;
  }

  /**
   * Finds all tasks that are blocked (predecessors are not "Completed").
   */
  public findBlockedTasks(): number[] {
    const blocked: number[] = [];

    for (const [taskId, node] of this.nodes.entries()) {
      let isBlocked = false;
      for (const predId of node.incomingEdges) {
        const predNode = this.nodes.get(predId);
        if (predNode && predNode.metadata.status !== "Completed") {
          isBlocked = true;
          break;
        }
      }
      
      node.cachedAnalysis.isBlocked = isBlocked;
      if (isBlocked) {
        blocked.push(taskId);
      }
    }

    return blocked;
  }

  /**
   * Calculates the weight of a node based on the strategy.
   */
  private getNodeWeight(node: GraphNode, strategy: WeightingStrategy): number {
    switch (strategy) {
      case "POINTS":
        return node.metadata.points || 1; // Default to 1 if null
      case "DURATION":
        if (node.metadata.startDate && node.metadata.dueDate) {
          const diffTime = Math.abs(node.metadata.dueDate.getTime() - node.metadata.startDate.getTime());
          return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
        }
        return 1;
      case "CUSTOM":
        return 1; // Fallback for custom logic later
      default:
        return 1;
    }
  }

  /**
   * Computes the critical path (longest path by weight).
   * Supports configurable weighting strategies.
   */
  public findCriticalPath(strategy: WeightingStrategy = "POINTS"): { path: number[], weight: number } {
    const topoSort = this.topologicalSort();
    if (!topoSort) {
      // Cannot compute critical path on a cyclic graph
      return { path: [], weight: 0 };
    }

    // Dynamic programming arrays
    const dist = new Map<number, number>();
    const prev = new Map<number, number | null>();

    for (const taskId of topoSort) {
      const weight = this.getNodeWeight(this.nodes.get(taskId)!, strategy);
      dist.set(taskId, weight);
      prev.set(taskId, null);
    }

    for (const u of topoSort) {
      const node = this.nodes.get(u)!;
      for (const v of node.outgoingEdges) {
        const vWeight = this.getNodeWeight(this.nodes.get(v)!, strategy);
        if (dist.get(u)! + vWeight > dist.get(v)!) {
          dist.set(v, dist.get(u)! + vWeight);
          prev.set(v, u);
        }
      }
    }

    let maxDist = 0;
    let endNode = topoSort[0];

    for (const [taskId, d] of dist.entries()) {
      if (d > maxDist) {
        maxDist = d;
        endNode = taskId;
      }
    }

    if (!endNode) {
       return { path: [], weight: 0 };
    }

    // Reconstruct path
    const path: number[] = [];
    let curr: number | null = endNode;
    while (curr !== null) {
      path.push(curr);
      curr = prev.get(curr)!;
    }

    return { path: path.reverse(), weight: maxDist };
  }

  /**
   * Finds all downstream tasks affected by the given task.
   */
  public getAffectedTasks(taskId: number): number[] {
    if (!this.nodes.has(taskId)) return [];

    const visited = new Set<number>();
    const stack: number[] = [taskId];
    const affected: number[] = [];

    while (stack.length > 0) {
      const currentId = stack.pop()!;
      
      if (!visited.has(currentId)) {
        visited.add(currentId);
        if (currentId !== taskId) {
          affected.push(currentId);
        }

        const node = this.nodes.get(currentId)!;
        for (const successorId of node.outgoingEdges) {
          if (!visited.has(successorId)) {
            stack.push(successorId);
          }
        }
      }
    }

    return affected;
  }

  /**
   * Gets the depth of a task (longest path from a root).
   */
  public getDependencyDepth(taskId: number): number {
    const topoSort = this.topologicalSort();
    if (!topoSort) return 0; // Cycles exist

    const depths = new Map<number, number>();
    for (const id of topoSort) {
      depths.set(id, 0);
    }

    for (const u of topoSort) {
      const node = this.nodes.get(u)!;
      for (const v of node.outgoingEdges) {
        if (depths.get(u)! + 1 > depths.get(v)!) {
          depths.set(v, depths.get(u)! + 1);
        }
      }
    }

    const depth = depths.get(taskId) || 0;
    if (this.nodes.has(taskId)) {
      this.nodes.get(taskId)!.cachedAnalysis.depth = depth;
    }
    return depth;
  }

  /**
   * Computes graph statistics.
   */
  public getGraphStatistics(): GraphStatistics {
    let totalEdges = 0;
    for (const node of this.nodes.values()) {
      totalEdges += node.outgoingEdges.length;
    }

    const roots = this.findRootTasks();
    const leafs = this.findLeafTasks();

    let maxDepth = 0;
    const topoSort = this.topologicalSort();
    if (topoSort) {
        // Calculate max depth over all tasks
        // Alternatively, just take depth of all tasks and find max.
        // It's O(V+E) to run getDependencyDepth on all? Actually DP is O(V+E) for all tasks at once
        const depths = new Map<number, number>();
        for (const id of topoSort) {
          depths.set(id, 0);
        }
        for (const u of topoSort) {
          const node = this.nodes.get(u)!;
          for (const v of node.outgoingEdges) {
            if (depths.get(u)! + 1 > depths.get(v)!) {
              depths.set(v, depths.get(u)! + 1);
            }
          }
        }
        for (const d of depths.values()) {
            if (d > maxDepth) maxDepth = d;
        }
    }

    return {
      totalNodes: this.nodes.size,
      totalEdges,
      rootNodesCount: roots.length,
      leafNodesCount: leafs.length,
      maxDepth,
    };
  }

  /**
   * Executes all graph analyses and returns a consolidated ProjectAnalysis object.
   */
  public analyzeProject(): ProjectAnalysis {
    const cycles = this.detectCycles();
    const hasCycles = cycles.length > 0;
    const blockedTasks = this.findBlockedTasks();
    const criticalPathResult = this.findCriticalPath("POINTS");

    return {
      projectId: this.projectId,
      statistics: this.getGraphStatistics(),
      blockedTasks,
      criticalPath: criticalPathResult.path,
      criticalPathWeight: criticalPathResult.weight,
      hasCycles,
      cycleDetails: hasCycles ? cycles : undefined,
    };
  }
}
