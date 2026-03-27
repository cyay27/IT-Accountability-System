/**
 * Custom React Query Hooks
 * Integrate React Query with Firestore for efficient caching and data management
 */

import { useQuery, useMutation, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { db } from '../firebase/firebase';
import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy } from 'firebase/firestore';

interface QueryOptions {
  filters?: any[];
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
  pageSize?: number;
  currentPage?: number;
}

/**
 * Hook to fetch paginated records with auto-caching
 */
export function usePaginatedRecords(
  collectionName: string,
  options: QueryOptions & { enabled?: boolean } = {}
): UseQueryResult<any, Error> {
  const { enabled = true, ...queryOptions } = options;

  return useQuery({
    queryKey: [collectionName, queryOptions],
    queryFn: async () => {
      const filters = queryOptions.filters || [];
      const orderByField = queryOptions.orderByField || 'updatedAt';
      const orderDirection = queryOptions.orderDirection || 'desc';

      const constraints = [
        ...filters,
        orderBy(orderByField, orderDirection),
      ];

      const q = query(collection(db, collectionName), ...constraints);
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
}

/**
 * Hook to fetch a single record by ID
 */
export function useRecord(
  collectionName: string,
  recordId: string | null,
  enabled: boolean = true
): UseQueryResult<any, Error> {
  return useQuery({
    queryKey: [collectionName, recordId],
    queryFn: async () => {
      if (!recordId) return null;

      const snapshot = await getDocs(query(collection(db, collectionName)));
      if (snapshot.empty) return null;
      const docData = snapshot.docs[0];
      return {
        id: docData.id,
        ...docData.data(),
      };
    },
    enabled: enabled && !!recordId,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to create a new record
 */
export function useCreateRecord(collectionName: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      return await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    },
    onSuccess: () => {
      // Invalidate cache to refetch latest records
      queryClient.invalidateQueries({ queryKey: [collectionName] });
    },
  });
}

/**
 * Hook to update a record
 */
export function useUpdateRecord(collectionName: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date(),
      });
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: [collectionName, id] });
      queryClient.invalidateQueries({ queryKey: [collectionName] });
    },
  });
}

/**
 * Hook to delete a record
 */
export function useDeleteRecord(collectionName: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: [collectionName, id] });
      queryClient.invalidateQueries({ queryKey: [collectionName] });
    },
  });
}

/**
 * Hook to search records across multiple fields
 */
export function useSearchRecords(
  collectionName: string,
  searchTerm: string,
  searchFields: string[],
  options: QueryOptions = {}
) {
  return useQuery({
    queryKey: [collectionName, 'search', searchTerm, searchFields],
    queryFn: async () => {
      if (!searchTerm.trim()) return [];

      const constraints = options.filters || [];
      if (options.orderByField) {
        constraints.push(orderBy(options.orderByField, options.orderDirection || 'desc'));
      }

      const q = query(collection(db, collectionName), ...constraints);
      const snapshot = await getDocs(q);

      const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Filter in memory (Firestore doesn't support complex OR queries)
      return records.filter(record =>
        searchFields.some(field =>
          String((record as Record<string, any>)[field] || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    },
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook for bulk operations
 */
export function useBulkOperation(collectionName: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      updates,
      deletes,
    }: {
      updates?: Array<{ id: string; data: any }>;
      deletes?: string[];
    }) => {
      if (updates) {
        for (const { id, data } of updates) {
          const docRef = doc(db, collectionName, id);
          await updateDoc(docRef, {
            ...data,
            updatedAt: new Date(),
          });
        }
      }

      if (deletes) {
        for (const id of deletes) {
          const docRef = doc(db, collectionName, id);
          await deleteDoc(docRef);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [collectionName] });
    },
  });
}
