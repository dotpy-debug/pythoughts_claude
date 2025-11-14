import { lazy, Suspense } from 'react';
import { Loader2, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const DraftEditor = lazy(() => import('../components/drafts/DraftEditor').then(module_ => ({ default: module_.DraftEditor })));

export function DraftsPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-4">
          <FileText size={48} className="text-gray-600 mx-auto" />
          <p className="text-gray-400">Please sign in to view your drafts</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-100 font-mono">
          <span className="text-terminal-green">$</span> drafts
        </h1>
        <p className="text-gray-400 font-mono text-sm mt-2">
          Manage your draft posts and unpublished content
        </p>
      </div>

      <Suspense fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-terminal-green" size={48} />
        </div>
      }>
        <DraftEditor postType="blog" onClose={() => {}} />
      </Suspense>
    </div>
  );
}
