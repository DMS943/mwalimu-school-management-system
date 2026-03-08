/**
 * Offline Manager for PWA Support
 * Handles offline data storage, synchronization, and queue management
 */

export interface OfflineAction {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  table: string;
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSync: Date | null;
  pendingActions: number;
  isSyncing: boolean;
}

export class OfflineManager {
  private dbName = 'CumulativeScoreRankAnalyzerOffline';
  private version = 1;
  private db: IDBDatabase | null = null;
  private actionQueue: OfflineAction[] = [];
  private syncStatus: SyncStatus = {
    isOnline: navigator.onLine,
    lastSync: null,
    pendingActions: 0,
    isSyncing: false
  };
  private listeners: Array<(status: SyncStatus) => void> = [];

  constructor() {
    this.initializeDatabase();
    this.setupEventListeners();
  }

  /**
   * Initialize IndexedDB for offline storage
   */
  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.loadActionQueue();
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores for different data types
        if (!db.objectStoreNames.contains('students')) {
          const studentStore = db.createObjectStore('students', { keyPath: 'id' });
          studentStore.createIndex('student_number', 'student_number', { unique: true });
        }

        if (!db.objectStoreNames.contains('marks')) {
          const marksStore = db.createObjectStore('marks', { keyPath: 'id' });
          marksStore.createIndex('student_id', 'student_id');
          marksStore.createIndex('subject_id', 'subject_id');
          marksStore.createIndex('term_id', 'term_id');
        }

        if (!db.objectStoreNames.contains('classes')) {
          db.createObjectStore('classes', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('subjects')) {
          db.createObjectStore('subjects', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('terms')) {
          db.createObjectStore('terms', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('actionQueue')) {
          db.createObjectStore('actionQueue', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('syncStatus')) {
          db.createObjectStore('syncStatus', { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Setup event listeners for online/offline status
   */
  private setupEventListeners(): void {
    window.addEventListener('online', () => {
      this.syncStatus.isOnline = true;
      this.notifyListeners();
      this.syncPendingActions();
    });

    window.addEventListener('offline', () => {
      this.syncStatus.isOnline = false;
      this.notifyListeners();
    });
  }

  /**
   * Store data offline
   */
  async storeData(table: string, data: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([table], 'readwrite');
      const store = transaction.objectStore(table);
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Retrieve data from offline storage
   */
  async getData(table: string, key?: string): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([table], 'readonly');
      const store = transaction.objectStore(table);
      
      if (key) {
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } else {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }
    });
  }

  /**
   * Queue an action for later synchronization
   */
  async queueAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const offlineAction: OfflineAction = {
      ...action,
      id: this.generateId(),
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: 3
    };

    this.actionQueue.push(offlineAction);
    this.syncStatus.pendingActions = this.actionQueue.length;
    this.notifyListeners();

    // Store in IndexedDB
    await this.storeData('actionQueue', offlineAction);

    // If online, try to sync immediately
    if (this.syncStatus.isOnline) {
      this.syncPendingActions();
    }
  }

  /**
   * Sync pending actions with server
   */
  async syncPendingActions(): Promise<void> {
    if (!this.syncStatus.isOnline || this.syncStatus.isSyncing) return;

    this.syncStatus.isSyncing = true;
    this.notifyListeners();

    const actionsToSync = [...this.actionQueue];
    const successfulActions: string[] = [];

    for (const action of actionsToSync) {
      try {
        await this.executeAction(action);
        successfulActions.push(action.id);
      } catch (error) {
        console.error(`Failed to sync action ${action.id}:`, error);
        action.retryCount++;
        
        if (action.retryCount >= action.maxRetries) {
          console.error(`Action ${action.id} exceeded max retries`);
        }
      }
    }

    // Remove successful actions from queue
    this.actionQueue = this.actionQueue.filter(
      action => !successfulActions.includes(action.id)
    );

    this.syncStatus.pendingActions = this.actionQueue.length;
    this.syncStatus.lastSync = new Date();
    this.syncStatus.isSyncing = false;
    this.notifyListeners();

    // Update IndexedDB
    await this.updateActionQueue();
  }

  /**
   * Execute a single action
   */
  private async executeAction(action: OfflineAction): Promise<void> {
    // This would integrate with your Supabase client
    // For now, we'll simulate the action
    console.log(`Executing action: ${action.type} on ${action.table}`, action.data);
    
    // In a real implementation, you would:
    // 1. Import your Supabase client
    // 2. Execute the appropriate CRUD operation
    // 3. Handle success/error responses
    
    // Example:
    // const { supabase } = await import('@/integrations/supabase/client');
    // 
    // switch (action.type) {
    //   case 'CREATE':
    //     await supabase.from(action.table).insert(action.data);
    //     break;
    //   case 'UPDATE':
    //     await supabase.from(action.table).update(action.data).eq('id', action.data.id);
    //     break;
    //   case 'DELETE':
    //     await supabase.from(action.table).delete().eq('id', action.data.id);
    //     break;
    // }
  }

  /**
   * Load action queue from IndexedDB
   */
  private async loadActionQueue(): Promise<void> {
    try {
      const actions = await this.getData('actionQueue');
      this.actionQueue = actions || [];
      this.syncStatus.pendingActions = this.actionQueue.length;
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to load action queue:', error);
    }
  }

  /**
   * Update action queue in IndexedDB
   */
  private async updateActionQueue(): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['actionQueue'], 'readwrite');
    const store = transaction.objectStore('actionQueue');
    
    // Clear existing actions
    await store.clear();
    
    // Add current actions
    for (const action of this.actionQueue) {
      await store.add(action);
    }
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Subscribe to sync status changes
   */
  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.push(listener);
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify listeners of status changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.syncStatus));
  }

  /**
   * Clear all offline data
   */
  async clearOfflineData(): Promise<void> {
    if (!this.db) return;

    const tables = ['students', 'marks', 'classes', 'subjects', 'terms', 'actionQueue'];
    
    for (const table of tables) {
      const transaction = this.db.transaction([table], 'readwrite');
      const store = transaction.objectStore(table);
      await store.clear();
    }

    this.actionQueue = [];
    this.syncStatus.pendingActions = 0;
    this.notifyListeners();
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if data exists offline
   */
  async hasOfflineData(table: string, key: string): Promise<boolean> {
    try {
      const data = await this.getData(table, key);
      return data !== undefined;
    } catch {
      return false;
    }
  }

  /**
   * Get offline data count
   */
  async getOfflineDataCount(table: string): Promise<number> {
    try {
      const data = await this.getData(table);
      return Array.isArray(data) ? data.length : 0;
    } catch {
      return 0;
    }
  }
}

// Singleton instance
export const offlineManager = new OfflineManager();

// Utility functions for PWA
export const registerServiceWorker = async (): Promise<void> => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
};

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if ('Notification' in window) {
    return await Notification.requestPermission();
  }
  return 'denied';
};

export const showNotification = (title: string, options?: NotificationOptions): void => {
  if (Notification.permission === 'granted') {
    new Notification(title, options);
  }
};

// Service Worker for offline functionality
export const createServiceWorker = (): string => {
  return `
    const CACHE_NAME = 'csra-v1';
    const urlsToCache = [
      '/',
      '/static/js/bundle.js',
      '/static/css/main.css',
      '/manifest.json'
    ];

    self.addEventListener('install', (event) => {
      event.waitUntil(
        caches.open(CACHE_NAME)
          .then((cache) => cache.addAll(urlsToCache))
      );
    });

    self.addEventListener('fetch', (event) => {
      event.respondWith(
        caches.match(event.request)
          .then((response) => {
            if (response) {
              return response;
            }
            return fetch(event.request);
          })
      );
    });
  `;
};
