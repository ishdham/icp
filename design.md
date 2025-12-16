# Impact Collaboration Platform (ICP) Design Document

## Overview
The Impact Collaboration Platform (ICP) facilitates connections between Partners, Solutions, and Funding for social impact. It is a full-stack application built with **Clean Architecture** principles to ensure scalability, testability, and separation of concerns. The frontend is a React application, and the backend is a Node.js/Express service utilizing Firebase for authentication and database services.

## Architecture

The backend follows a 4-layer Clean Architecture model, ensuring that business logic is decoupled from frameworks and external services.

### 1. Shared Kernel (`/shared`)
*The "Glial" Layer & Single Source of Truth.*
A shared library consumed by both Frontend and Backend at build time.
- **Schemas**: Defined in `zod` and exported as both TypeScript types (`type Solution`) and JSON Schemas. This ensures strict consistency between the API DTOs and Database Entities.
- **Permissions**: Centralized Role-Based Access Control (RBAC) logic (e.g., `canEditSolution`) used by both the Backend (for authorization) and Frontend (for UI toggle visibility).
- **Constants**: Shared configuration values and enums.

### 2. Domain Layer (`src/domain`)
*Pure Business Logic. Zero dependencies.*
- **Entities**: Strongly typed data structures derived strictly from Shared Schemas (e.g., `Solution`, `Partner`).
- **Interfaces**: Abstract contracts defining *what* the system can do without specifying *how*.
    - `IRepository<T>`: Generic contract for persistence (CRUD) and Semantic Search (`searchByVector`).
    - `IAIService`: Contract for AI operations (Research, Extraction, Chat).
    - `IAuthService`: Contract for User Authentication.

### 3. Application Layer (`src/application`)
*Business Orchestration.*
- **Use Cases**: Single-responsibility classes that encapsulate specific user intents.
    - Examples: `CreateSolutionUseCase`, `SearchSolutionsUseCase`.
- **Dependencies**: Depends *only* on Domain Entities and Interfaces. Pure TypeScript, easy to unit test.

### 4. Infrastructure Layer (`src/infrastructure`)
*Concrete Adapters.*
- **Repositories**: Firestore-backed implementations (`FirestoreSolutionRepository`) including in-memory vector search logic.
- **Services**: Adapters for external APIs (`VertexAIService`, `FirebaseAuthService`).

### 5. Interface Layer (`src/routes`, `src/container.ts`)
*Entry Points & wiring.*
- **Dependency Injection**: A minimalist `container.ts` explicitly wires Infrastructure implementations to Use Cases.
- **Controllers**: Thin Express route handlers (`routes/solutions.ts`) that parse requests, invoke Use Cases, and return responses.

---

## Multi-Lingual Capabilities
The platform supports a robust multi-lingual experience to cater to a diverse user base.

### Supported Languages
- English (en) - Default
- Hindi (hi), Bengali (bn), Telugu (te), Marathi (mr), Tamil (ta), Urdu (ur), Gujarati (gu), Kannada (kn), Malayalam (ml), Punjabi (pa)

### Implementation
- **Language Context**: A global `LanguageContext` manages the current active language state.
- **Dictionary-Based Translation**: Static dictionary object (`DICTIONARY` in `LanguageContext.tsx`) contains key-value pairs for UI strings.

## AI Integration
The platform leverages Generative AI and Clean Architecture interfaces to enhance user experience.

### Architecture
- **Interface**: `IAIService` (Domain Layer) defines the contract.
- **Implementation**: `VertexAIService` (Infrastructure Layer) using [Genkit](https://firebase.google.com/docs/genkit).
- **Model Provider**: Google Vertex AI (`gemini-2.5-flash`, `text-embedding-004`).

### Features

#### 1. AI-Assisted Import
Streamlines the creation of Solutions from unstructured text.
- **Use Case**: Orchestrated by Application Layer.
- **Process**:
  1. **Research**: AI synthesizes a detailed "Solution" profile from text.
  2. **Extraction**: AI formats the text into a JSON object matching the `SolutionSchema`.

#### 2. Vector Search (RAG)
Enables semantic search across Solutions and Partners.
- **Flow**: `Use Case` -> `IAIService.generateEmbedding()` -> `IRepository.searchByVector()`.
- **Implementation**: Currently uses an in-memory vector index within the `FirestoreRepository`, populated on startup.

#### 3. Context-Aware Chatbot
A conversational interface (`AiChatView`) that helps users find information.
- **Context Injection**: Relevant entities retrieved via Vector Search are injected into the system prompt.
- **Smart Linking**: The AI generates Markdown links (`[Name](/path/ID)`) to entities.

## Reporting Mechanism
The platform provides a "Solutions Report" to visualize ecosystem data.

### Implementation
- **Frontend library**: `react-plotly.js` for interactive charts.
- **Visualizations**: Pie chart (Domains) and Bar chart (Providers).
- **Drill-Down**: Interactive filtering by clicking chart elements or using status dropdowns.

## API Reference
The backend provides a RESTful API under the `/v1` prefix.

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/v1/solutions` | GET, POST | Manage solution entries (via `SearchSolutions` / `CreateSolution` Use Cases). |
| `/v1/solutions/:id` | GET, PUT | Retrieve or update a specific solution. |
| `/v1/partners` | GET, POST | Manage partner organizations. |
| `/v1/users` | GET, PUT | Manage user profiles. |
| `/v1/tickets` | GET, POST | Manage workflow tickets (approvals/requests). |
| `/v1/stats` | GET | Retrieve dashboard statistics. |
| `/v1/auth` | - | Handles authentication routes. |
| `/v1/ai` | POST | AI features (chat, extraction). |

## JSON Forms & Dynamic UI
For data entry and display, the Frontend uses **JSON Forms** to dynamically render UIs.
- **Source**: JSON Schemas are generated from the Shared Zod definitions and served via API.
- **Renderers**: Custom renderers for Markdown, File Uploads, and Beneficiary Selection.

## Security & Safety
Security is intrinsic to the platform design.

### Authentication & Authorization
- **Authentication**: Firebase Authentication.
- **RBAC**: Role-Based Access Control enforced by:
    1. **Domain Layer**: Permissions logic in `@shared/permissions` checked by Use Cases.
    2. **Middleware**: Firebase Custom Claims verified in API routes.

### Submission Workflow
- **No Direct Edits**: Regular users cannot directly modify records.
- **Approval Process**: Changes are submitted as "Tickets" or "Proposals" which require Admin/Moderator approval to become `MATURE`.
