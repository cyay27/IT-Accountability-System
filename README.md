# IT Accountability System (OJT)

A TypeScript + React (Vite) web app for IT accountability operations, inventory tracking, software inventory, iPad inventory, disposal management, and returned-assets reassignment workflows.

## Complete Feature List

### Core Navigation

- Landing page and system entry screen
- Module selection page for all major workflows
- Shared header bar and consistent top-level app navigation

### 1) IT Accountability Module

- Employee accountability form for assigned company assets
- Create, edit, and delete accountability records
- Required field validation and structured form input handling
- Signature capture support through integrated signature pad components
- Record listing with search and filter support
- Printable accountability document output

### 2) Borrowing Receipt Workflow

- Borrowing receipt form for temporary asset issuance
- Borrowing receipt record persistence and retrieval
- Printable borrowing receipt document

### 3) Delivery Receipt Workflow

- Delivery receipt form for newly delivered or transferred assets
- Delivery receipt record handling and updates
- Printable delivery receipt document

### 4) IT Asset Inventory Module

- Consolidated physical asset inventory view
- Inventory data sourced from accountability and delivery records
- Inventory analytics/chart visualization
- Printable IT asset inventory report

### 5) IT Software Inventory Module

- Software inventory form for recording licensed software details
- Software inventory records table and management workflow
- Software inventory chart/summary visualization
- Printable software inventory report

### 6) License Maintenance Module

- License maintenance form with software name, vendor, quantity, date, and product type
- Conditional product key field behavior (enabled only for Product Key type)
- CRUD operations (add, edit, delete, view) with validation for required and numeric fields
- Search and filtering by software name, vendor, and product type
- Optional proof-of-purchase file name capture

### 7) iPad Inventory Module

- Dedicated iPad inventory management screen
- iPad records collection and listing
- Printable iPad inventory output

### 8) Disposal Module

- Disposal form for decommissioned or retired assets
- Disposal records management (create/edit/list)
- Printable disposal documentation

### 9) Returned Assets Module

- Returned assets records tracking (for employee offboarding or reassignment)
- Reassign form for reallocating returned devices
- Returned assets analytics/chart visualization
- Printable returned assets output

### Printing and Documentation

- Printable templates for accountability, borrowing receipt, delivery receipt, IT assets, iPads, software inventory, disposal, and returned assets
- Print-oriented styling via print-specific stylesheet

### Data and Backend Integration

- Firebase initialization via environment variables
- Firestore-backed persistence across modules
- Module-specific data hooks for CRUD and synchronization
- Optional fallback behavior with mock/sample data support in accountability data layer

## Tech Stack

- React + TypeScript
- Vite
- Firebase (Auth + Firestore)
- Tailwind CSS

## Setup

1. Install dependencies.

	npm install

2. Configure environment variables in a local .env file.

	VITE_FIREBASE_API_KEY=...
	VITE_FIREBASE_AUTH_DOMAIN=...
	VITE_FIREBASE_PROJECT_ID=...
	VITE_FIREBASE_STORAGE_BUCKET=...
	VITE_FIREBASE_MESSAGING_SENDER_ID=...
	VITE_FIREBASE_APP_ID=...
	VITE_FIREBASE_ADMIN_UID=...

3. Ensure Firebase Firestore is enabled in your Firebase project.

4. Run development server.

	npm run dev

5. Build production bundle.

	npm run build

## Project Notes

- Frontend app source is in src/.
- Firebase client setup is in src/shared/firebase/firebase.ts.
- Cloud Functions source is in functions/index.js.
