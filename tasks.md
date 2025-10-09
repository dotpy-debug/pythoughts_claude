# Task Management System Documentation

## Overview

Pythoughts includes a comprehensive task management system with both traditional list view and an innovative infinite canvas view for visual task organization. The system supports full CRUD operations, task assignment, priority management, status tracking, and real-time collaboration.

## Features

### Core Functionality
- **Task CRUD Operations**: Create, read, update, and delete tasks
- **Status Management**: Track tasks through todo, in_progress, completed, and archived states
- **Priority Levels**: Organize tasks by low, medium, high, and urgent priorities
- **Due Date Tracking**: Set and monitor task deadlines with overdue indicators
- **Task Assignment**: Assign tasks to team members with creator/assignee tracking
- **Tag System**: Categorize tasks with custom tags for better organization
- **Filtering**: Filter tasks by status (all, todo, in_progress, completed)

### Views
1. **List View** (`TaskList.tsx`): Traditional grid-based task display with cards
2. **Canvas View** (`InfiniteCanvas.tsx`): Infinite canvas for visual task organization with drag-and-drop

### Components

#### TaskList
- Displays tasks in a responsive grid (1-3 columns based on screen size)
- Filters tasks by status
- Shows tasks created by or assigned to the current user
- Real-time loading states with spinner
- Empty state messaging
- Opens task details on click

#### TaskCard
- Compact task representation with key information
- Visual priority and status badges
- Due date display with overdue highlighting
- Tag display with icons
- Creator/assignee information
- Relative time display (e.g., "2 hours ago")
- Hover effects for better UX

#### TaskDetailModal
- Full task details view
- Inline editing capabilities
- Status and priority updates
- Due date management
- Task completion toggle
- Task deletion with confirmation
- Activity timestamps (created, completed)
- Permission-based editing (creator or assignee only)

#### CreateTaskModal
- Task creation form with validation
- Title and description inputs
- Priority selection dropdown
- Due date picker
- Tag management (add/remove tags)
- Form validation and error handling
- Loading states during submission

#### InfiniteCanvas
- Zoom and pan controls (zoom in/out, reset view)
- Drag-and-drop task positioning
- Grid background for visual reference
- Scale indicator showing current zoom level
- Add task button
- Empty state messaging
- Responsive to window size

#### CanvasTask
- Draggable task cards on canvas
- Terminal-style window chrome (red/yellow/green dots)
- Color-coded task indicators
- Compact title and description display
- Hover and drag states
- Click to open details

## Database Schema

### tasks Table
```sql
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'todo' 
    CHECK (status IN ('todo', 'in_progress', 'completed', 'archived')),
  priority text NOT NULL DEFAULT 'medium' 
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date timestamptz,
  assignee_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  creator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tags text[] DEFAULT '{}',
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Indexes:**
- `idx_tasks_assignee` on assignee_id
- `idx_tasks_creator` on creator_id
- `idx_tasks_status` on status
- `idx_tasks_priority` on priority
- `idx_tasks_due_date` on due_date
- `idx_tasks_tags` (GIN index) on tags

### canvas_tasks Table
```sql
CREATE TABLE canvas_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  x integer DEFAULT 0,
  y integer DEFAULT 0,
  color text DEFAULT '#A6E3A1',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Indexes:**
- `idx_canvas_tasks_user` on user_id

### task_comments Table
```sql
CREATE TABLE task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### task_activity_log Table
```sql
CREATE TABLE task_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  changes jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
```

## Row Level Security (RLS)

### tasks Table Policies
- **View**: All authenticated and anonymous users can view tasks
- **Create**: Authenticated users can create tasks (must be the creator)
- **Update**: Users can update tasks they created or are assigned to
- **Delete**: Users can only delete tasks they created

### canvas_tasks Table Policies
- **View**: Users can only view their own canvas tasks
- **Create**: Users can only create canvas tasks for themselves
- **Update**: Users can only update their own canvas tasks
- **Delete**: Users can only delete their own canvas tasks

### task_comments Table Policies
- Similar RLS structure (not fully detailed in current implementation)

### task_activity_log Table Policies
- Similar RLS structure (not fully detailed in current implementation)

## TypeScript Types

```typescript
export type Task = {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string | null;
  assignee_id: string | null;
  creator_id: string;
  tags: string[];
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  assignee?: Profile;
};

export type TaskComment = {
  id: string;
  content: string;
  author_id: string;
  task_id: string;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
};

export type TaskActivity = {
  id: string;
  task_id: string;
  user_id: string;
  action: string;
  changes: Record<string, any>;
  created_at: string;
};
```

## Usage Examples

### Creating a Task
```typescript
const { error } = await supabase.from('tasks').insert({
  title: 'Implement new feature',
  description: 'Add user authentication',
  priority: 'high',
  due_date: '2025-10-10',
  creator_id: user.id,
  assignee_id: user.id,
  tags: ['feature', 'auth'],
  status: 'todo',
});
```

### Querying Tasks
```typescript
const { data, error } = await supabase
  .from('tasks')
  .select(`
    *,
    profiles!tasks_creator_id_fkey(id, username, avatar_url),
    assignee:profiles!tasks_assignee_id_fkey(id, username, avatar_url)
  `)
  .or(`creator_id.eq.${user.id},assignee_id.eq.${user.id}`)
  .eq('status', 'todo')
  .order('created_at', { ascending: false });
```

### Updating Task Status
```typescript
const { error } = await supabase
  .from('tasks')
  .update({ 
    status: 'completed',
    completed_at: new Date().toISOString()
  })
  .eq('id', taskId);
```

### Deleting a Task
```typescript
const { error } = await supabase
  .from('tasks')
  .delete()
  .eq('id', taskId);
```

## UI/UX Features

### Visual Design
- Terminal-inspired aesthetic with JetBrains Mono font
- LogRocket color palette (purple/blue/cyan gradients)
- Card-based layouts with hover effects
- Smooth animations and transitions
- Responsive grid layouts

### Status Colors
- **todo**: Default gray
- **in_progress**: Primary blue
- **completed**: Success green
- **archived**: Purple

### Priority Colors
- **low**: Default gray
- **medium**: Primary blue
- **high**: Warning yellow/orange
- **urgent**: Danger red

### Interactive Elements
- Hover states on all clickable elements
- Loading spinners during async operations
- Confirmation dialogs for destructive actions
- Inline editing with save/cancel options
- Drag-and-drop on infinite canvas
- Zoom controls with visual feedback

## Integration Points

### Authentication
- Uses `AuthContext` for user state
- Requires authenticated user for task operations
- User ID used for creator_id and assignee_id

### Real-time Updates
- Manual refresh after task operations
- Callback-based update propagation
- Key-based re-rendering for task lists

### Navigation
- Integrated into main app navigation
- Tab-based switching between views
- Modal-based task creation and editing

## Performance Considerations

### Optimizations
- Lazy loading of task components
- Efficient Supabase queries with proper joins
- Indexed database columns for fast filtering
- Optimistic UI updates where applicable
- Debounced search and filter operations

### Caching
- Component-level state management
- Callback-based cache invalidation
- Refresh keys for forced re-renders

## Future Enhancements

### Planned Features
- Task comments system (schema exists, UI pending)
- Activity logging (schema exists, UI pending)
- Task collaboration and sharing
- Subtasks and task dependencies
- Task templates
- Bulk operations
- Advanced filtering and search
- Task notifications
- Calendar view
- Kanban board view
- Task time tracking
- File attachments
- Task duplication
- Export functionality

### Technical Improvements
- Real-time subscriptions for live updates
- Optimistic UI updates
- Offline support
- Better error handling and recovery
- Comprehensive testing suite
- Performance monitoring
- Analytics integration

## File Structure

```
src/components/tasks/
├── TaskList.tsx           # Main task list view
├── TaskCard.tsx           # Individual task card
├── TaskDetailModal.tsx    # Task details and editing
├── CreateTaskModal.tsx    # Task creation form
├── InfiniteCanvas.tsx     # Canvas view container
└── CanvasTask.tsx         # Draggable canvas task card

postgres/migrations/
├── 20251003042251_add_tasks_and_better_auth_tables.sql
└── 20251003051803_add_canvas_tasks_table.sql
```

## Dependencies

### Core Libraries
- **React 18**: Component framework
- **Supabase**: Database and authentication
- **@dnd-kit/core**: Drag-and-drop functionality
- **react-zoom-pan-pinch**: Canvas zoom and pan controls
- **Lucide React**: Icons

### Utilities
- **dateUtils**: Relative time formatting
- **clsx/tailwind-merge**: Conditional styling

## Best Practices

### Code Organization
- Separate components for each concern
- Reusable UI components (Button, Badge, Modal, Input)
- Type-safe with TypeScript
- Consistent naming conventions

### State Management
- Local component state with useState
- Context for global auth state
- Callback props for parent-child communication
- Loading and error states for all async operations

### Database Operations
- Always check user authentication
- Use RLS policies for security
- Proper error handling
- Optimized queries with indexes

### User Experience
- Loading indicators for async operations
- Empty states with helpful messaging
- Confirmation for destructive actions
- Inline editing where appropriate
- Keyboard shortcuts (future enhancement)

## Troubleshooting

### Common Issues

**Tasks not loading:**
- Check user authentication
- Verify Supabase connection
- Check RLS policies
- Inspect browser console for errors

**Cannot update task:**
- Verify user is creator or assignee
- Check RLS policies
- Ensure task ID is valid

**Canvas tasks not dragging:**
- Check @dnd-kit installation
- Verify sensor configuration
- Check for conflicting event handlers

**Performance issues:**
- Check number of tasks loaded
- Verify database indexes
- Monitor network requests
- Consider pagination for large datasets

## Testing

### Manual Testing Checklist
- [ ] Create task with all fields
- [ ] Create task with minimal fields
- [ ] Update task status
- [ ] Update task priority
- [ ] Update task due date
- [ ] Add and remove tags
- [ ] Assign task to user
- [ ] Complete task
- [ ] Delete task
- [ ] Filter by status
- [ ] Drag task on canvas
- [ ] Zoom and pan canvas
- [ ] Test with overdue tasks
- [ ] Test permission restrictions

### Automated Testing
- Unit tests for components (pending)
- Integration tests for database operations (pending)
- E2E tests for user flows (pending)

## Security Considerations

- All database operations protected by RLS
- User authentication required for mutations
- Creator/assignee validation on updates
- SQL injection prevention via parameterized queries
- XSS prevention via React's built-in escaping
- CSRF protection via Supabase auth tokens

## Accessibility

### Current Implementation
- Semantic HTML elements
- Keyboard navigation support (partial)
- Focus states on interactive elements
- Color contrast compliance
- Screen reader friendly labels (partial)

### Improvements Needed
- ARIA labels for all interactive elements
- Keyboard shortcuts for common actions
- Better focus management in modals
- Announcement of state changes
- High contrast mode support

## Monitoring and Analytics

### Metrics to Track
- Task creation rate
- Task completion rate
- Average time to completion
- Most used priorities
- Most used tags
- User engagement with canvas view
- Error rates

### Logging
- Task CRUD operations
- User actions
- Error events
- Performance metrics

---

**Last Updated**: October 3, 2025
**Version**: 1.0
**Maintainer**: Pythoughts Development Team
