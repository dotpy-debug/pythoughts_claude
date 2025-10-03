export function Footer() {
  return (
    <footer className="bg-gradient-to-b from-gray-50 to-white border-t border-gray-200 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-purple rounded-lg flex items-center justify-center shadow-glow-purple">
                <span className="text-white font-bold text-lg font-mono">$</span>
              </div>
              <span className="text-xl font-bold text-gray-900 font-mono">pythoughts</span>
            </div>
            <p className="text-gray-600 max-w-md">
              A community-driven platform for sharing ideas, discussing topics, and connecting with people who think like you.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Community</h3>
            <ul className="space-y-2 text-gray-600">
              <li>
                <a href="#" className="hover:text-logrocket-purple-500 transition-colors">
                  Guidelines
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-logrocket-purple-500 transition-colors">
                  FAQ
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-logrocket-purple-500 transition-colors">
                  Support
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Legal</h3>
            <ul className="space-y-2 text-gray-600">
              <li>
                <a href="#" className="hover:text-logrocket-purple-500 transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-logrocket-purple-500 transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-logrocket-purple-500 transition-colors">
                  Cookie Policy
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200 text-center text-gray-600 text-sm">
          <p>&copy; 2025 Pythoughts. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
