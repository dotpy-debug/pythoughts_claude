import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const TaskList = lazy(() => import('../components/tasks/TaskList').then(mod => ({ default: mod.TaskList })));

export function TasksPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-terminal-green" size={48} />
      </div>
    }>
      <TaskList />
    </Suspense>
  );
}
