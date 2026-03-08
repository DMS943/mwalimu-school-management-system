import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Database,
  Upload,
  Download,
  AlertTriangle,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { offlineManager, SyncStatus } from '@/lib/offlineManager';

interface OfflineSyncManagerProps {
  className?: string;
}

const OfflineSyncManager: React.FC<OfflineSyncManagerProps> = ({ className }) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    lastSync: null,
    pendingActions: 0,
    isSyncing: false
  });
  const [offlineDataCount, setOfflineDataCount] = useState<{ [key: string]: number }>({});
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncDetails, setSyncDetails] = useState<{
    totalActions: number;
    completedActions: number;
    failedActions: number;
    currentAction?: string;
  }>({
    totalActions: 0,
    completedActions: 0,
    failedActions: 0
  });

  const { toast } = useToast();

  useEffect(() => {
    // Subscribe to sync status changes
    const unsubscribe = offlineManager.subscribe((status) => {
      setSyncStatus(status);
    });

    // Load initial data
    loadOfflineDataCount();

    return unsubscribe;
  }, []);

  const loadOfflineDataCount = async () => {
    try {
      const tables = ['students', 'marks', 'classes', 'subjects', 'terms'];
      const counts: { [key: string]: number } = {};
      
      for (const table of tables) {
        counts[table] = await offlineManager.getOfflineDataCount(table);
      }
      
      setOfflineDataCount(counts);
    } catch (error) {
      console.error('Failed to load offline data count:', error);
    }
  };

  const handleSyncNow = async () => {
    if (!syncStatus.isOnline) {
      toast({
        title: "No Internet Connection",
        description: "Please check your internet connection and try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSyncProgress(0);
      setSyncDetails({
        totalActions: syncStatus.pendingActions,
        completedActions: 0,
        failedActions: 0
      });

      // Simulate sync progress
      const interval = setInterval(() => {
        setSyncProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 10;
        });
      }, 200);

      await offlineManager.syncPendingActions();
      
      clearInterval(interval);
      setSyncProgress(100);
      
      toast({
        title: "Sync Complete",
        description: "All pending changes have been synchronized.",
      });

      // Reload data count
      loadOfflineDataCount();
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Failed to synchronize data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleClearOfflineData = async () => {
    try {
      await offlineManager.clearOfflineData();
      setOfflineDataCount({});
      toast({
        title: "Offline Data Cleared",
        description: "All offline data has been cleared.",
      });
    } catch (error) {
      toast({
        title: "Clear Failed",
        description: "Failed to clear offline data.",
        variant: "destructive",
      });
    }
  };

  const getConnectionStatus = () => {
    if (syncStatus.isOnline) {
      return {
        icon: <Wifi className="h-4 w-4 text-green-500" />,
        text: "Online",
        color: "text-green-600"
      };
    } else {
      return {
        icon: <WifiOff className="h-4 w-4 text-red-500" />,
        text: "Offline",
        color: "text-red-600"
      };
    }
  };

  const getSyncStatus = () => {
    if (syncStatus.isSyncing) {
      return {
        icon: <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />,
        text: "Syncing...",
        color: "text-blue-600"
      };
    } else if (syncStatus.pendingActions > 0) {
      return {
        icon: <Clock className="h-4 w-4 text-orange-500" />,
        text: `${syncStatus.pendingActions} pending`,
        color: "text-orange-600"
      };
    } else {
      return {
        icon: <CheckCircle className="h-4 w-4 text-green-500" />,
        text: "Up to date",
        color: "text-green-600"
      };
    }
  };

  const connectionStatus = getConnectionStatus();
  const syncStatusInfo = getSyncStatus();

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>Offline Sync Manager</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connection Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {connectionStatus.icon}
              <span className={`font-medium ${connectionStatus.color}`}>
                {connectionStatus.text}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {syncStatusInfo.icon}
              <span className={`font-medium ${syncStatusInfo.color}`}>
                {syncStatusInfo.text}
              </span>
            </div>
          </div>

          {/* Sync Progress */}
          {syncStatus.isSyncing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Syncing data...</span>
                <span className="text-sm text-muted-foreground">{syncProgress}%</span>
              </div>
              <Progress value={syncProgress} className="w-full" />
              {syncDetails.currentAction && (
                <p className="text-xs text-muted-foreground">
                  {syncDetails.currentAction}
                </p>
              )}
            </div>
          )}

          {/* Last Sync Info */}
          {syncStatus.lastSync && (
            <div className="text-sm text-muted-foreground">
              Last sync: {syncStatus.lastSync.toLocaleString()}
            </div>
          )}

          {/* Offline Data Count */}
          <div className="space-y-2">
            <h4 className="font-medium">Offline Data</h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(offlineDataCount).map(([table, count]) => (
                <div key={table} className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm capitalize">{table}</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Actions */}
          {syncStatus.pendingActions > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You have {syncStatus.pendingActions} pending actions that will be synchronized when you're online.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <Button
              onClick={handleSyncNow}
              disabled={!syncStatus.isOnline || syncStatus.isSyncing}
              className="flex-1"
            >
              {syncStatus.isSyncing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {syncStatus.isSyncing ? 'Syncing...' : 'Sync Now'}
            </Button>
            
            <Button
              variant="outline"
              onClick={loadOfflineDataCount}
              disabled={syncStatus.isSyncing}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Clear Data Button */}
          <Button
            variant="destructive"
            onClick={handleClearOfflineData}
            disabled={syncStatus.isSyncing}
            className="w-full"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Clear Offline Data
          </Button>

          {/* Offline Capabilities Info */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Data is automatically saved offline when you're not connected</p>
            <p>• Changes will sync automatically when connection is restored</p>
            <p>• You can continue working without internet</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OfflineSyncManager;
