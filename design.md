# Impact Collaboration Platform (ICP) Design Document

## Overview
The Impact Collaboration Platform (ICP) facilitates connections between Partners, Solutions, and Funding for social impact. It is a full-stack application with a React frontend and a Node.js/Express backend, utilizing Firebase for authentication and database services.

## Multi-Lingual Capabilities
The platform supports a robust multi-lingual experience to cater to a diverse user base.

### Supported Languages
- English (en) - Default
- Hindi (hi)
- Bengali (bn)
- Telugu (te)
- Marathi (mr)
- Tamil (ta)
- Urdu (ur)
- Gujarati (gu)
- Kannada (kn)
- Malayalam (ml)
- Punjabi (pa)

### Implementation
- **Language Context**: A global `LanguageContext` manages the current active language state.
- **Dictionary-Based Translation**: 
  - A static dictionary object (`DICTIONARY` in `LanguageContext.tsx`) contains key-value pairs for all UI strings across all supported languages.
  - The `t(key)` function retrieves the translated string for the current language.
  - Directionality (`ltr` vs `rtl`) is matched to the language (e.g., Urdu is `rtl`).

## AI Integration
The platform leverages Generative AI to enhance user experience through smart data entry and conversational search.

### Architecture
- **Framework**: [Genkit](https://firebase.google.com/docs/genkit)
- **Model Provider**: Google Vertex AI
- **Models Used**:
  - `gemini-2.5-flash` for text generation and chat.
  - `text-embedding-004` for vector embeddings.

### Features

#### 1. AI-Assisted Import
Streamlines the creation of Solutions from unstructured text.
- **Process**:
  1. **Research Pass**: The AI analyzes the provided conversation history or text to synthesize a detailed "Solution" profile (Name, Description, Domain, etc.).
  2. **Formatting Pass**: The synthesized text is transformed into a structured JSON object that matches the `SolutionSchema`.
- **Handling Incompleteness**: Uses a relaxed schema (`partial()`) to allow extraction even with missing fields.

#### 2. Vector Search (RAG)
enables semantic search across Solutions and Partners.
- **Vector Store**: Currently implemented as an in-memory `VectorStore` initialized on startup.
- **Embedding**: On initialization, all Solutions and Partners are fetched, tokenized, and embedded using `text-embedding-004`.
- **Retrieval**: Uses Cosine Similarity to find relevant documents matching a user's query.

#### 3. Context-Aware Chatbot
A conversational interface (`AiChatView`) that helps users find information.
- **Context Injection**: Relevant Solutions/Partners retrieved via Vector Search are injected into the system prompt.
- **Smart Linking**: The AI is instructed to generate Markdown links (`[Name](/path/ID)`) when referencing specific entities, allowing users to navigate directly to details pages.

## Reporting Mechanism
The platform provides a "Solutions Report" to visualize ecosystem data.

### Implementation
- **Frontend library**: `react-plotly.js` for interactive charts.
- **Data Source**: Fetches all accessible solutions (respecting permissions) via the `/solutions` API.

### Visualizations
1.  **Solutions by Domain**: A Pie chart showing the distribution of solutions across impact domains (Water, Health, Education, etc.).
2.  **Solutions by Provider**: A Bar chart showing the number of solutions contributed by each Partner organization.

### Drill-Down Capabilities
- **Interactive Filtering**: Clicking on a sector in the Pie chart or a bar in the Bar chart applies a "Drill-down Filter" to the list of solutions below.
- **Status Filtering**: Users can filter the entire report view by Solution Status (e.g., MATURE, APPROVED) using a multi-select dropdown.

## API Reference
The backend provides a RESTful API under the `/v1` prefix.

### Key Endpoints
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/v1/solutions` | GET, POST | Manage solution entries. |
| `/v1/solutions/:id` | GET, PATCH | Retrieve or update a specific solution. |
| `/v1/partners` | GET, POST | Manage partner organizations. |
| `/v1/users` | GET, PATCH | Manage user profiles. |
| `/v1/tickets` | GET, POST | Manage workflow tickets (approvals/requests). |
| `/v1/stats` | GET | Retrieve dashboard statistics (counts). |
| `/v1/auth` | - | Handles authentication routes. |
| `/v1/ai` | POST | AI features (chat, extraction). |
| `/v1/schemas/:type` | GET | Retrieve JSON Schemas for UI generation. |

## Shared Architecture
The platform enforces a "Single Source of Truth" for data models by sharing schemas between the Backend and Frontend.

### Schema Sharing
- **Source**: JSON Schemas (`zod` definitions converted to JSON Schema) are defined in the Backend (`src/schemas`).
- **Distribution**: The Backend serves these schemas via the `/v1/schemas/:type` endpoint.
- **Consumption**: The Frontend's `useSchema` hook fetches these schemas at runtime.
- **Benefit**: Any validation change in the Backend is immediately reflected in the Frontend UI without code duplication.

### JSON Forms
For data entry and display, the Frontend uses **JSON Forms** to dynamically render UIs based on the fetched schemas.

- **Dynamic Rendering**: Forms are not hardcoded. They are generated from the `schema` (data structure) and `uischema` (layout/control).
- **Custom Renderers**: Specialized components extend the default JSON Forms capabilities:
  - `MarkdownRenderer`: For rich text input/display.
  - `FileUploaderRenderer`: For handling file attachments.
  - `BeneficiarySelectRenderer`: For specific domain selection logic.

## Ease of Use
The platform is designed to provide immediate value to all visitors, minimizing friction.

### Value without Login
Users do not need to create an account to explore the ecosystem.
- **Open Access**: The "Solutions" and "Partners" catalogs are publicly accessible.
- **Filtering & Search**: Anonymous users can filter by domain, status, or use the keyword search to find relevant innovations.
- **Reports**: The interactive "Solutions Report" is fully available to anonymous users, providing transparency into the platform's impact.

## Security & Safety
Security is intrinsic to the platform design, protecting data integrity and ensuring safe AI interactions.

### Authentication & Authorization
- **Authentication**: Handled securely via **Firebase Authentication**.
- **RBAC**: Role-Based Access Control is enforced using **Firebase Custom Claims**. The backend middleware verifies these claims before processing restricted requests.

### Submission Process (Data Integrity)
To prevent unauthorized changes and spam, the platform enforces a strict submission workflow.
- **No Direct Edits**: Regular users cannot directly modify database records for Solutions or Partners once they are approved/mature.
- **Workflow**:
  1. Users submit a "Proposal" or "Ticket".
  2. The system sets the initial status to `PROPOSED` or `PENDING`.
  3. **Admins/Moderators** review the submission.
  4. Only authorized roles (ADMIN, ICP_SUPPORT) can approve and promote the status to `MATURE`.

### AI Safety
The AI integration follows a **Human-in-the-Loop (HITL)** design philosophy.
- **No Direct Database Access**: The AI service (`ai.service.ts`) is strictly a *data processing* utility. It **cannot** write to the database.
- **Standard Import Flow**:
  1. AI analyzes text and *suggests* a structured form.
  2. The suggestion is presented to the User in a review dialog.
  3. The User **must** review, edit, and manually click "Save" to commit the data.
- **Multiple Review Levels**: Even after an AI-assisted submission, the standard human approval workflow (Moderator review) applies.
