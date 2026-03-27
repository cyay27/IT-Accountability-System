# API & Library Integration Guide

## 1. OPTIMIZATION IMPLEMENTED ✅

### A. Date/Time Handling (`src/shared/services/dateUtils.ts`)
**Library**: Day.js (lightweight alternative to Moment.js)

**Usage Example**:
```typescript
import { formatDate, getDaysRemaining, isExpiringSoon } from '@/shared/services/dateUtils';

// Format dates
formatDate('2024-03-27') // "Mar 27, 2024"
formatDateTime(new Date()) // "Mar 27, 2024 14:30"

// Check license expiration
if (isExpiringSoon(licenseRecord.expiryDate)) {
  console.log('License expiring soon!');
}

const daysLeft = getDaysRemaining('2024-06-15');
```

---

### B. Utility Functions (`src/shared/services/utilityFunctions.ts`)
**Library**: Lodash

**Key Features**:
- **Debouncing**: Delays callbacks until user stops typing (for search)
  ```typescript
  import { createSearchDebounce } from '@/shared/services/utilityFunctions';
  
  const handleSearch = createSearchDebounce((value) => {
    // Only runs after user stops typing for 300ms
    performSearch(value);
  }, 300);
  ```

- **Pagination**: Slice arrays efficiently
  ```typescript
  const pageData = paginate(records, 1, 20); // Page 1, 20 items per page
  ```

- **File Operations**: Format sizes, sanitize strings
  ```typescript
  formatFileSize(1024000) // "1000 KB"
  ```

---

### C. Role-Based Access Control (`src/shared/services/rbac.ts`)
**No external library - Pure TypeScript**

**Implementation**:
```typescript
import { hasPermission, canAccessModule } from '@/shared/services/rbac';

// In your component
const userRole = 'staff';

if (hasPermission(userRole, 'software-inventory', 'edit')) {
  // Show edit button
}

if (canAccessModule(userRole, 'license-maintenance')) {
  // Show module in sidebar
}
```

**Roles**:
- **Admin**: Full access (create, edit, delete, export)
- **Staff**: Limited access (create, view, print)
- **Viewer**: Read-only access

---

### D. React Query Integration (`src/shared/services/queryClient.ts` + `src/shared/hooks/useFirestoreQuery.ts`)
**Library**: @tanstack/react-query

**Benefits**:
- ✅ Automatic caching (reduces Firestore reads)
- ✅ Background refetching
- ✅ Retry logic with exponential backoff
- ✅ Devtools for debugging

**Usage in Components**:
```typescript
import { usePaginatedRecords, useCreateRecord, useSearchRecords } from '@/shared/hooks/useFirestoreQuery';

function MyComponent() {
  // Auto-cached paginated records
  const { data, isLoading } = usePaginatedRecords('accountability_records', {
    pageSize: 20,
    orderByField: 'updatedAt',
    orderDirection: 'desc'
  });

  // Create mutation with cache invalidation
  const { mutate: createRecord } = useCreateRecord('accountability_records');

  // Search with automatic caching
  const { data: results } = useSearchRecords(
    'software_inventory_records',
    searchTerm,
    ['softwareName', 'vendor']
  );
}
```

---

### E. Email Notifications (`src/shared/services/emailService.ts`)
**Library**: @emailjs/browser (renamed from emailjs-com)

**Setup** (Optional - for production):
```bash
# Create .env file with:
REACT_APP_EMAIL_SERVICE_ID=service_xxxxx
REACT_APP_EMAIL_TEMPLATE_ID=template_xxxxx
REACT_APP_EMAIL_PUBLIC_KEY=your_public_key
```

**Usage**:
```typescript
import { sendLicenseExpirationAlert, sendAssetReturnReminder } from '@/shared/services/emailService';

// Send license expiration warning
await sendLicenseExpirationAlert(
  'user@example.com',
  'John Doe',
  'Microsoft Office',
  '2024-06-15'
);

// Send asset return reminder
await sendAssetReturnReminder(
  'user@example.com',
  'Jane Smith',
  'Laptop Dell XPS',
  '2024-04-01'
);
```

---

### F. PDF Export (`src/shared/services/pdfExportService.ts`)
**Libraries**: pdf-lib, html2pdf.js

**Usage**:
```typescript
import { generatePDFFromElement, exportRecordsAsPDF, exportAsCSV } from '@/shared/services/pdfExportService';

// Export form as PDF
async function exportForm() {
  await generatePDFFromElement('form-container', 'my-form', 'Form Title');
}

// Export records table as PDF
async function exportTable() {
  await exportRecordsAsPDF(
    records,
    ['Name', 'Email', 'Date'],
    'export-table',
    'All Records'
  );
}

// Export as CSV (lighter weight)
exportAsCSV(
  records,
  ['Name', 'Email', 'Status'],
  'records-export'
);
```

---

### G. Firestore Optimization (`src/shared/services/firestoreOptimization.ts`)
**No external library - Pure Firestore optimizations**

**Key Improvements**:
1. **Pagination** - Fetch only needed records
   ```typescript
   import { getPaginatedRecords } from '@/shared/services/firestoreOptimization';
   
   const result = await getPaginatedRecords('software_inventory_records', {
     pageSize: 20,
     currentPage: 1,
     orderByField: 'updatedAt',
     orderDirection: 'desc'
   });
   ```

2. **Search** - Efficient text search
   ```typescript
   const { records } = await searchRecords(
     'license_maintenance_records',
     ['softwareName', 'vendor'],
     'AEC'
   );
   ```

3. **Date Range Queries** - For reports
   ```typescript
   const { records } = await getRecordsByDateRange(
     'accountability_records',
     'collectionDate',
     new Date('2024-01-01'),
     new Date('2024-03-31')
   );
   ```

4. **Index Recommendations**:
   ```typescript
   import { FIRESTORE_INDEX_RECOMMENDATIONS } from '@/shared/services/firestoreOptimization';
   
   // Check recommended indexes in Firestore console
   console.log(FIRESTORE_INDEX_RECOMMENDATIONS.software_inventory_records);
   ```

---

### H. Chart.js Utilities (`src/shared/services/chartUtils.ts`)
**Library**: chart.js, react-chartjs-2

**Usage**:
```typescript
import { createBarChartConfig, createLineChartConfig } from '@/shared/services/chartUtils';
import { Bar, Line } from 'react-chartjs-2';

function InventoryChart() {
  const data = createBarChartConfig(
    'Software Inventory',
    ['AEC', 'AutoCAD', 'Bluebeam'],
    [45, 32, 28],
    'Units'
  );

  return <Bar data={data} options={getChartOptions()} />;
}
```

---

### I. Cloudflare Turnstile CAPTCHA (`src/shared/services/turnstileService.ts`)
**Library**: Cloudflare Turnstile (via CDN)

**Setup** (Optional):
```bash
# Create .env file with:
REACT_APP_TURNSTILE_SITE_KEY=your_site_key_from_cloudflare
```

**Usage**:
```typescript
import { initializeTurnstile, renderTurnstile, getTurnstileToken } from '@/shared/services/turnstileService';

// In your main layout
useEffect(() => {
  initializeTurnstile();
}, []);

// In your form
function MyForm() {
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const token = getTurnstileToken();
    if (!token) {
      alert('Please complete the CAPTCHA');
      return;
    }
    
    // Send token with form data to backend for verification
    await submitForm({ ...formData, captcha_token: token });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Your form fields */}
      <div id="turnstile-container"></div>
      <button type="submit">Submit</button>
    </form>
  );
}
```

---

## 2. PERFORMANCE UPGRADES ⚡

### Caching Strategy
- **Default**: 5 minutes (fresh data, reduced reads)
- **Realtime data**: 1 second
- **Stable data**: 30 minutes
- **Automatic invalidation** on mutations

### Database Query Optimization
- Pagination: Fetch 20 items at a time (not all)
- Indexes: Create recommended indexes in Firestore
- Read Deduplication: React Query prevents duplicate requests

### Search Optimization (Future Enhancement)
For full-text search, consider Algolia:
```bash
npm install algoliasearch
```
Then replace in-memory search with Algolia API calls.

---

## 3. SCALABILITY IMPROVEMENTS 📈

### What's Better Now
1. ✅ **Reduced Firestore Reads**: Caching prevents duplicate requests
2. ✅ **Faster UI**: Pagination and debouncing
3. ✅ **Better UX**: Retry logic handles network issues
4. ✅ **Role-Based Access**: Control who sees what
5. ✅ **Export Capabilities**: PDF, CSV exports reduce manual work
6. ✅ **Notifications**: Email alerts for critical events
7. ✅ **Analytics**: Charts for inventory insights

---

## 4. ENVIRONMENT VARIABLES (.env file)
Create `.env` in project root:
```
# Optional - Email Service
REACT_APP_EMAIL_SERVICE_ID=service_xxxxx
REACT_APP_EMAIL_TEMPLATE_ID=template_xxxxx
REACT_APP_EMAIL_PUBLIC_KEY=your_public_key

# Optional - Cloudflare Turnstile CAPTCHA
REACT_APP_TURNSTILE_SITE_KEY=your_site_key

# Optional - Analytics/Third-party services
REACT_APP_API_KEY=your_key
```

---

## 5. INTEGRATION CHECKLIST ✅

### In Components:
- [ ] Replace `useState` caching with `usePaginatedRecords`
- [ ] Add debounce to search inputs
- [ ] Use React Query hooks for CRUD
- [ ] Add RBAC checks before showing buttons
- [ ] Import and use date utils for formatting
- [ ] Add PDF export buttons to forms
- [ ] Add email notifications for critical events

### In App.tsx:
- [ ] Wrap with QueryClientProvider
- [ ] Track Firestore stats for monitoring
- [ ] Initialize Turnstile on load

### In Firestore:
- [ ] Create recommended indexes (see console)
- [ ] Set up security rules with RBAC
- [ ] Monitor quota usage

---

## 6. MONITORING & DEBUGGING 🔍

### React Query DevTools (Development only)
```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function App() {
  return (
    <>
      {/* Your app */}
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  );
}
```

### Firestore Stats
```typescript
import { getFirestoreStats, resetStats } from '@/shared/services/firestoreOptimization';

console.log(getFirestoreStats()); // { reads: 45, writes: 12 }
```

---

## 7. NEXT STEPS 🚀

### Phase 1 (Done)
- ✅ Libraries installed
- ✅ Core services created
- ✅ Hooks implemented

### Phase 2 (Recommended)
1. Integrate React Query into existing hooks
2. Add debouncing to search/filter inputs
3. Implement RBAC in UI components
4. Add email notifications to critical workflows

### Phase 3 (Future)
1. Set up EmailJS for production
2. Configure Turnstile CAPTCHA
3. Create analytics dashboard with charts
4. Upgrade search to Algolia for full-text search
5. Set up automated backups

---

## 8. TROUBLESHOOTING 🆘

### React Query not caching
- Check `staleTime` and `gcTime` settings
- Verify query keys are consistent
- Use DevTools to inspect cache

### Firestore reads still high
- Verify pagination is working
- Check for duplicate queries
- Use React Query DevTools to spot inefficiencies

### Email not sending
- Configure .env variables correctly
- Check EmailJS console for errors
- Verify CORS settings

### PDFs not generating
- Ensure DOM element has correct ID
- Check browser console for errors
- Verify html2pdf library loaded

---

