# ⏳ Codebase Time Machine

> **Travel through your repository's history and explore the genetic evolution of your code.**

Codebase Time Machine is an AI-powered code intelligence platform designed to analyze, visualize, and ask complex questions about the evolution of any GitHub repository. By generating phylogenetic lineages of code symbols and indexing them into a unified semantic memory, it reconstructs the historical timeline of your code.

This project is built to solve serverless cold-start limitations, database bottlenecks, and rate-limiting issues on modern production platforms like Vercel.

---

## ✨ Key Features

* **🌳 Phylogenetic Code Lineages**: Tracks symbols as they mutate, branch, or get deleted across commit history, rendering complete dependency and lineage trees.
* **⚡ Serverless-Ready AST Parsing**: Runs WebAssembly-based syntax trees via `web-tree-sitter`, resolving native C++ compilation deployment blocks on serverless environments.
* **🧬 Rename-Immune Symbol Tracking**: Leverages recursive **Merkle structural AST hashes** and **AST node-type sequence Jaccard similarity** to map code symbols through complex refactors and variable renames.
* **🗄️ Database-Side Graph Traversal**: Employs recursive Common Table Expressions (CTEs) and aggregation stored procedures inside PostgreSQL/Supabase to avoid Node.js memory crashes on large codebases.
* **💬 Conversational RAG Engine**: Chat with your repository's historical timeline. Enriches search results with call graph metadata, callers, callees, and ancestors.
* **📊 Interactive Visualizer**: Visualizes code lineage graphs dynamically using `@xyflow/react` (React Flow) and `dagre` layout engines.
* **🔄 Rate-Limit Protection**: Utilizes exponential backoff retries on OpenAI/OpenRouter embedding requests to prevent transaction failures during repository indexing.

---

## 🛠️ Tech Stack

* **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
* **Language**: [TypeScript](https://www.typescriptlang.org/)
* **Database**: [Supabase](https://supabase.com/) (PostgreSQL + Auth + Realtime Subscription)
* **Vector Database**: [Pinecone](https://www.pinecone.io/) (Semantic Chunk Search organized by Namespace)
* **Background Queue**: [Inngest](https://www.inngest.com/) (Serverless-friendly Orchestrator)
* **AI Model & Embeddings**: [Google Gemini Pro / OpenRouter](https://deepmind.google/technologies/gemini/)
* **Graph Visualization**: [React Flow (@xyflow/react)](https://reactflow.dev/) & [Dagre](https://github.com/dagrejs/dagre)
* **Testing**: [Vitest](https://vitest.dev/) (Unit and integration suites)
* **Styling**: Tailwind CSS & Framer Motion

---

## 🔑 Environment Variables

To run the application locally, you must configure a `.env.local` file in the root of the project. Copy from [env.example](file:///Volumes/WD_Subharup/Codebase-TimeMachine/env.example):

```bash
cp env.example .env.local
```

### Required Keys

| Variable Name | Description | Example |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project API URL | `https://your-ref.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anonymous Client Key | `eyJhbGciOiJIUzI...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for admin DB calls | `eyJhbGciOiJIUzI...` |
| `OPENROUTER_API_KEY` | OpenRouter key for LLM & Embeddings | `sk-or-v1-...` |
| `PINECONE_API_KEY` | Pinecone database connection key | `pcsk_...` |
| `PINECONE_INDEX` | Pinecone index name | `codebase-time-machine` |
| `GITHUB_TOKEN` | Classic GitHub PAT (`repo:read` scope) | `ghp_...` |
| `INNGEST_EVENT_KEY` | Event key for Inngest dev server | `your_key` |
| `INNGEST_SIGNING_KEY` | Signing key for Inngest dev server | `your_key` |

---

## 🚀 Getting Started

### 1. Installation

Install Node dependencies:

```bash
npm install
```

### 2. Database Schema Setup

Execute [database_schema.sql](file:///Volumes/WD_Subharup/Codebase-TimeMachine/database_schema.sql) in your Supabase SQL Editor. This sets up tables, performance indexes, row-level security (RLS), and our graph traversal procedures:

* **`get_symbol_ancestors(start_node_id UUID)`**: Performs a recursive CTE graph search to fetch all ancestors of a given node.
* **`get_evolutionary_hotspots(target_repo_id UUID)`**: Computes change volatility rankings of symbols based on historical mutation commits.

### 3. Running the App Locally

To test background queues and UI updates, you must run the **Next.js server** and the **Inngest Dev Server** in parallel.

1. **Start the Next.js dev server**:
   ```bash
   npm run dev
   ```

2. **Start the Inngest Dev Server** (in a separate terminal pane):
   ```bash
   npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
   ```

Open [http://localhost:3000](http://localhost:3000) to view the application dashboard.

---

## 🧪 Testing

The codebase utilizes **Vitest** for fast unit and integration tests.

Run the test suite:
```bash
npm test
```

Run tests in watch mode:
```bash
npx vitest
```

---

## 📂 Project Architecture

```
├── __tests__/           # Vitest Unit and Integration tests
├── app/                 # Next.js App Router Pages & Actions
│   ├── api/             # API routes (Inngest, Ask RAG, Graph loader)
│   ├── components/      # Global components (ThemeProvider)
│   ├── dashboard/       # Sidebar, Topbar, Repos list, Time Machine Chat
│   └── repo/            # Repository phylogenetic graph visualizer
├── components/          # Shared UI primitives
├── lib/                 # Core code intelligence engines
│   ├── inngest/         # Inngest function registration and pipeline steps
│   ├── git.ts           # Git branch, tree, and commit fetchers
│   ├── openrouter.ts    # OpenRouter API wrapper with retry-backoff
│   ├── pinecone.ts      # Pinecone namespace vector store manager
│   ├── graphStore.ts    # Supabase graph stored procedure client
│   ├── phylogeneticIndexer.ts  # WASM Tree-sitter AST & Merkle hash builders
│   ├── phylogeneticRAG.ts      # Call graph context rerankers & lineage engines
│   └── repoRegistry.ts         # Database registry managers
└── tailwind.config.ts   # Design tokens & dark mode configuration
```

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.