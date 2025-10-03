import { useState, useRef } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Plus, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { ShadcnButton } from '../ui/ShadcnButton';
import { CanvasTask } from './CanvasTask';

type Task = {
  id: string;
  title: string;
  description: string;
  x: number;
  y: number;
  color: string;
};

type InfiniteCanvasProps = {
  tasks: Task[];
  onTaskMove: (taskId: string, x: number, y: number) => void;
  onTaskClick: (task: Task) => void;
  onAddTask: () => void;
};

export function InfiniteCanvas({ tasks, onTaskMove, onTaskClick, onAddTask }: InfiniteCanvasProps) {
  const [scale, setScale] = useState(1);
  const transformRef = useRef<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    const taskId = active.id as string;
    const task = tasks.find(t => t.id === taskId);

    if (task) {
      onTaskMove(taskId, task.x + delta.x / scale, task.y + delta.y / scale);
    }
  };

  const handleZoomIn = () => {
    transformRef.current?.zoomIn(0.2);
  };

  const handleZoomOut = () => {
    transformRef.current?.zoomOut(0.2);
  };

  const handleReset = () => {
    transformRef.current?.resetTransform();
  };

  return (
    <div className="relative w-full h-[calc(100vh-12rem)] bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
      <div className="absolute top-4 left-4 z-50 flex items-center space-x-2">
        <div className="bg-gray-800/90 backdrop-blur-sm border border-gray-700 rounded-lg px-3 py-2">
          <span className="text-xs text-gray-400 font-mono">
            $ canvas_zoom: {Math.round(scale * 100)}%
          </span>
        </div>
      </div>

      <div className="absolute top-4 right-4 z-50 flex flex-col space-y-2">
        <ShadcnButton
          size="icon"
          variant="secondary"
          onClick={onAddTask}
          title="Add Task"
        >
          <Plus className="h-4 w-4" />
        </ShadcnButton>
        <ShadcnButton
          size="icon"
          variant="secondary"
          onClick={handleZoomIn}
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </ShadcnButton>
        <ShadcnButton
          size="icon"
          variant="secondary"
          onClick={handleZoomOut}
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </ShadcnButton>
        <ShadcnButton
          size="icon"
          variant="secondary"
          onClick={handleReset}
          title="Reset View"
        >
          <Maximize className="h-4 w-4" />
        </ShadcnButton>
      </div>

      <TransformWrapper
        ref={transformRef}
        initialScale={1}
        minScale={0.3}
        maxScale={3}
        centerOnInit
        limitToBounds={false}
        onTransformed={(ref) => setScale(ref.state.scale)}
      >
        <TransformComponent
          wrapperStyle={{
            width: '100%',
            height: '100%',
          }}
          contentStyle={{
            width: '100%',
            height: '100%',
          }}
        >
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="relative w-[5000px] h-[5000px]">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, rgba(107, 114, 128, 0.1) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(107, 114, 128, 0.1) 1px, transparent 1px)
                  `,
                  backgroundSize: '50px 50px',
                }}
              />

              {tasks.map((task) => (
                <CanvasTask
                  key={task.id}
                  task={task}
                  onClick={() => onTaskClick(task)}
                />
              ))}

              {tasks.length === 0 && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                  <div className="text-gray-600 font-mono">
                    <p className="text-lg mb-2">$ canvas_empty</p>
                    <p className="text-sm">Click the + button to add your first task</p>
                  </div>
                </div>
              )}
            </div>
          </DndContext>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
