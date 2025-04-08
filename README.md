# Conversational Training Tool for APRN Students

This project provides a web-based simulator for Advanced Practice Registered Nurse (APRN) students to practice sensitive patient conversations.

## Features

*   **Realistic Scenarios**: Practice conversations based on faculty-authored patient personas detailing background, goals, and emotional states.
*   **GuideLLM-Inspired AI Interaction**: 
    *   **Goal Navigation:** Patient AI subtly guides conversation towards key milestones/topics defined in the persona, while allowing the student to lead the interaction.
    *   **Context Management:** Maintains conversational context (history, topics, emotion) for realistic and coherent responses (inspired by MGE).
    *   **Empathetic Engagement:** AI responses are driven by explicit persona instructions for tone, emotion, and empathy.
*   **Voice Interaction**: Leverages Hume AI for real-time speech-to-speech communication.
*   **Faculty Monitoring & Chat**: Allows instructors to observe sessions and provide real-time text-based chat feedback.
*   **Transcription**: Provides a log of the AI/patient conversation.
*   **Session Management**: Unique IDs for connecting students and faculty.

## Setup

### Prerequisites

*   Node.js (v18 or later recommended)
*   npm
*   Hume AI API Key

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd ut-nursing-ai
    ```

2.  **Install Frontend Dependencies:**
    ```bash
    npm install
    ```

3.  **Install Backend Dependencies:**
    ```bash
    cd server
    npm install
    cd ..
    ```

4.  **Environment Variables:**
    *   Create a `.env` file in the root directory:
        ```dotenv
        VITE_WS_SERVER_URL=http://localhost:3001
        VITE_HUME_API_KEY=your_hume_api_key
        ```
    *   Create a `.env` file in the `server` directory:
        ```dotenv
        PORT=3001
        CLIENT_URL=http://localhost:8080 # Or the port your frontend runs on
        HUME_API_KEY=your_hume_api_key
        ```
    *Replace `your_hume_api_key` with your actual key.*

## Running the Application

1.  **Start the Backend Server:**
    ```bash
    cd server
    npm run dev
    ```

2.  **Start the Frontend Development Server:**
    (In a separate terminal, from the root directory)
    ```bash
    npm run dev
    ```

3.  Open your browser to the URL provided by the frontend server (e.g., `http://localhost:8080`).

## Development

*   **Frontend**: React, TypeScript, Vite, Tailwind CSS, Shadcn UI
*   **Backend**: Node.js, TypeScript, Express, Socket.IO

## Deployment

(Deployment instructions TBD)

## Contributing

(Contribution guidelines TBD)
