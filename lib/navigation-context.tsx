"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface NavigationContextType {
  isBottomNavHidden: boolean;
  setIsBottomNavHidden: (hidden: boolean) => void;
  isSidebarHidden: boolean;
  setIsSidebarHidden: (hidden: boolean) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [isBottomNavHidden, setIsBottomNavHidden] = useState(false);
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);

  return (
    <NavigationContext.Provider value={{
      isBottomNavHidden,
      setIsBottomNavHidden,
      isSidebarHidden,
      setIsSidebarHidden
    }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigationVisibility() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigationVisibility must be used within a NavigationProvider');
  }
  return context;
}


