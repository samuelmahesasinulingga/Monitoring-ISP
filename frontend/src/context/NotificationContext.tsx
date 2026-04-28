import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  timestamp: Date;
}

interface NotificationContextType {
  notify: (message: string, type?: NotificationType) => void;
  unreadCount: number;
  clearUnread: () => void;
  history: Notification[];
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  const [history, setHistory] = useState<Notification[]>(() => {
    const saved = localStorage.getItem('notif_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
      } catch (e) { return []; }
    }
    return [];
  });

  const [unreadCount, setUnreadCount] = useState<number>(() => {
    const saved = localStorage.getItem('notif_unread_count');
    return saved ? parseInt(saved) || 0 : 0;
  });

  // Save to localStorage whenever history or unreadCount changes
  useEffect(() => {
    localStorage.setItem('notif_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('notif_unread_count', unreadCount.toString());
  }, [unreadCount]);

  const notify = useCallback((message: string, type: NotificationType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    const newNotification: Notification = { id, message, type, timestamp: new Date() };
    
    setNotifications((prev) => [...prev, newNotification]);
    setHistory((prev) => [newNotification, ...prev].slice(0, 50));
    setUnreadCount((prev) => prev + 1);

    // Auto remove from toast after 3 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 3000);
  }, []);

  const clearUnread = useCallback(() => {
    setUnreadCount(0);
  }, []);

  return (
    <NotificationContext.Provider value={{ notify, unreadCount, clearUnread, history }}>
      {children}
      {/* Container for Toasts */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        {notifications.map((n) => (
          <Toast key={n.id} message={n.message} type={n.type} onClose={() => setNotifications(prev => prev.filter(toast => toast.id !== n.id))} />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

const Toast: React.FC<{ message: string; type: NotificationType; onClose: () => void }> = ({ message, type, onClose }) => {
  const icons = {
    success: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
    error: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
    warning: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    info: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  };

  const colors = {
    success: 'bg-emerald-500 shadow-emerald-500/30',
    error: 'bg-rose-500 shadow-rose-500/30',
    warning: 'bg-amber-500 shadow-amber-500/30',
    info: 'bg-blue-500 shadow-blue-500/30',
  };

  return (
    <div 
      className={`pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-2xl text-white shadow-2xl animate-in slide-in-from-right fade-in duration-300 min-w-[300px] ${colors[type]}`}
      role="alert"
    >
      <div className="flex-shrink-0 bg-white/20 p-2 rounded-xl">
        {icons[type]}
      </div>
      <div className="flex-1 text-[13px] font-bold tracking-wide">
        {message}
      </div>
      <button 
        onClick={onClose}
        className="ml-2 hover:bg-white/20 p-1 rounded-lg transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};
