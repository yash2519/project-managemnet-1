import { useDrag, useDrop } from "react-dnd";

export function useTaskDrop(status: string, moveTask: (taskId: number, toStatus: string) => void) {
  return useDrop(() => ({
    accept: "task",
    drop: (item: { id: number }) => moveTask(item.id, status),
    collect: (monitor: any) => ({
      isOver: !!monitor.isOver(),
    }),
  }));
}

export function useTaskDrag(taskId: number, isOwner: boolean, isAssigned: boolean) {
  return useDrag(() => ({
    type: "task",
    item: { id: taskId },
    canDrag: () => {
      return isOwner || isAssigned;
    },
    collect: (monitor: any) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [isOwner, isAssigned, taskId]);
}
