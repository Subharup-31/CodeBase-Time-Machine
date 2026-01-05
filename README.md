# ⏳ Codebase Time Machine

> **Travel through your repository's history and ask questions about its evolution.**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Gemini](https://img.shields.io/badge/AI-Gemini-orange)

## 📖 Overview

**Codebase Time Machine** is an intelligent developer tool that allows you to explore the history of any GitHub repository. By combining the power of **Google Gemini** for reasoning and **Qdrant** for vector search, it indexes your codebase's evolution, enabling you to ask complex questions about how features changed, when bugs were introduced, or why certain design decisions were made.

It's not just a code viewer; it's a conversational interface for your git history.

## ✨ Key Features

-   **🔍 Deep Repository Ingestion**: Fetches complete file trees and commit history using the GitHub API.
-   **🧠 Smart Indexing**: Chunks and embeds code content to understand semantic meaning across different versions.
-   **💬 Interactive Q&A**: Chat with your codebase! Ask questions like "How did the auth logic change in the last month?" or "Who added the payment gateway?".
-   **📊 Visualizations**: Automatically generates Mermaid diagrams to visualize architectural changes and flow.
-   **⚡ Modern Stack**: Built with performance and UX in mind using Next.js 14, Tailwind CSS, and Framer Motion.

## 🛠️ Tech Stack

-   **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [Framer Motion](https://www.framer.com/motion/)
-   **AI Model**: [Google Gemini Pro](https://deepmind.google/technologies/gemini/)
-   **Vector Database**: [Qdrant](https://qdrant.tech/)
-   **Icons**: [Lucide React](https://lucide.dev/)

## 🚀 Getting Started

Follow these steps to set up the project locally.

### Prerequisites

-   **Node.js** (v18 or higher)
-   **npm** or **yarn**
-   A **GitHub Personal Access Token**
-   A **Google Gemini API Key**
-   A **Qdrant** instance (Cloud or Docker)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/codebase-time-machine.git
    cd codebase-time-machine
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables**
    Create a `.env.local` file in the root directory and add your API keys. You can use `.env.example` as a reference:

    ```bash
    cp env.example .env.local
    ```

    Open `.env.local` and fill in the values:
    ```env
    # GitHub Token (for fetching repos)
    GITHUB_TOKEN=your_github_token_here

    # Gemini API Key (for reasoning and embeddings)
    GEMINI_API_KEY=your_gemini_api_key_here

    # Qdrant (for vector storage)
    QDRANT_URL=your_qdrant_url_here
    QDRANT_API_KEY=your_qdrant_api_key_here
    ```

4.  **Run the Development Server**
    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📂 Project Structure

```
.
├── app/                  # Next.js App Router pages and layouts
│   ├── api/              # API Routes (Ask, Ingest, etc.)
│   ├── components/       # Shared UI components
│   ├── dashboard/        # Main application views
│   └── landing/          # Landing page
├── lib/                  # Core logic and utilities
│   ├── gemini.ts         # AI interaction logic
│   ├── git.ts            # GitHub API helpers
│   ├── lamatic.ts        # Main pipeline orchestration
│   └── qdrant.ts         # Vector database operations
└── public/               # Static assets
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.