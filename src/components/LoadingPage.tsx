import { BookOpen } from 'lucide-react';

interface LoadingPageProps {
  message?: string;
}

const LoadingPage = ({ message = "Loading..." }: LoadingPageProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zambian-green/10 to-zambian-orange/10">
      <div className="text-center space-y-6">
        {/* Logo and spinner container */}
        <div className="relative">
          <div className="w-16 h-16 border-4 border-zambian-green/30 border-t-zambian-green rounded-full animate-spin mx-auto"></div>
          <BookOpen className="w-8 h-8 text-zambian-green absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
        </div>
        
        {/* Loading text */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-zambian-green">
            Cumulative Score and Rank Analyzer
          </h2>
          <p className="text-lg text-zambian-green/80 font-medium">
            {message}
          </p>
          <p className="text-sm text-zambian-red/70">
            School Management System
          </p>
        </div>
        
        {/* Animated dots */}
        <div className="flex justify-center space-x-1">
          <div className="w-2 h-2 bg-zambian-orange rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2 h-2 bg-zambian-orange rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2 h-2 bg-zambian-orange rounded-full animate-bounce"></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingPage;