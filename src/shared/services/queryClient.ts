/**
 * React Query Configuration
 * Centralized data caching, synchronization, and state management
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Keep data in cache for 10 minutes when unused
      gcTime: 10 * 60 * 1000,
      // Retry failed queries 3 times with exponential backoff
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus to keep data fresh
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry mutations 2 times
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

/**
 * Preset configurations for different data types
 */
export const queryPresets = {
  // For frequently updated data (real-time)
  realtime: {
    staleTime: 1000, // 1 second
    gcTime: 5 * 60 * 1000,
  },
  // For stable data that rarely changes
  stable: {
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  },
  // For user-specific data
  personal: {
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  },
};
