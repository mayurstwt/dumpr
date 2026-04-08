# Dumpr

## 🚀 Introduction

**Dumpr** is a modern social platform designed for users to quickly "dump" or share their thoughts, images, and updates with the community. It features real-time interactions, seamless post expansion with an integrated comments view, client-side image compression, and performant lazy loading. Built entirely to provide an engaging, responsive, and visually appealing experience.

## 🛠️ Tech Stack

- **Frontend:** React, TypeScript, Vite
- **Styling:** Tailwind CSS, Shadcn UI, Class Variance Authority
- **Backend & Database:** Supabase (PostgreSQL, Edge Functions, Realtime subscriptions)
- **State Management & Data Fetching:** React Query, React Hook Form
- **Testing:** Playwright (E2E), Vitest (Unit)

---

## 📁 Project Structure

Here is a visual breakdown of the application hierarchy:

```text
weekend-dump/
├── .github/                   # GitHub Actions and workflow configurations
├── public/                    # Static assets accessible to the browser directly
├── src/                       # Primary source code for the application
│   ├── components/            # Reusable UI components (buttons, modals, feeds, etc.)
│   ├── hooks/                 # Custom React hooks containing shared logic
│   ├── integrations/          # External API clients and configurations (e.g., Supabase)
│   ├── lib/                   # Utility functions and helper methods
│   ├── pages/                 # Full-page components correlating to application routes
│   ├── App.tsx                # The root component that defines all application routing
│   └── main.tsx               # The main entry file that mounts the App onto the DOM
├── supabase/                  # Backend configurations, database migrations, and edge functions
├── tests/                     # Automated testing routines (E2E)
├── .env.example               # Template for the required environment variables
├── package.json               # Defines project dependencies and available script commands
├── tailwind.config.ts         # Configuration for Tailwind CSS styling
└── vite.config.ts             # Configuration file for the Vite bundler
```

### Detailed Folder Breakdown

- **/src**: The lifeblood of the frontend application containing all user interfaces, context providers, and client-side logic.
- **/src/components**: Houses modular React components split between atomic `ui` elements (via Shadcn) and domain-specific pieces like `PostCard` and `PostForm`.
- **/src/pages**: Contains the primary view layers (`Index`, `PostView`) which are tied to specific router endpoints within the app.
- **/public**: Stores static files like `favicon.ico`, `_redirects`, and the `manifest.json`. Files here serve directly from the application root without being processed by webpack/vite.
- **/hooks**: Provides reusable React logic, such as `.ts` files for infinite scrolling (`useIntersectionObserver.ts`), anonymous authentication wrappers, and layout detections.
- **/supabase**: Holds all database functions, configurations (`config.toml`), and SQL migrations required to maintain our Supabase backend consistency locally and in production.
- **/tests**: Contains End-to-End configuration tests utilizing Playwright to ensure the stability of critical user paths.

### Key File Explanations

- **`src/App.tsx`**: The core architecture file wrapping the application in essential providers (QueryClient, ThemeProvider, and Toaster) and defining the strict nested routing via `react-router-dom`.
- **`vite.config.ts`**: The bundler configuration optimizing TypeScript, styling, and port settings to enable Hot Module Replacement (HMR) and optimized minified production builds.
- **`package.json`**: An index of all external packages (e.g., React, Tailwind, Supabase) along with the operational scripts required to build, format, and spin up the application gracefully.
- **`.env.example`**: Outlines the explicit API keys required to bridge the local frontend to the Supabase backend. It acts as a template emphasizing what's necessary without exposing secrets.

---

## 🏁 Getting Started

Follow these steps to safely configure and run the application locally.

**1. Clone the repository**
```bash
git clone <repository-url>
cd weekend-dump
```

**2. Install dependencies**
```bash
npm install
```

**3. Set up the environment**
Duplicate `.env.example` to `.env` and fill in the missing Supabase variables.
```bash
cp .env.example .env
```

**4. Start the development server**
```bash
npm run dev
```
The App should now be running cleanly on `http://localhost:5173`.

---

## 🔑 Environment Variables

The project heavily relies on secure bridging to the Supabase database. Inside your `.env` file, the following keys must be defined:

| Variable | Description |
|----------|-------------|
| **`VITE_SUPABASE_PROJECT_ID`** | The unique identifier string for the assigned Supabase project instance. |
| **`VITE_SUPABASE_PUBLISHABLE_KEY`** | The public "anon" API key allowing client-side authentication and reading of publicly-scoped data. |
| **`VITE_SUPABASE_URL`** | The unified base URL (`https://<project_id>.supabase.co`) resolving queries to the database. |

---

## 📜 Commands

The following operational commands are predefined within your `package.json` script registry.

| Command | Action Performed |
|---------|------------------|
| `npm run dev` | Spins up the Vite localized development server with Hot Module Replacement (HMR). |
| `npm run build` | Compiles the application into static files optimized for production deployments. |
| `npm run preview` | Boots a localized preview server mimicking how the static build will act in production. |
| `npm run lint` | Scans the codebase using ESLint to spot syntax or code-style violations based on predefined hooks. |
| `npm run test` | Executes the Vitest unit testing suite to ensure function and component health. |
| `npm run test:watch` | Keeps the testing suite actively watching for file changes to rerun tests automatically. |

---

## 🤝 Contributing

We welcome improvements, bug squashing, and optimizations. If you’d like to shape the project, please follow our generic workflow:

1. **Branch out:** Create a new feature branch out of the `main` stable branch (`git checkout -b feature/awesome-new-addition`).
2. **Commit often:** Keep your commit messages descriptive, outlining exactly *why* the change happened.
3. **Open a Pull Request:** Push your code up to GitHub and submit a PR for review. Ensure that your commits have completely tested logic and zero `npm run lint` errors before submission.
