export function showToast(message: string, duration: number = 2000): void {
  // Remove any existing toasts
  const existingToast = document.getElementById('anchor-toast');
  if (existingToast) {
    existingToast.remove();
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.id = 'anchor-toast';
  toast.className = 'fixed bottom-8 right-8 bg-gray-900 border border-terminal-green text-terminal-green px-4 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2 font-mono text-sm animate-slide-up';
  toast.innerHTML = `
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
    </svg>
    <span>${message}</span>
  `;

  // Add to DOM
  document.body.appendChild(toast);

  // Add animation styles if not already present
  if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      @keyframes slide-up {
        from {
          transform: translateY(100px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      @keyframes slide-down {
        from {
          transform: translateY(0);
          opacity: 1;
        }
        to {
          transform: translateY(100px);
          opacity: 0;
        }
      }
      .animate-slide-up {
        animation: slide-up 0.3s ease-out;
      }
      .animate-slide-down {
        animation: slide-down 0.3s ease-in;
      }
    `;
    document.head.appendChild(style);
  }

  // Remove after duration
  setTimeout(() => {
    toast.classList.remove('animate-slide-up');
    toast.classList.add('animate-slide-down');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, duration);
}
