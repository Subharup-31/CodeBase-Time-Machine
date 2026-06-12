# ⏳ Codebase Time Machine

> **Travel through your repository's history and explore the genetic evolution of your code.**

Codebase Time Machine is an AI-powered code intelligence platform designed for developers to analyze, visualize, and ask complex questions about the evolution of any GitHub repository. By generating phylogenetic lineages of code symbols and indexing them into a unified semantic memory, it reconstructs the historical timeline of your code.

---

## ✨ Key Features

- **🎨 Premium Notion/Anthropic Theme**: Minimalist default light theme and complete dark mode integration, featuring high-contrast borders and neutral backgrounds.
- **🌳 Phylogenetic Code Lineages**: Tracks symbols as they mutate, branch, or get deleted across commit history, rendering complete dependency and lineage trees.
- **💬 Conversational RAG Engine**: Chat with your repository's historical timeline. Ask questions like:
  - *"How did the auth middleware logic change in the last 2 months?"*
  - *"Which commits impacted our payment gateway module?"*
  - *"Explain the symbol lineage for `getUserSession`."*
- **📊 Interactive Visualizer**: Visualizes code lineage graphs dynamically using `@xyflow/react` (React Flow) and `dagre` layout engines.
- **⚡ Async Indexing Queue**: Built on **Inngest** for reliable, multi-step background execution (cloning repositories, parsing syntax trees with Tree-sitter, calculating embeddings, and building the phylogenetic graph).
- **🗄️ Supabase Graph Storage**: Relational schema storing repo statuses, index progress, error logs, and computed code graphs as JSONB objects (Vercel-safe serverless database pattern).

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL + Auth + Realtime Subscription)
- **Vector Database**: [Pinecone](https://www.pinecone.io/) (Semantic Chunk Search)
- **Background Runner**: [Inngest](https://www.inngest.com/) (Serverless-friendly Queue)
- **AI Model & Embeddings**: [Google Gemini Pro / OpenRouter](https://deepmind.google/technologies/gemini/)
- **Graph Visualization**: [React Flow (@xyflow/react)](https://reactflow.dev/) & [Dagre](https://github.com/dagrejs/dagre)
- **Testing**: [Vitest](https://vitest.dev/) (Unit and integration suites)
- **Styling**: Tailwind CSS & Framer Motion

---

## 🚀 Getting Started

Follow these steps to configure and run Codebase Time Machine on your local machine.

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Supabase** instance (Local or Cloud)
- **Pinecone** Index (1536 dimensions for Gemini embeddings)
- **Inngest CLI** (for local background jobs development)

### 1. Installation

Clone the repository and install all dependencies:

```bash
git clone https://github.com/yourusername/codebase-time-machine.git
cd codebase-time-machine
npm install
```

### 2. Database Schema Setup

Ensure your Supabase instance has the required tables. Execute the query in `database_schema.sql` inside your Supabase SQL Editor:

```sql
-- Create a table for repositories
CREATE TABLE repositories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    url TEXT NOT NULL,
    collection TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'pending'::text NOT NULL,
    progress INTEGER DEFAULT 0 NOT NULL,
    progress_message TEXT,
    error_message TEXT,
    graph_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    indexed_at TIMESTAMP WITH TIME ZONE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable Row Level Security (RLS)
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;

-- Enable Realtime updates
ALTER PUBLICATION supabase_realtime ADD TABLE repositories;
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root of the project:

```bash
cp env.example .env.local
```

Fill in the required keys in `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenRouter (LLM APIs)
OPENROUTER_API_KEY=your_openrouter_api_key

# Pinecone Vector Store
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX=codebase-time-machine

# GitHub Personal Access Token (for fetching trees and commits)
GITHUB_TOKEN=ghp_your_github_token_here

# Inngest (Background Jobs)
INNGEST_EVENT_KEY=your_inngest_event_key
INNGEST_SIGNING_KEY=your_inngest_signing_key

# Upstash Redis (Optional Response Cache & Rate Limiter)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token

# GitHub Webhook Secret (Required for Auto-Sync)
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here
```

### 4. Running the App Locally

To test background queues and UI updates in real-time, you must run both the **Next.js server** and the **Inngest Dev Server**:

1. **Start the Next.js dev server**:
   ```bash
   npm run dev
   ```

2. **Start the Inngest Dev Server** (in a separate terminal pane):
   ```bash
   npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
   ```

Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🧪 Testing

The codebase utilizes **Vitest** for fast unit and integration tests.

Run the test suite once:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
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
├── components/          # Shared shadcn/ui primitives
├── lib/                 # Core code intelligence engines
│   ├── inngest/         # Inngest function registration and pipeline steps
│   ├── git.ts           # Git branch, tree, and commit fetchers
│   ├── phylogeneticIndexer.ts  # Tree-sitter tree builders & similarity matrices
│   ├── phylogeneticRAG.ts      # Context rerankers & lineage traversal loaders
│   └── repoRegistry.ts         # Database registry managers
└── tailwind.config.ts   # Design tokens & dark mode configuration
```

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.