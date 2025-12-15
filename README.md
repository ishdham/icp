# Impact Collaboration Platform (ICP)

A demo of the Impact Collaboration Platform for Wheels Foundation, facilitating connections between Partners, Solutions, and Funding for social impact.

## Vision & SDGs
Our mission is to accelerate social impact by connecting innovators with implementation partners. We directly support **UN Sustainable Development Goal 17: Partnerships for the Goals**. By facilitating the discovery of solutions in Health, Education, and Water, we also contribute to SDGs 3, 4, and 6.

## Documentation & Governance
As a Digital Public Good (DPG) candidate, we adhere to open standards and transparent governance:
*   [Contributing Guidelines](./CONTRIBUTING.md)
*   [Code of Conduct](./CODE_OF_CONDUCT.md)
*   [Governance Model](./GOVERNANCE.md)
*   [Privacy Policy](./PRIVACY.md)

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

## Technical Architecture

### Frontend
*   **Framework**: React (Vite) + TypeScript
*   **UI Library**: **Material UI (MUI)**. Chosen for its robust component ecosystem, accessibility compliance, and professional aesthetic ("Google Material Design").
*   **Form Management**: **JSON Forms**. Renders forms dynamically based on JSON Schemas fetched from the backend, ensuring a Single Source of Truth for data validation.
*   **State Management**: React Context (`AuthContext`) for user state.

### Backend
*   **Runtime**: Node.js + Express
*   **Database**: Firestore (NoSQL)
*   **Authentication**: Firebase Admin SDK

### Shared Architecture (Single Source of Truth)

#### 1. Schema Sharing
To ensure consistency between Backend validation and Frontend UI rendering, JSON Schemas are stored centrally in the Backend and served via API.
*   **Backend**: validation middleware uses these schemas to validate requests.
*   **Frontend**: `useSchema` hook fetches schemas from `/v1/schemas/:type` to render forms using JSON Forms.
*   **Benefit**: Updating a schema in the backend automatically updates the frontend form validation and UI structure.

#### 2. Permission Sharing (RBAC)
Role-Based Access Control (RBAC) is enforced using **Firebase Custom Claims**.
*   **Backend**: responsible for assigning roles (e.g., `ADMIN`) via Admin SDK (`setAdmin` script or API). Middleware checks `req.user.role` to authorize routes.
*   **Frontend**: `AuthContext` decodes the Firebase ID Token to extract custom claims. The UI conditionally renders elements (e.g., "Users" menu, "Approve" buttons) based on the user's role.

## Utility Scripts (`backend/scripts`)

You can manage the system using these scripts:

#### 1. Promote User to Admin
```bash
npx ts-node scripts/setAdmin.ts <email_address>
```
*Note: Make sure your backend `.env` variables (or Firebase credentials) match the project used by the frontend.*

#### 2. Create Admin User (Programmatic)
If user does not exist, this creates a new user with ADMIN role:
```bash
npx ts-node scripts/createAdmin.ts
```

#### 3. Seed Database
Populate Firestore with sample data:
```bash
npx ts-node scripts/seed_all.ts
```
