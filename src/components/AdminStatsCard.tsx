import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface AdminStatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: 'purple' | 'blue' | 'orange';
  trend?: string;
  loading?: boolean;
}

const AdminStatsCard = ({ title, value, icon: Icon, color, trend, loading }: AdminStatsCardProps) => {
  const colorClasses = {
    purple: {
      bg: 'bg-gradient-to-br from-purple-50 to-purple-100',
      iconBg: 'bg-gradient-to-br from-purple-400 to-purple-600',
      text: 'text-gray-800',
      number: 'text-gray-900'
    },
    blue: {
      bg: 'bg-gradient-to-br from-blue-50 to-blue-100', 
      iconBg: 'bg-gradient-to-br from-blue-400 to-blue-600',
      text: 'text-gray-800',
      number: 'text-gray-900'
    },
    orange: {
      bg: 'bg-gradient-to-br from-orange-50 to-orange-100',
      iconBg: 'bg-gradient-to-br from-orange-400 to-orange-600', 
      text: 'text-gray-800',
      number: 'text-gray-900'
    }
  };

  const classes = colorClasses[color];

  if (loading) {
    return (
      <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 animate-fade-in">
        <CardContent className={`p-6 ${classes.bg}`}>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-4 bg-gray-300 rounded animate-pulse w-20"></div>
              <div className="h-8 bg-gray-300 rounded animate-pulse w-16"></div>
            </div>
            <div className={`p-3 rounded-xl ${classes.iconBg} animate-pulse`}>
              <div className="w-6 h-6 bg-white/30 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 hover-scale animate-fade-in">
      <CardContent className={`p-6 ${classes.bg}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm font-medium ${classes.text} mb-2`}>
              {title}
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className={`text-3xl font-bold ${classes.number}`}>
                {typeof value === 'number' ? value.toLocaleString() : value}
              </h3>
              {trend && (
                <span className="text-xs text-green-600 font-medium">
                  {trend}
                </span>
              )}
            </div>
          </div>
          <div className={`p-3 rounded-xl ${classes.iconBg} shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminStatsCard;