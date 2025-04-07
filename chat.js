// Store the TMI client globally
let client = null;
let scores = {}; // Global object to store player scores

// Initialize elements
const channelInput = document.getElementById('channel-input');
const connectButton = document.getElementById('connect-btn');
const chatBox = document.getElementById('chat-box');
const statusDiv = document.getElementById('status');
const gameLog = document.getElementById('game-log');
const scoreList = document.getElementById('score-list');

// --- Score Persistence ---
const SCORES_STORAGE_KEY = 'rumsalotScores';

function loadScores() {
  const storedScores = localStorage.getItem(SCORES_STORAGE_KEY);
  if (storedScores) {
    try {
      scores = JSON.parse(storedScores);
      console.log("Scores loaded from localStorage:", scores);
    } catch (e) {
      console.error("Failed to parse scores from localStorage:", e);
      scores = {};
    }
  } else {
    scores = {};
    console.log("No scores found in localStorage, starting fresh.");
  }
  updateScoreboard(); // Update display after loading
}

function saveScores() {
  try {
    localStorage.setItem(SCORES_STORAGE_KEY, JSON.stringify(scores));
    // console.log("Scores saved to localStorage:", scores); // Optional: for debugging
  } catch (e) {
    console.error("Failed to save scores to localStorage:", e);
  }
}

// --- Game UI Updates ---

function addGameLog(message) {
  const logEntry = document.createElement('div');
  logEntry.className = 'game-event';
  logEntry.textContent = message;

  // Optional: Clear initial message if present
  const initialMessage = gameLog.querySelector('.game-event:first-child');
  if (initialMessage && initialMessage.textContent === 'Game events will appear here...') {
    gameLog.innerHTML = ''; // Clear the placeholder
  }

  gameLog.appendChild(logEntry);
  gameLog.scrollTop = gameLog.scrollHeight; // Scroll to bottom

  // Limit log entries
  while (gameLog.children.length > 100) {
    gameLog.removeChild(gameLog.firstChild);
  }
}

function updateScoreboard() {
  scoreList.innerHTML = ''; // Clear existing list

  // Sort scores descending
  const sortedScores = Object.entries(scores)
    .sort(([, scoreA], [, scoreB]) => scoreB - scoreA);

  if (sortedScores.length === 0) {
    const noScoresItem = document.createElement('li');
    noScoresItem.textContent = "No scores yet. Type !dig in chat!";
    noScoresItem.style.textAlign = 'center';
    noScoresItem.style.color = '#888';
    scoreList.appendChild(noScoresItem);
    return;
  }

  sortedScores.forEach(([name, score]) => {
    const listItem = document.createElement('li');

    const nameSpan = document.createElement('span');
    nameSpan.className = 'score-name';
    nameSpan.textContent = name;

    const scoreSpan = document.createElement('span');
    scoreSpan.className = 'score-value';
    scoreSpan.textContent = score;

    listItem.appendChild(nameSpan);
    listItem.appendChild(scoreSpan);
    scoreList.appendChild(listItem);
  });
}

// --- Game Logic ---
function handleGameCommand(username, command, tags) {
  if (command === '!dig') {
    const luck = Math.random();
    let points = 0;
    let message = '';

    if (luck < 0.1) { // 10% chance for rare treasure
      points = 5;
      message = ` ${username} struck gold! Found rare treasure! +${points} points!`;
    } else if (luck < 0.7) { // 60% chance for common treasure (0.1 to 0.7)
      points = 1;
      message = ` ${username} found some treasure! +${points} point!`;
    } else { // 30% chance for nothing
      points = 0;
      message = ` ${username} dug around but found only dirt...`;
    }

    if (points > 0) {
      scores[username] = (scores[username] || 0) + points;
      saveScores();
      updateScoreboard();
    }
    addGameLog(message);
    return true; // Indicate a game command was handled
  }
  // Add more commands here if needed (e.g., !score)
  // else if (command === '!score') { ... }

  return false; // Indicate no game command was handled
}

// --- TMI Connection and Chat Handling ---

// Handle connect/disconnect
connectButton.addEventListener('click', () => {
  if (client && client.readyState() === 'OPEN') {
    disconnectFromChat();
  } else {
    connectToChat();
  }
});

function connectToChat() {
  const channel = channelInput.value.toLowerCase().trim();

  if (!channel) {
    alert('Please enter a channel name');
    return;
  }

  // Create new client using the imported tmi library
  client = new window.tmi.Client({
    connection: {
      secure: true,
      reconnect: true
    },
    channels: [channel]
  });

  // Handle connection
  client.connect().catch(console.error);

  // Setup event handlers
  client.on('connected', () => {
    statusDiv.className = 'status connected';
    statusDiv.textContent = `Connected to ${channel}'s chat`;
    connectButton.textContent = 'Disconnect';
  });

  client.on('disconnected', () => {
    statusDiv.className = 'status disconnected';
    statusDiv.textContent = 'Disconnected from chat';
    connectButton.textContent = 'Connect';
  });

  client.on('message', (channel, tags, message, self) => {
    // Ignore messages from self (if using authenticated client later) or bots
    if (self) return;

    const username = tags['display-name'] || tags['username']; // Use display name if available
    const command = message.trim().toLowerCase();

    // Check if it's a game command first
    const gameHandled = handleGameCommand(username, command, tags);

    // If not handled by game logic, treat as regular chat message
    if (!gameHandled) {
      addChatMessage(username, message, tags);
    }
  });
}

function disconnectFromChat() {
  if (client) {
    client.disconnect();
    client = null;
  }
}

function addChatMessage(username, message, tags) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'chat-message';

  // Add timestamp
  const timestamp = new Date().toLocaleTimeString();
  const timestampSpan = document.createElement('span');
  timestampSpan.className = 'timestamp';
  timestampSpan.textContent = timestamp;
  messageDiv.appendChild(timestampSpan);

  // Add username
  const usernameSpan = document.createElement('span');
  usernameSpan.className = 'username';
  usernameSpan.textContent = username;
  messageDiv.appendChild(usernameSpan);

  // Add message
  const messageText = document.createElement('span');
  messageText.textContent = `: ${message}`;
  messageDiv.appendChild(messageText);

  // Add to chat box and scroll to bottom
  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight;

  // Limit messages to prevent memory issues
  while (chatBox.children.length > 500) {
    chatBox.removeChild(chatBox.firstChild);
  }
}

// Handle Enter key in input
channelInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    connectButton.click();
  }
});

// --- Initial Load ---
loadScores(); // Load scores when the script runs