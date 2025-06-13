# Multi-LLM OLAT Question Generator

This web application provides a user-friendly interface to generate various types of quiz questions for learning platforms like OLAT, using different Large Language Models (LLMs).

**Live Application:** [**https://rossipietro.github.io/olat/multiLLM**](https://rossipietro.github.io/olat/multiLLM)

## Overview of Functionalities

* **Multi-Provider Support**: Easily switch between major LLM providers:
    * Google (Gemini models)
    * OpenAI (GPT-4o, GPT-4.1)
    * DeepSeek
* **Multimedia Input**: Generate questions based on various content types:
    * Pasted text
    * Image uploads (PNG, JPG)
    * Audio and Video file uploads (supported with Gemini models)
* **Diverse Question Types**: Create a wide range of questions suitable for different assessment goals:
    * Single-Choice
    * Multiple-Choice (with 1, 2, or 3 correct answers)
    * K-Prim
    * True/False
    * Drag & Drop
    * Inline Fill-in-the-Blank
* **Customization**: Tailor the output to your specific needs:
    * **Language**: Generate questions in German or English.
    * **Target Level**: Adjust the complexity from A2 (elementary) to C2 (expert) based on the Common European Framework of Reference for Languages (CEFR).
* **AI-Powered Assistants**:
    * **Learning Goal Assistant**: Automatically generate learning objectives ("The students will be able to...") from your source material.
    * **Topic Explorer**: Get suggestions for related topics and concepts to broaden the learning scope.
* **User-Focused Features**:
    * **Token Tracking**: Monitor your API usage with a clear breakdown of input, output, and total tokens for each generation.
    * **Generation History**: View, download, or delete past results within the same session.
    * **Secure API Key Storage**: Optionally save your API keys locally in your browser for convenience.
    * **Export**: Download all generated content in a single `.txt` file, formatted for easy import.

---

## Technology Stack

The application is built with a focus on a clean, framework-free frontend that runs entirely in the browser.

* **Frontend**:
    * **HTML5**: For the core structure and content.
    * **JavaScript (ES6 Modules)**: For all client-side logic, including DOM manipulation, state management, and API communication. The code is organized into modules (`api.js`, `ui.js`, `utils.js`, `main.js`) for better maintainability.
    * **CSS3**: For custom styling, including animations (`@keyframes`) and gradients.

* **Styling**:
    * **Tailwind CSS**: A utility-first CSS framework used for rapid and responsive UI development.

* **API & Data Handling**:
    * **Fetch API**: Used for all asynchronous API calls to the Google, OpenAI, and DeepSeek backends.
    * **Browser `localStorage`**: Used to securely persist user API keys (on an opt-in basis) and the session's generation history.

* **Development Approach**:
    * **Static Site**: The application is a static website with no server-side backend, making it fast and easy to deploy.
    * **Prompt Engineering**: Prompt templates for each question type are stored in external `.md` files within the `/prompts` directory. This decouples the prompt logic from the application code, allowing for easy updates and maintenance.

* **Hosting**:
    * **GitHub Pages**: The application is hosted directly from a GitHub repository, which is ideal for static websites.
