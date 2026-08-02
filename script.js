const ACCESS_CODES = {
  station: ["LEFT","RIGHT","LEFT","RIGHT","RIGHT","DOWN","UP","UP","DOWN","DOWN","DOWN","UP"],
  vault: ["UP","DOWN","DOWN","UP","RIGHT","DOWN","RIGHT","UP","LEFT","RIGHT","DOWN","UP","UP"]
};
const FAILURE_MESSAGE = "If you don't know where you want to go, then it doesn't matter which path you take.";
const page = document.body.dataset.page;
const customCursor = document.getElementById("customCursor");

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
document.querySelectorAll(".station-trigger").forEach(button => button.addEventListener("click", () => location.href = "station.html"));

const panel = document.getElementById("dpadPanel");
if (panel) {
  const title = document.getElementById("dpadTitle");
  const readout = document.getElementById("dpadReadout");
  const timerText = document.getElementById("timerText");
  const resetButton = document.getElementById("dpadReset");
  const keys = document.querySelectorAll(".dpad-key");
  let destination = "station";
  let sequence = [];
  let startedAt = 0;
  let timer = null;

  function resetInput(message = "CHOOSE A PATH.") {
    sequence = [];
    startedAt = 0;
    clearInterval(timer);
    timer = null;
    timerText.textContent = "10.0";
    readout.textContent = message;
  }

  function fail() {
    resetInput(FAILURE_MESSAGE);
    panel.classList.add("is-denied");
    setTimeout(() => panel.classList.remove("is-denied"), 500);
  }

  function startTimer() {
    startedAt = Date.now();
    timer = setInterval(() => {
      const remaining = Math.max(0, 10000 - (Date.now() - startedAt));
      timerText.textContent = (remaining / 1000).toFixed(1);
      if (remaining <= 0) fail();
    }, 100);
  }

  document.querySelectorAll(".access-trigger").forEach(button => {
    button.addEventListener("click", () => {
      destination = button.dataset.destination;
      title.textContent = destination === "vault" ? "VAULT FREQUENCY" : "STATION FREQUENCY";
      resetInput();
      panel.showModal();
    });
  });

  keys.forEach(key => key.addEventListener("click", () => {
    if (!startedAt) startTimer();
    sequence.push(key.dataset.direction);
    readout.textContent = sequence.map(direction => direction[0]).join(" ");
    const expected = ACCESS_CODES[destination];
    if (sequence.length === expected.length) {
      if (sequence.every((direction, index) => direction === expected[index])) {
        clearInterval(timer);
        sessionStorage.setItem(`access_${destination}`, "granted");
        readout.textContent = "PATH FOUND.";
        setTimeout(() => location.href = `${destination}.html`, 450);
      } else {
        fail();
      }
    }
  }));
  resetButton.addEventListener("click", () => resetInput());
  panel.addEventListener("close", () => resetInput());
}

if (page === "station" && sessionStorage.getItem("access_station") !== "granted") location.replace("index.html");
if (page === "vault" && sessionStorage.getItem("access_vault") !== "granted") location.replace("index.html");

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
    indicator.classList.toggle("is-offline", !playing);
    broadcastText.textContent = playing ? "Broadcasting LIVE, from somewhere..." : "OFF AIR";
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
}
