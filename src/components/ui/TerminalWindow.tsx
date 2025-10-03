import { ReactNode } from 'react';

type TerminalWindowProps = {
  title?: string;
  children: ReactNode;
  className?: string;
  showTrafficLights?: boolean;
};

export function TerminalWindow({
  title = 'Terminal',
  children,
  className = '',
  showTrafficLights = true
}: TerminalWindowProps) {
  return (
    <div className={`bg-gray-900 rounded-lg shadow-2xl overflow-hidden ${className}`}>
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center space-x-2">
          {showTrafficLights && (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors cursor-pointer" />
              <div className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400 transition-colors cursor-pointer" />
              <div className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400 transition-colors cursor-pointer" />
            </div>
          )}
        </div>
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <span className="text-gray-400 text-sm font-mono">{title}</span>
        </div>
        <div className="w-16" />
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}

export function TerminalCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-gray-900 border border-gray-700 rounded-lg overflow-hidden ${className}`}>
      <div className="bg-gray-800 px-3 py-2 flex items-center space-x-1.5 border-b border-gray-700">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
      </div>
      <div className="p-4 text-gray-100">
        {children}
      </div>
    </div>
  );
}
