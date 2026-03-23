# IT Assets Accountability System

A TypeScript + React (Vite) app for capturing employee IT asset accountability details and printing a formal A4 accountability form.

## Features

- Create, edit, delete accountability records
- Required-field and email validation
- Firestore persistence (collection: `accountability_records`)
- Search, sorting, and filters (Department, Division, Project)
- Printable A4 form with PHR, AMLD, IT, and CATO signature sections
- Fallback local mode with sample mock records when Firebase is not configured

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure Firebase in `src/firebase.ts`:

- `apiKey`
- `authDomain`
- `projectId`
- `storageBucket`
- `messagingSenderId`
- `appId`

3. Ensure Firestore is enabled in your Firebase project.

4. Start development server:

```bash
npm run dev
```

5. Build for production:

```bash
npm run build
```

## Data Model

Each record includes:

- No, Emp ID, Firstname, Middle Name, Last Name, Email
- Position, Group, Department, Division, Project
- Cost Center, Project Location
- Hostname, Serial Number, Device Asset Number
- Monitor Model, Monitor Serial Number, Monitor Asset Number
- PHR, AMLD, IT, CATO
- createdAt, updatedAt

## Print Notes

- Click **View** to preview a selected record form.
- Click **Print** from a row to print only the formal accountability form section.
- The print layout is A4 portrait and uses `src/print.css`.
