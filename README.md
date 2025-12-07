# Impact Collaboration Platform (ICP)

A demo of the Impact Collaboration Platform for Wheels Foundation, facilitating connections between Partners, Solutions, and Funding for social impact.

## Project Structure

- **`frontend/`**: React application (Vite + TypeScript + TailwindCSS).
- **`backend/`**: Node.js/Express application (TypeScript + Firebase Admin).

## Getting Started

### Prerequisites

- Node.js (v20+)
- Firebase Project with Firestore and Authentication enabled.

### Implementation Setup

1.  **Backend Setup**:
    ```bash
    cd backend
    npm install
    # Create .env file with firebase credentials details if not using default
    ```

2.  **Frontend Setup**:
    ```bash
    cd frontend
    npm install
    # Create .env with VITE_API_URL if backend is not on localhost:3000
    ```

## Useful Scripts

### Running the Application

To run the full stack locally:

1.  **Start Backend** (Port 3000):
    ```bash
    cd backend
    npm run dev
    ```

2.  **Start Frontend** (Port 5173):
    ```bash
    cd frontend
    npm run dev
    ```

### Testing

- **Backend Tests** (Unit & Integration):
    ```bash
    cd backend
    npm test
    ```

- **Frontend Build Verification**:
    ```bash
    cd frontend
    npm run build
    ```

### Utility Scripts (`backend/scripts`)

These scripts help with data management and administration. Run them from the `backend/` directory using `npx ts-node`.

#### 1. Promote User to Admin
Grant full administrative privileges to a registered user.
```bash
npx ts-node scripts/setAdmin.ts <email_address>
```

#### 2. Seed Database
Populate Firestore with sample data (Users, Partners, Solutions, Tickets).
```bash
npx ts-node scripts/seed_all.ts
```

#### 3. Seed Users Only
Generate sample users with different roles.
```bash
npx ts-node scripts/seed_users.ts
```

#### 4. Manage Custom Claims
Manually set custom claims (like roles) for a specific UID.
```bash
npx ts-node scripts/set_claims.ts <uid> <claim_key> <claim_value>
```

#### 5. Generate Admin Token
Generate an ID token for testing purposes (requires service account setup).
```bash
npx ts-node scripts/generate_token_admin.ts
```
