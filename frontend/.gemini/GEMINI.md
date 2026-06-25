# 🌳 Context & Rules for Baobab (Frontend)

## 🎯 Project Overview
Baobab is a modern, open-source, and self-hosted RAG (Retrieval-Augmented Generation) application. It allows users to upload documents (PDF, Markdown) into isolated Workspaces and chat with a local AI about those documents. 
Privacy and data ownership are the core values. The backend is built with NestJS, PostgreSQL (pgvector), and Ollama.

## 🛠️ Tech Stack & Architecture
- **Framework:** Angular 22
- **Architecture:** STRICTLY Standalone Components (No NgModules).
- **Reactivity:** Use Angular Signals as the primary reactivity model. RxJS should only be used for complex asynchronous streams (like HTTP requests or SSE) and interoperability.
- **Styling:** Tailwind CSS.
- **Icons:** Lucide Icons (or similar modern/minimalist SVG icons).
- **API Communication:** - Standard REST calls: We use `ng-openapi`. All generated types, models, and services are strictly located in the `src/client` directory. Do not manually create API interfaces or standard HTTP calls if they already exist in this folder.
  - LLM Chat Streaming: Custom implementation using Server-Sent Events (SSE) via native `EventSource` or `@microsoft/fetch-event-source` (the auto-generated client does not support streaming).

## 🎨 UI/UX Philosophy
- **Vibe:** "Developer-focused SaaS" (Inspired by Vercel, Linear, NotebookLM).
- **Theme:** Dark mode by default. Deep dark backgrounds (slate/zinc) with subtle earthy green accents for primary actions.
- **Aesthetic:** Minimalist, high-contrast typography (Inter/Roboto), subtle borders, no heavy shadows.
- **Layout:** - Left collapsible sidebar for Workspaces and Conversations history.
  - Central main area for document management and the Chat Interface.
  - Bottom sticky area for the prompt input.

## 🧱 Core Frontend Features & Components
1. **Workspace & Document Management:** Data tables/grids to list documents, check upload status, and view document versions.
2. **The Source Selector (Critical UX):** A dynamic UI component attached to the chat input. It allows users to quickly select/unselect specific document versions to inject into the AI's context for their *next* message.
3. **Chat Interface:**
   - Displays user messages and AI responses.
   - AI responses stream in real-time (Typewriter effect via SSE).
   - **Citation Chips:** Small interactive badges (e.g., `[Doc A]`) rendered at the end of AI paragraphs to show which sources were used.

## 📐 Coding Conventions & Rules
- **Smart/Dumb Components:** Clearly separate logic (Smart/Container components) from presentation (Dumb/UI components).
- **State Management:** Keep it simple. Use Angular Signals within Services for local state. 
- **Services:** Use the new Angular 22 `@Service()` decorator. You must import it directly from `@angular/core` (`import { Service } from '@angular/core';`). Do NOT use the legacy `@Injectable({ providedIn: 'root' })` decorator.
- **Strict Typing:** Always type interfaces, especially API payloads and SSE chunk responses. Avoid `any`.
- **Component Styling:** Use Tailwind utility classes directly in the template. Avoid writing custom CSS in the `.component.scss` files unless it's for complex animations or pseudo-elements.
- **Error Handling:** Gracefully handle API errors and show toast notifications for background tasks (like document embeddings).

## 🚨 Specific AI Assistant Instructions
- When asked to generate a component, default to `standalone: true`.
- Use the modern Angular control flow (`@if`, `@for`, `@defer`) exclusively. Do NOT use `*ngIf` or `*ngFor`.
- When dealing with the chat feature, remember that the backend returns `text/event-stream`. Do NOT use the standard `HttpClient.post` for the chat generation endpoint.
- Always implement loading states and skeleton loaders for better UX.