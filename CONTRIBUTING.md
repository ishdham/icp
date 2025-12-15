# Contributing to Impact Collaboration Platform (ICP)

Thank you for your interest in contributing to the Impact Collaboration Platform (ICP)! We welcome contributions from everyone to help us build a platform that facilitates connections for social impact.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md). Please report any unacceptable behavior to [insert contact email].

## How to Contribute

### Reporting Bugs
1.  **Search existing issues**: Check if the bug has already been reported.
2.  **Create a new issue**: If not, create a new issue providing a clear description, steps to reproduce, and expected behavior.

### Suggesting Enhancements
1.  **Discuss first**: Open an issue to discuss your idea before writing code.
2.  **Detail your proposal**: Explain the problem it solves and your proposed solution.

### Local Development Setup

#### Prerequisites
- Node.js (v20+)
- Firebase Project with Firestore and Authentication enabled.

#### Backend Setup
1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up environment variables:
    Create a `.env` file with your Firebase credentials.
4.  Start the development server:
    ```bash
    npm run dev
    ```
5.  Run tests:
    ```bash
    npm test
    ```

#### Frontend Setup
1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up environment variables:
    Create a `.env` file with `VITE_API_URL` if needed.
4.  Start the development server:
    ```bash
    npm run dev
    ```
5.  Run tests:
    ```bash
    npm test
    ```
6.  Lint code:
    ```bash
    npm run lint
    ```

### Pull Request Process
1.  **Fork the repository** and create your branch from `main`.
2.  **Ensure all tests pass** locally (`npm test` in both directories).
3.  **Update documentation** if you are changing APIs or adding features.
4.  **Submit a Pull Request** (PR) to the `main` branch.
5.  **Review**: A maintainer will review your PR. Be prepared to address feedback.

## Coding Standards
- **Language**: TypeScript for both backend and frontend.
- **Style**: We use ESLint and Prettier. Run `npm run lint` (frontend) to check for issues.
- **Commits**: Use descriptive commit messages.

## License
By contributing, you agree that your contributions will be licensed under the [Apache License 2.0](./LICENSE).
