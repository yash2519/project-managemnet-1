import React, { useMemo, useCallback } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
  Panel
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import { DependencyGraphNode, PredictionResult } from "@/types";
import { Filter } from "lucide-react";

type Props = {
  nodes: DependencyGraphNode[];
  prediction: PredictionResult;
  onNodeClick: (taskId: number) => void;
};

// Custom Node to display task details
const TaskNode = ({ data }: { data: any }) => {
  const getStatusColors = (status: string, isBlocked: boolean, delay: number, isCritical: boolean) => {
    if (isCritical) return "border-red-500 bg-red-50 dark:bg-red-900/20 shadow-red-500/20 text-red-900 dark:text-red-100";
    if (isBlocked) return "border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-100";
    if (delay > 0) return "border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-900 dark:text-orange-100";
    
    switch(status?.toLowerCase()) {
      case "completed":
        return "border-green-500 bg-green-50 dark:bg-green-900/10 text-green-900 dark:text-green-100";
      case "work in progress":
      case "in progress":
        return "border-blue-500 bg-blue-50 dark:bg-blue-900/10 text-blue-900 dark:text-blue-100";
      default:
        return "border-gray-200 bg-white dark:border-gray-700 dark:bg-dark-secondary text-gray-800 dark:text-white";
    }
  };

  const colors = getStatusColors(data.status, data.isBlocked, data.delay, data.isCritical);

  return (
    <div className={`flex w-48 flex-col rounded-lg border-2 shadow-sm ${colors}`}>
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-gray-400" />
      <div className="p-3">
        <div className="text-xs font-semibold truncate" title={data.title}>
          #{data.taskId} {data.title}
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px]">
          <span className="opacity-80">{data.status || "To Do"}</span>
          {data.delay > 0 && <span className="font-bold opacity-100">+{data.delay}d</span>}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-gray-400" />
    </div>
  );
};

const nodeTypes = {
  task: TaskNode,
};

const getLayoutedElements = (nodes: any[], edges: any[], direction = "TB") => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  const nodeWidth = 200;
  const nodeHeight = 70;
  
  dagreGraph.setGraph({ rankdir: direction });
  
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });
  
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });
  
  dagre.layout(dagreGraph);
  
  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = Position.Top;
    node.sourcePosition = Position.Bottom;
    // We are shifting the dagre node position (anchor=center) to the top left
    // so it matches the React Flow node anchor point (top left).
    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };
    return node;
  });
  
  return { nodes, edges };
};

const DependencyGraph = ({ nodes: rawNodes, prediction, onNodeClick }: Props) => {
  const [filter, setFilter] = React.useState<"All" | "Blocked" | "Critical">("All");

  const { initialNodes, initialEdges } = useMemo(() => {
    let filteredNodes = rawNodes;
    
    if (filter === "Blocked") {
      filteredNodes = rawNodes.filter(n => prediction.allAtRiskTasks.some(t => t.taskId === n.taskId && t.reasons.some(r => r.toLowerCase().includes("block"))));
    } else if (filter === "Critical") {
      filteredNodes = rawNodes.filter(n => prediction.criticalTasks.some(t => t.taskId === n.taskId));
    }

    const flowNodes = filteredNodes.map((n) => {
      const pred = prediction.allAtRiskTasks.find(t => t.taskId === n.taskId);
      const isCritical = pred?.isOnCriticalPath || false;
      const isBlocked = pred?.reasons.some(r => r.toLowerCase().includes("block")) || false;
      const delay = pred?.expectedDelayDays || 0;

      return {
        id: String(n.taskId),
        type: "task",
        data: { 
          taskId: n.taskId, 
          title: n.metadata.title, 
          status: n.metadata.status,
          isCritical,
          isBlocked,
          delay
        },
        position: { x: 0, y: 0 }, // Will be calculated by dagre
      };
    });

    const flowEdges: any[] = [];
    rawNodes.forEach(n => {
      n.outgoingEdges.forEach(targetId => {
        const sourceIsCritical = prediction.criticalTasks.some(t => t.taskId === n.taskId);
        const targetIsCritical = prediction.criticalTasks.some(t => t.taskId === targetId);
        const isCriticalEdge = sourceIsCritical && targetIsCritical;
        
        flowEdges.push({
          id: `e${n.taskId}-${targetId}`,
          source: String(n.taskId),
          target: String(targetId),
          animated: isCriticalEdge,
          style: isCriticalEdge ? { stroke: '#ef4444', strokeWidth: 2 } : { stroke: '#9ca3af' },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isCriticalEdge ? '#ef4444' : '#9ca3af',
          },
        });
      });
    });

    const { nodes: initialNodes, edges: initialEdges } = getLayoutedElements(flowNodes, flowEdges);
    return { initialNodes, initialEdges };
  }, [rawNodes, prediction, filter]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes/edges when filter changes
  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const handleNodeClick = useCallback((_: any, node: any) => {
    onNodeClick(Number(node.id));
  }, [onNodeClick]);

  return (
    <div className="h-[600px] w-full rounded-xl border border-gray-100 bg-gray-50 shadow-sm dark:border-dark-secondary dark:bg-dark-tertiary">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
      >
        <Controls />
        <MiniMap zoomable pannable nodeClassName={(n) => {
          if (n.data?.isCritical) return "bg-red-500";
          if (n.data?.isBlocked) return "bg-amber-500";
          return "bg-gray-400";
        }} />
        <Background color="#ccc" gap={16} />
        <Panel position="top-right" className="bg-white/90 dark:bg-dark-secondary/90 backdrop-blur-sm p-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select 
              className="text-xs bg-transparent focus:outline-none dark:text-white cursor-pointer"
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
            >
              <option value="All">All Tasks</option>
              <option value="Blocked">Blocked Tasks</option>
              <option value="Critical">Critical Path</option>
            </select>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default DependencyGraph;
