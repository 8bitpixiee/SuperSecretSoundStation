const FAILURE_MESSAGE = "If you don't know where you want to go, then it doesn't matter which path you take.";
const page = document.body.dataset.page;
const customCursor = document.getElementById("customCursor");
let broadcastIsLive = false;

function renderBroadcastStatus() {
  const indicator = document.getElementById("recordIndicator");
  const text = document.getElementById("broadcastText");
  if (!indicator || !text) return;
  indicator.classList.toggle("is-offline", !broadcastIsLive);
  text.textContent = broadcastIsLive ? "Broadcasting LIVE, from somewhere..." : "OFF AIR";
}

async function refreshBroadcastStatus() {
  try {
    const response = await fetch("/api/live", { cache: "no-store" });
    if (!response.ok) throw new Error("Status unavailable");
    const data = await response.json();
    broadcastIsLive = data.live === true;
  } catch {
    broadcastIsLive = false;
  }
  renderBroadcastStatus();
}

if (window.matchMedia("(pointer:fine)").matches && customCursor) {
  document.body.classList.add("cursor-ready");
  document.addEventListener("pointermove", (event) => {
    customCursor.style.left = `${event.clientX}px`;
    customCursor.style.top = `${event.clientY}px`;
    customCursor.style.opacity = "1";
  });
  document.documentElement.addEventListener("mouseleave", () => customCursor.style.opacity = "0");
}

document.querySelectorAll(".home-trigger").forEach(button => button.addEventListener("click", () => location.href = "index.html"));
function openStationPlayer() {
  const width = Math.min(900, window.screen.availWidth);
  const height = Math.min(900, window.screen.availHeight);
  const left = Math.max(0, Math.round((window.screen.availWidth - width) / 2));
  const top = Math.max(0, Math.round((window.screen.availHeight - height) / 2));
  return window.open(
    "station.html",
    "superSecretStationPlayer",
    `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
  );
}

document.querySelectorAll(".station-trigger").forEach(button => button.addEventListener("click", () => {
  const playerWindow = openStationPlayer();
  if (!playerWindow) location.href = "station.html";
}));

const panel = document.getElementById("dpadPanel");
if (panel) {
  const title = document.getElementById("dpadTitle");
  const readout = document.getElementById("dpadReadout");
  const timerText = document.getElementById("timerText");
  const resetButton = document.getElementById("dpadReset");
  const keys = document.querySelectorAll(".dpad-key");
  const dpadControls = panel.querySelector(".dpad-controls");
  const passcodeBox = document.getElementById("settingsPasscode");
  const passcodeInput = document.getElementById("settingsPasscodeInput");
  const passcodeSubmit = document.getElementById("settingsSubmit");
  let destination = "station";
  let sequence = [];
  let startedAt = 0;
  let timer = null;

  function resetInput(message = "CHOOSE A PATH.") {
    sequence = [];
    startedAt = 0;
    clearInterval(timer);
    timer = null;
    timerText.textContent = "20.0";
    readout.textContent = message;
    dpadControls.hidden = false;
    resetButton.hidden = false;
    passcodeBox.hidden = true;
    passcodeInput.value = "";
  }

  function fail() {
    resetInput(FAILURE_MESSAGE);
    panel.classList.add("is-denied");
    setTimeout(() => panel.classList.remove("is-denied"), 500);
  }

  function startTimer() {
    startedAt = Date.now();
    timer = setInterval(() => {
      const remaining = Math.max(0, 20000 - (Date.now() - startedAt));
      timerText.textContent = (remaining / 1000).toFixed(1);
      if (remaining <= 0) fail();
    }, 100);
  }

  document.querySelectorAll(".access-trigger").forEach(button => {
    button.addEventListener("click", () => {
      destination = button.dataset.destination;
      title.textContent = destination === "vault" ? "VAULT FREQUENCY" : destination === "settings" ? "CONTROL FREQUENCY" : "STATION FREQUENCY";
      resetInput();
      if (customCursor) panel.appendChild(customCursor);
      panel.showModal();
    });
  });

  function enterDirection(direction) {
    if (!startedAt) startTimer();
    sequence.push(direction);
    // Never reveal the directional access code on-screen while it is entered.
    readout.textContent = sequence.map(() => "★").join(" ");
    if (sequence.length === 8) {
      clearInterval(timer);
      timer = null;
      if (destination === "settings") {
        dpadControls.hidden = true;
        resetButton.hidden = true;
        passcodeBox.hidden = false;
        passcodeInput.focus();
      } else {
        submitUnlock();
      }
    }
  }

  async function submitUnlock(passcode = "") {
    // Open during the user's click/key event so popup blockers allow it.
    // The named window is reused if the station is already open.
    const playerWindow = destination === "station" ? window.open(
    "",
      "superSecretStationPlayer",
      `popup=yes,width=${Math.min(900, window.screen.availWidth)},height=${Math.min(900, window.screen.availHeight)},resizable=yes,scrollbars=yes`
    ) : null;
    readout.textContent = "SEARCHING...";
    try {
      const response = await fetch("/api/unlock", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ destination, sequence, passcode })
      });
      const result = await response.json();
      if (!response.ok) {
        if (playerWindow) playerWindow.close();
        fail();
        readout.textContent = result.error || FAILURE_MESSAGE;
        return;
      }
      readout.textContent = "PATH FOUND.";
      if (destination === "station") {
        setTimeout(() => {
          if (playerWindow) {
            playerWindow.location.replace("station.html");
            playerWindow.focus();
          } else {
            location.href = "station.html";
          }
          panel.close();
        }, 450);
      } else {
        setTimeout(() => location.href = `${destination}.html`, 450);
      }
    } catch {
      if (playerWindow) playerWindow.close();
      fail();
    }
  }

  keys.forEach(key => key.addEventListener("click", () => enterDirection(key.dataset.direction)));
  document.addEventListener("keydown", (event) => {
    if (!panel.open) return;
    const directions = { ArrowUp:"UP", ArrowDown:"DOWN", ArrowLeft:"LEFT", ArrowRight:"RIGHT" };
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    enterDirection(direction);
  });
  resetButton.addEventListener("click", () => resetInput());
  passcodeSubmit.addEventListener("click", () => submitUnlock(passcodeInput.value));
  passcodeInput.addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); submitUnlock(event.currentTarget.value); } });
  panel.addEventListener("close", () => {
    resetInput();
    if (customCursor) document.body.prepend(customCursor);
  });
}

const gramophone = document.getElementById("gramophoneButton");
if (gramophone) {
  const stage = document.getElementById("gramophoneStage");
  const status = document.getElementById("playerStatus");
  const indicator = document.getElementById("recordIndicator");
  const broadcastText = document.getElementById("broadcastText");
  const audio = document.getElementById("radioPlayer");
  const volume = document.getElementById("volume");
  const knob = document.getElementById("volumeKnob");
  function updateVolume() { const value = Number(volume.value); audio.volume = value / 100; knob.style.transform = `rotate(${-135 + value * 2.7}deg)`; }
  function setPlaying(playing) {
    gramophone.setAttribute("aria-pressed", String(playing));
    stage.classList.toggle("is-playing", playing);
    document.querySelector(".glow")?.classList.toggle("is-playing", playing);
    status.textContent = playing ? "LIVE SIGNAL" : "READY";
  }
  async function playStation() { if (!audio.paused) return; status.textContent = "TUNING..."; try { await audio.play(); setPlaying(true); } catch (error) { console.error(error); setPlaying(false); status.textContent = "NO SIGNAL"; } }
  function pauseStation() { audio.pause(); setPlaying(false); }
  gramophone.addEventListener("click", () => audio.paused ? playStation() : pauseStation());
  volume.addEventListener("input", updateVolume);
  volume.addEventListener("change", updateVolume);
  audio.addEventListener("playing", () => setPlaying(true));
  audio.addEventListener("pause", () => setPlaying(false));
  audio.addEventListener("error", () => { setPlaying(false); status.textContent = "NO SIGNAL"; });
  updateVolume(); setPlaying(false);
  refreshBroadcastStatus();
  setInterval(refreshBroadcastStatus, 15000);
}

if (page === "settings") {
  const liveToggle = document.getElementById("liveToggle");
  const state = document.getElementById("settingsState");
  const stateText = document.getElementById("settingsStateText");

  function renderSettingsState() {
    state.classList.toggle("is-live", broadcastIsLive);
    stateText.textContent = broadcastIsLive ? "BROADCASTING LIVE" : "OFF AIR";
    liveToggle.textContent = broadcastIsLive ? "GO OFF AIR" : "GO LIVE";
    liveToggle.disabled = false;
  }

  async function loadSettingsState() {
    await refreshBroadcastStatus();
    renderSettingsState();
  }

  liveToggle.addEventListener("click", async () => {
    liveToggle.disabled = true;
    stateText.textContent = "UPDATING...";
    try {
      const response = await fetch("/api/live", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ live:!broadcastIsLive })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Update failed");
      broadcastIsLive = result.live === true;
      renderSettingsState();
    } catch (error) {
      stateText.textContent = error.message.toUpperCase();
      liveToggle.disabled = false;
    }
  });

  loadSettingsState();
}
