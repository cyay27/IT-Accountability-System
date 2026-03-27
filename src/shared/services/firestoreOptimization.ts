/**
 * Firestore Query Optimization
 * Implements pagination, indexing hints, and efficient queries
 */

import { collection, query, where, orderBy, limit, getDocs, QueryConstraint } from 'firebase/firestore';
import { db } from '../firebase/firebase';

export interface PaginationParams {
  pageSize: number;
  currentPage: number;
}

export interface QueryOptions {
  filters?: QueryConstraint[];
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
  pageSize?: number;
  currentPage?: number;
}

/**
 * Optimized paginated query
 * Reduces Firestore reads by fetching only needed data
 */
export async function getPaginatedRecords(
  collectionName: string,
  options: QueryOptions = {}
) {
  try {
    const {
      filters = [],
      orderByField = 'updatedAt',
      orderDirection = 'desc',
      pageSize = 20,
      currentPage = 1,
    } = options;

    // Build query constraints
    const constraints: QueryConstraint[] = [
      ...filters,
      orderBy(orderByField, orderDirection),
      limit(pageSize + 1), // Fetch one extra to know if there are more pages
    ];

    const q = query(collection(db, collectionName), ...constraints);
    const snapshot = await getDocs(q);

    const records = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Check if there are more pages
    const hasNextPage = records.length > pageSize;
    if (hasNextPage) records.pop();

    return {
      records: records.slice(0, pageSize),
      hasNextPage,
      hasPreviousPage: currentPage > 1,
      currentPage,
      pageSize,
      totalOnPage: records.length,
    };
  } catch (error) {
    console.error(`Error fetching paginated records from ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Search records with pagination
 */
export async function searchRecords(
  collectionName: string,
  searchFields: string[],
  searchTerm: string,
  options: QueryOptions = {}
) {
  try {
    // Firestore doesn't support OR across fields, so we need to filter in memory
    // For better full-text search, consider Algolia (mentioned in recommendations)
    const baseQuery = await getPaginatedRecords(collectionName, options);

    if (!searchTerm.trim()) return baseQuery;

    const filtered = baseQuery.records.filter(record =>
      searchFields.some(field =>
        String((record as Record<string, any>)[field] || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    );

    return {
      ...baseQuery,
      records: filtered,
      totalOnPage: filtered.length,
    };
  } catch (error) {
    console.error(`Error searching records in ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Count records with filters (efficient)
 */
export async function countRecords(
  collectionName: string,
  filters: QueryConstraint[] = []
): Promise<number> {
  try {
    const q = query(collection(db, collectionName), ...filters);
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error(`Error counting records in ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Get records by date range (useful for reports)
 */
export async function getRecordsByDateRange(
  collectionName: string,
  dateField: string,
  startDate: Date,
  endDate: Date,
  options: Omit<QueryOptions, 'filters'> = {}
) {
  try {
    const filters = [
      where(dateField, '>=', startDate),
      where(dateField, '<=', endDate),
    ];

    return getPaginatedRecords(collectionName, {
      ...options,
      filters,
    });
  } catch (error) {
    console.error(`Error fetching records by date range from ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Get distinct values for a field (for dropdowns/filters)
 * Note: Firestore doesn't have native DISTINCT, so we fetch and deduplicate
 */
export async function getDistinctValues(
  collectionName: string,
  fieldName: string,
  filters: QueryConstraint[] = []
): Promise<string[]> {
  try {
    const q = query(collection(db, collectionName), ...filters);
    const snapshot = await getDocs(q);

    const values = new Set<string>();
    snapshot.docs.forEach(docData => {
      const value = docData.data()[fieldName];
      if (value) values.add(String(value));
    });

    return Array.from(values).sort();
  } catch (error) {
    console.error(`Error getting distinct values from ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Batch get multiple records by IDs
 * More efficient than individual queries
 */
export async function getRecordsByIds(
  collectionName: string,
  ids: string[]
) {
  try {
    if (ids.length === 0) return [];

    const q = query(
      collection(db, collectionName),
      where('__name__', 'in', ids)
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error(`Error batch getting records from ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Index recommendations for Firestore
 * Returns suggested indexes for common queries
 */
export const FIRESTORE_INDEX_RECOMMENDATIONS = {
  accountability_records: [
    { fields: ['employeeId', 'updatedAt'] },
    { fields: ['status', 'createdAt'] },
    { fields: ['collectionDate', 'status'] },
  ],
  software_inventory_records: [
    { fields: ['softwareName', 'updatedAt'] },
    { fields: ['status', 'createdAt'] },
    { fields: ['seatsUsed', 'updatedAt'] },
  ],
  license_maintenance_records: [
    { fields: ['softwareName', 'quantity'] },
    { fields: ['productType', 'updatedAt'] },
    { fields: ['vendor', 'updatedAt'] },
  ],
  asset_inventory_records: [
    { fields: ['assetCode', 'updatedAt'] },
    { fields: ['status', 'createdAt'] },
    { fields: ['assignedTo', 'updatedAt'] },
  ],
};

/**
 * Performance monitoring for Firestore reads
 */
let firestoreReadCount = 0;
let firestoreWriteCount = 0;

export function getFirestoreStats() {
  return {
    reads: firestoreReadCount,
    writes: firestoreWriteCount,
  };
}

export function trackRead() {
  firestoreReadCount++;
}

export function trackWrite() {
  firestoreWriteCount++;
}

export function resetStats() {
  firestoreReadCount = 0;
  firestoreWriteCount = 0;
}
