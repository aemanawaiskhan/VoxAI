
import React, { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  useNavigate,
} from "react-router-dom";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

function App() {
  return (
    <BrowserRouter>
      <VoxAILayout />
    </BrowserRouter>
  );
}

function VoxAILayout() {
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState("");
  const [reply, setReply] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const navigate = useNavigate();

  async function loadHistory() {
    setHistoryLoading(true);
    setHistoryError("");

    try {
      const response = await fetch(`${API_URL}/history`);

      if (!response.ok) {
        throw new Error("Could not load history.");
      }

      const data = await response.json();
      setHistory(data.history || []);
    } catch (error) {
      setHistoryError(
        "Could not load history. Check that your backend is running."
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  function stopSpeech() {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    setSpeaking(false);
    setPaused(false);
  }

  function speak(text) {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const message = new SpeechSynthesisUtterance(text);
    message.lang = "en-US";
    message.rate = 1;

    message.onstart = () => {
      setSpeaking(true);
      setPaused(false);
    };

    message.onend = () => {
      setSpeaking(false);
      setPaused(false);
    };

    message.onerror = () => {
      setSpeaking(false);
      setPaused(false);
    };

    window.speechSynthesis.speak(message);
  }

  function toggleSpeech() {
    if (!("speechSynthesis" in window)) return;

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setPaused(false);
    } else if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      setPaused(true);
    }
  }

  function toggleMute() {
    if (!muted) {
      stopSpeech();
      setMuted(true);
    } else {
      setMuted(false);
    }
  }

  async function handleCommand(text) {
    const command = text.trim().toLowerCase();

    if (!command) {
      setReply("Please say or type a question first.");
      return;
    }

    if (command.includes("open youtube")) {
      stopSpeech();
      window.open("https://www.youtube.com", "_blank");
      setReply("Opening YouTube in a new tab.");
      if (!muted) speak("Opening YouTube.");
      return;
    }

    if (command.includes("open google")) {
      stopSpeech();
      window.open("https://www.google.com", "_blank");
      setReply("Opening Google in a new tab.");
      if (!muted) speak("Opening Google.");
      return;
    }

    stopSpeech();
    setLoading(true);
    setReply("VoxAI is thinking...");

    try {
      const response = await fetch(`${API_URL}/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: text }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "The AI server returned an error."
        );
      }

      setReply(data.answer);

      if (!muted) {
        speak(data.answer);
      }

      await loadHistory();
    } catch (error) {
      setReply(
        "I couldn't connect to the AI server. " +
          "Please check that the backend is running. " +
          "Details: " +
          error.message
      );
    } finally {
      setLoading(false);
    }
  }

  function startListening() {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setReply(
        "Voice recognition is not supported. Please use Google Chrome."
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setListening(true);
      setReply("I'm listening...");
    };

    recognition.onresult = (event) => {
      const spokenText = event.results[0][0].transcript;
      setQuestion(spokenText);
      handleCommand(spokenText);
    };

    recognition.onerror = () => {
      setReply("I couldn't hear you clearly. Please try again.");
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
  }

  async function clearHistory() {
    const confirmed = window.confirm(
      "Are you sure you want to delete all conversation history?"
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`${API_URL}/history`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Could not clear history.");
      }

      setHistory([]);
      setHistoryError("");
    } catch (error) {
      setHistoryError(
        "Could not clear history. Check that your backend is running."
      );
    }
  }

  function formatDate(timestamp) {
    if (!timestamp) return "Date unavailable";

    const date = new Date(timestamp);

    return Number.isNaN(date.getTime())
      ? "Date unavailable"
      : date.toLocaleString();
  }

  function openConversation(item) {
    setQuestion(item.question);
    setReply(item.answer);
    navigate("/");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-icon">✦</span>
          <span>VoxAI</span>
        </div>

        <p className="sidebar-label">WORKSPACE</p>

        <nav className="sidebar-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
          >
            <span>✧</span> Chat Assistant
          </NavLink>

          <NavLink
            to="/history"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
          >
            <span>◷</span> Conversation History
            <span className="nav-count">{history.length}</span>
          </NavLink>
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-status">
            <span className="status-dot"></span>
            Backend connection
          </div>
          <p>VoxAI · Your personal assistant</p>
        </div>
      </aside>

      <div className="app-panel">
        <header className="topbar">
          <span className="topbar-title">VoxAI Assistant</span>
          <span className="topbar-status">
            <span className="status-dot"></span>
            Ready to help
          </span>
        </header>

        <Routes>
          <Route
            path="/"
            element={
              <main className="page-content chat-page">
                <section className="hero">
                  <div className="hero-icon">✦</div>
                  <p className="eyebrow">
                    YOUR PERSONAL AI ASSISTANT
                  </p>
                  <h1>
                    Hello, I'm <span>VoxAI.</span>
                  </h1>
                  <p className="subtitle">
                    Speak naturally. I'll listen and help you.
                  </p>
                  <p className="wake-word">
                    Your AI voice assistant is ready
                  </p>
                </section>

                <section className="assistant-card">
                  <div className="voice-area">
                    <button
                      className={`mic-button ${
                        listening ? "listening" : ""
                      }`}
                      onClick={startListening}
                      disabled={loading}
                      aria-label="Start voice command"
                    >
                      {listening ? "🎙️" : "🎤"}
                    </button>

                    <p className="mic-title">
                      {listening ? "Listening to you..." : "Tap to speak"}
                    </p>

                    <p className="mic-hint">
                      Try saying "Open YouTube" or "What is AI?"
                    </p>
                  </div>

                  <label htmlFor="question">
                    Ask VoxAI anything
                  </label>

                  <textarea
                    id="question"
                    placeholder="Type your question here..."
                    value={question}
                    onChange={(event) =>
                      setQuestion(event.target.value)
                    }
                  />

                  <button
                    className="ask-button"
                    onClick={() => handleCommand(question)}
                    disabled={loading}
                  >
                    {loading ? "Thinking..." : "Ask VoxAI"}
                  </button>

                  {reply && (
                    <div className="reply" aria-live="polite">
                      {reply}
                    </div>
                  )}

                  <div className="speech-controls">
                    {speaking && (
                      <>
                        <button
                          className="ask-button"
                          onClick={toggleSpeech}
                        >
                          {paused ? "▶ Resume" : "⏸ Pause"}
                        </button>

                        <button
                          className="ask-button"
                          onClick={stopSpeech}
                        >
                          ⏹ Stop
                        </button>
                      </>
                    )}

                    <button
                      className="ask-button"
                      onClick={toggleMute}
                    >
                      {muted ? "🔇 Unmute" : "🔊 Mute"}
                    </button>
                  </div>

                  {muted && (
                    <p className="mic-hint">
                      Voice replies are muted. Answers will appear as text.
                    </p>
                  )}
                </section>
              </main>
            }
          />

          <Route
            path="/history"
            element={
              <main className="page-content history-page">
                <div className="page-heading">
                  <div>
                    <p className="eyebrow">YOUR SAVED CONVERSATIONS</p>
                    <h1>Conversation History</h1>
                    <p className="subtitle">
                      Revisit your questions and VoxAI's answers.
                    </p>
                  </div>

                  <div className="history-actions">
                    <button
                      className="history-button"
                      onClick={loadHistory}
                      disabled={historyLoading}
                    >
                      {historyLoading ? "Loading..." : "↻ Refresh"}
                    </button>

                    <button
                      className="history-button clear-button"
                      onClick={clearHistory}
                      disabled={historyLoading || history.length === 0}
                    >
                      Clear History
                    </button>
                  </div>
                </div>

                {historyError && (
                  <p className="history-error">{historyError}</p>
                )}

                {historyLoading && history.length === 0 && (
                  <p className="history-empty">
                    Loading saved conversations...
                  </p>
                )}

                {!historyLoading &&
                  history.length === 0 &&
                  !historyError && (
                    <div className="history-empty">
                      <span>💬</span>
                      <h3>No conversations yet</h3>
                      <p>Ask VoxAI a question to see it here.</p>
                      <button
                        className="history-button"
                        onClick={() => navigate("/")}
                      >
                        Go to Chat
                      </button>
                    </div>
                  )}

                {history.length > 0 && (
                  <>
                    <p className="history-total">
                      {history.length} saved{" "}
                      {history.length === 1
                        ? "conversation"
                        : "conversations"}
                    </p>

                    <div className="history-list">
                      {[...history].reverse().map((item, index) => (
                        <article
                          className="history-item"
                          key={`${item.timestamp}-${index}`}
                        >
                          <div className="history-item-top">
                            <span className="history-number">
                              Conversation {history.length - index}
                            </span>
                            <span className="history-date">
                              {formatDate(item.timestamp)}
                            </span>
                          </div>

                          <div className="history-question">
                            <span className="history-label">
                              YOU ASKED
                            </span>
                            <p>{item.question}</p>
                          </div>

                          <div className="history-answer">
                            <span className="history-label">
                              VOXAI ANSWERED
                            </span>
                            <p>{item.answer}</p>
                          </div>

                          <button
                            className="reuse-button"
                            onClick={() => openConversation(item)}
                          >
                            View in Chat →
                          </button>
                        </article>
                      ))}
                    </div>
                  </>
                )}
              </main>
            }
          />
        </Routes>

        <footer className="app-footer">
          VoxAI <span>·</span> Your personal voice assistant
        </footer>
      </div>
    </div>
  );
}

export default App;
