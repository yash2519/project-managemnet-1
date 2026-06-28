import { PrismaClient } from "@prisma/client";
import { DependencyGraphEngine } from "../engine/DependencyGraphEngine";
import { FailurePredictionEngine } from "../engine/FailurePredictionEngine";
import { ProjectAnalysis, PredictionResult } from "../engine/types";

const prisma = new PrismaClient();

export class DependencyGraphService {
  
  /**
   * Loads all tasks and active dependencies for a project and builds the graph engine.
   */
  public async buildEngineForProject(projectId: number): Promise<DependencyGraphEngine> {
    const [tasks, dependencies] = await Promise.all([
      prisma.task.findMany({ where: { projectId } }),
      prisma.taskDependency.findMany({ 
        where: { 
          isActive: true,
          predecessor: { projectId }, // Ensure we only get dependencies for this project
        }
      })
    ]);

    const engine = new DependencyGraphEngine(projectId);
    engine.buildGraph(tasks, dependencies);
    return engine;
  }

  /**
   * Executes a complete graph analysis for a project.
   */
  public async analyzeProject(projectId: number): Promise<ProjectAnalysis> {
    const engine = await this.buildEngineForProject(projectId);
    return engine.analyzeProject();
  }

  /**
   * Runs the deterministic Dependency Failure Prediction Engine for a project.
   * Returns riskScore, affectedTasks, estimatedDelay, criticalTasks, sprintImpacts,
   * and full reasoningData — ready to be consumed by AI modules or the API directly.
   */
  public async predictProject(projectId: number): Promise<PredictionResult> {
    const engine = await this.buildEngineForProject(projectId);
    const predictor = new FailurePredictionEngine(engine, projectId);
    return predictor.predict();
  }

  /**
   * Detects if adding an edge from predecessorId to successorId would create a cycle.
   * This is called during dependency creation.
   */
  public async wouldCreateCycle(predecessorId: number, successorId: number): Promise<boolean> {
    if (predecessorId === successorId) {
      return true; // Self-loop is trivially a cycle
    }

    const task = await prisma.task.findUnique({
      where: { id: predecessorId },
      select: { projectId: true }
    });

    if (!task) return false;

    // Load the whole project graph
    const engine = await this.buildEngineForProject(task.projectId);
    
    // Simulate the new edge
    const nodes = engine.getNodes();
    const predecessor = nodes.get(predecessorId);
    const successor = nodes.get(successorId);

    if (predecessor && successor) {
      predecessor.outgoingEdges.push(successorId);
      successor.incomingEdges.push(predecessorId);
      
      const topoSort = engine.topologicalSort();
      return topoSort === null; // Cycle detected if topo sort fails
    }

    return false;
  }

  /**
   * Fetches all downstream dependent tasks (successors, successors of successors, etc.)
   */
  public async getAffectedDownstreamTasks(taskId: number): Promise<number[]> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { projectId: true }
    });

    if (!task) return [];

    const engine = await this.buildEngineForProject(task.projectId);
    return engine.getAffectedTasks(taskId);
  }
}

export const dependencyGraphService = new DependencyGraphService();
