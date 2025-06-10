// contexts/FileRefreshContext.tsx
'use client';
import { createContext, useContext, useState, useCallback } from 'react';

type FileRefreshContextType = {
  refreshFiles: () => void;
  onRefresh: () => void;
};

const FileRefreshContext = createContext<FileRefreshContextType | undefined>(undefined);

export const FileRefreshProvider = ({ children }: { children: React.ReactNode }) => {
  const [refreshFlag, setRefreshFlag] = useState(false);

  const refreshFiles = useCallback(() => {
    setRefreshFlag((prev) => !prev); // toggling flag forces subscribers to react
  }, []);

  const onRefresh = () => refreshFlag;

  return (
    <FileRefreshContext.Provider value={{ refreshFiles, onRefresh }}>
      {children}
    </FileRefreshContext.Provider>
  );
};

export const useFileRefresh = () => {
  const context = useContext(FileRefreshContext);
  if (!context) throw new Error('useFileRefresh must be used within FileRefreshProvider');
  return context;
};