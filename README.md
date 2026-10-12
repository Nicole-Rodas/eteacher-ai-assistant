# eTeacher Formative AI Assistant

A high-performance Chrome extension designed for the **Programino** platform, providing automated, socratic formative feedback and a hybrid "Human-in-the-Loop" evaluation workflow for programming courses.

---

## Current Project Status & Architecture Summary

The system is built as a **Manifest V3 Chrome Extension** utilizing a modular, data-driven architecture to automate grading and feedback generation for large student cohorts (supporting up to 300 students per class).

### Core Features Implemented:

* **Multi-Strategy DOM Adapter (`dom-adapter.js`):** Extends extraction strategies beyond simple code blocks to handle open text answers, multiple-choice options, active UI buttons, and canvas/SVG visual diagrams within Programino review modals.
* **Batch Harvesting Engine ("Ghost Clicking"):** Automatically navigates student submission modals via safe DOM iteration (`harvestAllClassSubmissions`), persisting harvested data incrementally into `chrome.storage.local` to prevent data loss.
* **Hybrid Validation & Triage Strategy:** Implements an automated threshold workflow where high-certainty evaluations ($\ge 85\%$) can auto-submit feedback, while lower-certainty results are routed to the instructor for manual review (*Human-in-the-Loop*).
* **Modular Code Structure:** Clean separation of concerns featuring internationalization (`i18n.js`), DOM manipulation and scraping (`dom-adapter.js`), user interface overlays (`ui-panel.js`), and assistant logic (`chat-panel.js`).

---

## Project Structure

```text
eteacher-project/
├── backend-service/
│   ├── database/
│   ├── node_modules/
│   ├── src/
│   │   ├── config/
│   │   │   └── concepts.js
│   │   ├── routes/
│   │   │   ├── chat.routes.js
│   │   │   └── evaluation.routes.js
│   │   └── services/
│   │       ├── gemini-service.js
│   │       ├── prompt-builder.js
│   │       └── supabase-service.js
│   ├── server.js
│   ├── .env
│   ├── package-lock.json
│   └── package.json
│
└── extension-client/
    ├── assets/
    ├── src/
    │   ├── background/
    │   │   └── service-worker.js
    │   ├── content/
    │   │   ├── chat-panel.js
    │   │   ├── content-main.js
    │   │   ├── dom-adapter.js
    │   │   ├── i18n.js
    │   │   └── ui-panel.js
    │   └── styles/
    │       └── panel.css
    ├── manifest.json

```

## Getting Started & Installation Guide

Follow these steps to clone and run the extension locally in Google Chrome.

### Prerequisites

* **Google Chrome** (or any Chromium-based browser like Brave or Edge).
* A running backend service (if testing live API calls, configured locally at `http://localhost:3000`).

### Step 1: Clone the Repository

Open your terminal and clone the repository to your local machine:

```bash
git clone https://github.com/your-username/eteacher-ai-assistant.git
cd eteacher-ai-assistant

```

### Step 2: Load the Extension in Chrome

1. Open Google Chrome and type `chrome://extensions/` in the address bar.
2. In the top-right corner, toggle on **Developer mode**.
3. In the top-left corner, click the **Load unpacked** button.
4. Select the root directory of your cloned repository (`eteacher-ai-assistant`).

### Step 3: Verify Installation

* The **eTeacher Formative AI Assistant** icon should appear in your Chrome toolbar.
* Navigate to a Programino course or evaluation view (`*://*/*`); the extension's content scripts will automatically inject evaluation triggers into valid task blocks and modal views.

---

## Configuration & Permissions

The extension requests the following permissions via `manifest.json`:

* `storage`: Used for caching batch-harvested student submissions locally (`chrome.storage.local`).
* `activeTab`: Interacts with the active Programino workspace DOM.
* `host_permissions`: Configured to communicate securely with local development backends (`http://localhost:3000/*`) and target educational domains.
