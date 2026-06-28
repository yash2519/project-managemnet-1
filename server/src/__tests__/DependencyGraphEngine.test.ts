import { DependencyGraphEngine } from "../engine/DependencyGraphEngine";
import { Task, TaskDependency, DependencyType } from "@prisma/client";

describe("DependencyGraphEngine", () => {
  const createMockTask = (id: number, points?: number, status = "To Do"): Task => ({
    id,
    title: `Task ${id}`,
    status,
    priority: "Medium",
    points: points || null,
    startDate: new Date(),
    dueDate: new Date(),
    projectId: 1,
    assignedUserId: 1,
    authorUserId: 1,
    description: null,
    tags: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const createMockDependency = (id: number, predecessorId: number, successorId: number): TaskDependency => ({
    id,
    predecessorId,
    successorId,
    type: DependencyType.DEPENDS_ON,
    isActive: true,
    note: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdByUserId: 1,
  });

  it("handles a single-node graph", () => {
    const engine = new DependencyGraphEngine(1);
    const tasks = [createMockTask(1, 5)];
    engine.buildGraph(tasks, []);

    expect(engine.findRootTasks()).toEqual([1]);
    expect(engine.findLeafTasks()).toEqual([1]);
    expect(engine.detectCycles()).toEqual([]);
    
    const analysis = engine.analyzeProject();
    expect(analysis.statistics.totalNodes).toBe(1);
    expect(analysis.statistics.totalEdges).toBe(0);
    expect(analysis.criticalPath).toEqual([1]);
    expect(analysis.criticalPathWeight).toBe(5);
  });

  it("handles a disconnected graph", () => {
    const engine = new DependencyGraphEngine(1);
    const tasks = [createMockTask(1, 5), createMockTask(2, 3)];
    engine.buildGraph(tasks, []);

    expect(engine.findRootTasks()).toContain(1);
    expect(engine.findRootTasks()).toContain(2);
    expect(engine.detectCycles()).toEqual([]);
    
    const analysis = engine.analyzeProject();
    expect(analysis.statistics.totalNodes).toBe(2);
    expect(analysis.statistics.totalEdges).toBe(0);
    expect(analysis.criticalPath).toEqual([1]); // longest is 5
    expect(analysis.criticalPathWeight).toBe(5);
  });

  it("handles a linear graph A -> B -> C", () => {
    const engine = new DependencyGraphEngine(1);
    const tasks = [createMockTask(1, 2), createMockTask(2, 3), createMockTask(3, 4)];
    const edges = [
      createMockDependency(1, 1, 2),
      createMockDependency(2, 2, 3),
    ];
    engine.buildGraph(tasks, edges);

    expect(engine.findRootTasks()).toEqual([1]);
    expect(engine.findLeafTasks()).toEqual([3]);
    expect(engine.topologicalSort()).toEqual([1, 2, 3]);
    
    const analysis = engine.analyzeProject();
    expect(analysis.criticalPath).toEqual([1, 2, 3]);
    expect(analysis.criticalPathWeight).toBe(9);
    expect(engine.getDependencyDepth(3)).toBe(2);
  });

  it("handles a tree graph (1 -> 2, 1 -> 3, 2 -> 4, 2 -> 5)", () => {
    const engine = new DependencyGraphEngine(1);
    const tasks = [
      createMockTask(1, 1),
      createMockTask(2, 2),
      createMockTask(3, 1),
      createMockTask(4, 3),
      createMockTask(5, 1),
    ];
    const edges = [
      createMockDependency(1, 1, 2),
      createMockDependency(2, 1, 3),
      createMockDependency(3, 2, 4),
      createMockDependency(4, 2, 5),
    ];
    engine.buildGraph(tasks, edges);

    expect(engine.findRootTasks()).toEqual([1]);
    expect(engine.findLeafTasks()).toEqual(expect.arrayContaining([3, 4, 5]));
    
    const analysis = engine.analyzeProject();
    // 1(1) -> 2(2) -> 4(3) = 6
    expect(analysis.criticalPath).toEqual([1, 2, 4]);
    expect(analysis.criticalPathWeight).toBe(6);
    expect(engine.getAffectedTasks(2)).toEqual(expect.arrayContaining([4, 5]));
  });

  it("handles a diamond graph (1 -> 2, 1 -> 3, 2 -> 4, 3 -> 4)", () => {
    const engine = new DependencyGraphEngine(1);
    const tasks = [
      createMockTask(1, 1),
      createMockTask(2, 5),
      createMockTask(3, 2),
      createMockTask(4, 1),
    ];
    const edges = [
      createMockDependency(1, 1, 2),
      createMockDependency(2, 1, 3),
      createMockDependency(3, 2, 4),
      createMockDependency(4, 3, 4),
    ];
    engine.buildGraph(tasks, edges);

    expect(engine.findRootTasks()).toEqual([1]);
    expect(engine.findLeafTasks()).toEqual([4]);
    
    const analysis = engine.analyzeProject();
    // 1(1) -> 2(5) -> 4(1) = 7
    expect(analysis.criticalPath).toEqual([1, 2, 4]);
    expect(analysis.criticalPathWeight).toBe(7);
  });

  it("detects a circular graph (1 -> 2 -> 3 -> 1)", () => {
    const engine = new DependencyGraphEngine(1);
    const tasks = [createMockTask(1), createMockTask(2), createMockTask(3)];
    const edges = [
      createMockDependency(1, 1, 2),
      createMockDependency(2, 2, 3),
      createMockDependency(3, 3, 1),
    ];
    engine.buildGraph(tasks, edges);

    expect(engine.topologicalSort()).toBeNull();
    const cycles = engine.detectCycles();
    expect(cycles.length).toBeGreaterThan(0);
    
    const analysis = engine.analyzeProject();
    expect(analysis.hasCycles).toBe(true);
    // Cannot compute critical path on cyclic graph
    expect(analysis.criticalPath).toEqual([]);
    expect(analysis.criticalPathWeight).toBe(0);
  });

  it("finds blocked tasks properly", () => {
    const engine = new DependencyGraphEngine(1);
    // Task 1 is To Do (blocks 2)
    // Task 3 is Completed (does not block 4)
    const tasks = [
      createMockTask(1, 1, "To Do"),
      createMockTask(2, 1, "To Do"),
      createMockTask(3, 1, "Completed"),
      createMockTask(4, 1, "To Do"),
    ];
    const edges = [
      createMockDependency(1, 1, 2),
      createMockDependency(2, 3, 4),
    ];
    engine.buildGraph(tasks, edges);

    const blocked = engine.findBlockedTasks();
    expect(blocked).toContain(2); // 2 is blocked by 1
    expect(blocked).not.toContain(4); // 4 is not blocked because 3 is completed
  });

  describe("Performance Benchmark", () => {
    it("handles 1000 tasks and 2000 edges efficiently", () => {
      const engine = new DependencyGraphEngine(1);
      const tasks: Task[] = [];
      const edges: TaskDependency[] = [];

      for (let i = 1; i <= 1000; i++) {
        tasks.push(createMockTask(i, 1));
      }

      // Create a linear chain and some random edges to simulate a complex graph
      let edgeId = 1;
      for (let i = 1; i < 1000; i++) {
        edges.push(createMockDependency(edgeId++, i, i + 1));
      }
      // Add more edges jumping ahead to create multiple paths
      for (let i = 1; i < 900; i++) {
        edges.push(createMockDependency(edgeId++, i, i + 10));
      }

      const startTime = performance.now();
      engine.buildGraph(tasks, edges);
      const buildTime = performance.now() - startTime;
      
      const analysisStartTime = performance.now();
      const analysis = engine.analyzeProject();
      const analysisTime = performance.now() - analysisStartTime;

      console.log(`Build Graph (1000 V, ~2000 E): ${buildTime.toFixed(2)}ms`);
      console.log(`Analyze Project (Full DP + Traversal): ${analysisTime.toFixed(2)}ms`);

      expect(buildTime).toBeLessThan(100); // Should be very fast (O(V+E))
      expect(analysisTime).toBeLessThan(100);
      expect(analysis.statistics.totalNodes).toBe(1000);
      expect(analysis.statistics.totalEdges).toBe(1898); // 999 linear + 899 skip-ahead
      expect(analysis.hasCycles).toBe(false);
    });
  });
});
