export function PostCardSkeleton() {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden shadow-lg animate-pulse">
      <div className="bg-gray-800 px-3 py-2 flex items-center space-x-1.5 border-b border-gray-700">
        <div className="w-2.5 h-2.5 rounded-full bg-gray-700" />
        <div className="w-2.5 h-2.5 rounded-full bg-gray-700" />
        <div className="w-2.5 h-2.5 rounded-full bg-gray-700" />
      </div>

      <div className="flex">
        <div className="flex flex-col items-center p-4 space-y-1 bg-gray-850 border-r border-gray-700 w-16">
          <div className="w-5 h-5 bg-gray-800 rounded"></div>
          <div className="w-8 h-4 bg-gray-800 rounded"></div>
          <div className="w-5 h-5 bg-gray-800 rounded"></div>
        </div>

        <div className="flex-1 p-4">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-6 h-6 bg-gray-800 rounded-full"></div>
            <div className="w-24 h-3 bg-gray-800 rounded"></div>
            <div className="w-16 h-3 bg-gray-800 rounded"></div>
          </div>

          <div className="w-3/4 h-5 bg-gray-800 rounded mb-3"></div>
          <div className="w-full h-48 bg-gray-800 rounded mb-3"></div>
          <div className="w-full h-3 bg-gray-800 rounded mb-2"></div>
          <div className="w-5/6 h-3 bg-gray-800 rounded mb-4"></div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-3 bg-gray-800 rounded"></div>
              <div className="w-12 h-3 bg-gray-800 rounded"></div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gray-800 rounded"></div>
              <div className="w-6 h-6 bg-gray-800 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PostDetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center space-x-2 mb-6 animate-pulse">
        <div className="w-5 h-5 bg-gray-800 rounded"></div>
        <div className="w-20 h-4 bg-gray-800 rounded"></div>
      </div>

      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-lg overflow-hidden animate-pulse">
        <div className="bg-gray-800 px-3 py-2 flex items-center space-x-1.5 border-b border-gray-700">
          <div className="w-2.5 h-2.5 rounded-full bg-gray-700" />
          <div className="w-2.5 h-2.5 rounded-full bg-gray-700" />
          <div className="w-2.5 h-2.5 rounded-full bg-gray-700" />
        </div>

        <div className="p-8">
          <div className="flex items-start space-x-4 mb-6">
            <div className="flex flex-col items-center space-y-2 bg-gray-850 rounded-lg p-3 border border-gray-700">
              <div className="w-6 h-6 bg-gray-800 rounded"></div>
              <div className="w-8 h-6 bg-gray-800 rounded"></div>
              <div className="w-6 h-6 bg-gray-800 rounded"></div>
            </div>

            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gray-800 rounded-full"></div>
                <div className="space-y-2">
                  <div className="w-32 h-4 bg-gray-800 rounded"></div>
                  <div className="w-24 h-3 bg-gray-800 rounded"></div>
                </div>
              </div>

              <div className="w-3/4 h-8 bg-gray-800 rounded mb-4"></div>
              <div className="w-1/2 h-5 bg-gray-800 rounded mb-6"></div>

              <div className="w-full h-64 bg-gray-800 rounded mb-6"></div>

              {[...Array(5)].map((_, i) => (
                <div key={i} className="mb-2">
                  <div className="w-full h-4 bg-gray-800 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CommentSkeleton() {
  return (
    <div className="flex space-x-3 animate-pulse">
      <div className="w-8 h-8 bg-gray-800 rounded-full flex-shrink-0"></div>
      <div className="flex-1 space-y-2">
        <div className="flex items-center space-x-2">
          <div className="w-24 h-3 bg-gray-800 rounded"></div>
          <div className="w-16 h-3 bg-gray-800 rounded"></div>
        </div>
        <div className="w-full h-3 bg-gray-800 rounded"></div>
        <div className="w-3/4 h-3 bg-gray-800 rounded"></div>
      </div>
    </div>
  );
}

export function UserCardSkeleton() {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 animate-pulse">
      <div className="flex items-start space-x-4">
        <div className="w-16 h-16 bg-gray-800 rounded-full"></div>
        <div className="flex-1 space-y-3">
          <div className="space-y-2">
            <div className="w-32 h-4 bg-gray-800 rounded"></div>
            <div className="w-24 h-3 bg-gray-800 rounded"></div>
          </div>
          <div className="w-full h-3 bg-gray-800 rounded"></div>
          <div className="w-5/6 h-3 bg-gray-800 rounded"></div>
          <div className="flex items-center space-x-4">
            <div className="w-16 h-3 bg-gray-800 rounded"></div>
            <div className="w-16 h-3 bg-gray-800 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TaskCardSkeleton() {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 animate-pulse">
      <div className="flex items-start justify-between mb-2">
        <div className="w-3/4 h-4 bg-gray-700 rounded"></div>
        <div className="w-16 h-5 bg-gray-700 rounded"></div>
      </div>
      <div className="space-y-2 mb-3">
        <div className="w-full h-3 bg-gray-700 rounded"></div>
        <div className="w-2/3 h-3 bg-gray-700 rounded"></div>
      </div>
      <div className="flex items-center space-x-2">
        <div className="w-12 h-4 bg-gray-700 rounded"></div>
        <div className="w-12 h-4 bg-gray-700 rounded"></div>
      </div>
    </div>
  );
}

export function TagCardSkeleton() {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 bg-gray-800 rounded"></div>
          <div className="w-32 h-5 bg-gray-800 rounded"></div>
        </div>
        <div className="w-20 h-6 bg-gray-800 rounded-full"></div>
      </div>
      <div className="space-y-2 mb-3">
        <div className="w-full h-3 bg-gray-800 rounded"></div>
        <div className="w-3/4 h-3 bg-gray-800 rounded"></div>
      </div>
      <div className="flex items-center space-x-4">
        <div className="w-16 h-3 bg-gray-800 rounded"></div>
        <div className="w-16 h-3 bg-gray-800 rounded"></div>
      </div>
    </div>
  );
}

export function BadgeSkeleton() {
  return (
    <div className="p-4 rounded-lg border border-gray-700 bg-gray-900 animate-pulse">
      <div className="flex flex-col items-center space-y-2 text-center">
        <div className="w-12 h-12 bg-gray-800 rounded-full"></div>
        <div className="w-24 h-4 bg-gray-800 rounded"></div>
        <div className="w-32 h-3 bg-gray-800 rounded"></div>
        <div className="w-20 h-3 bg-gray-800 rounded"></div>
      </div>
    </div>
  );
}

export function ReputationBadgeSkeleton() {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 font-mono animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-full bg-gray-800"></div>
          <div className="space-y-2">
            <div className="w-24 h-5 bg-gray-800 rounded"></div>
            <div className="w-32 h-3 bg-gray-800 rounded"></div>
          </div>
        </div>
        <div className="text-right">
          <div className="w-16 h-8 bg-gray-800 rounded mb-1"></div>
          <div className="w-24 h-3 bg-gray-800 rounded"></div>
        </div>
      </div>
      <div className="space-y-1">
        <div className="w-full h-2 bg-gray-800 rounded-full"></div>
        <div className="w-32 h-3 bg-gray-800 rounded mx-auto"></div>
      </div>
    </div>
  );
}

export function TrendingTopicsSkeleton() {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-lg animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 bg-gray-800 rounded"></div>
          <div className="w-32 h-5 bg-gray-800 rounded"></div>
        </div>
        <div className="w-16 h-3 bg-gray-800 rounded"></div>
      </div>

      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-gray-800 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="w-3/4 h-4 bg-gray-800 rounded"></div>
              <div className="w-1/2 h-3 bg-gray-800 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
