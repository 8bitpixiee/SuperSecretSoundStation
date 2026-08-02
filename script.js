const gramophone = document.getElementById("gramophoneButton");
const gramophoneStage = document.getElementById("gramophoneStage");
const status = document.getElementById("playerStatus");
const audio = document.getElementById("radioPlayer");
const volume = document.getElementById("volume");
const knob = document.getElementById("volumeKnob");
const customCursor = document.getElementById("customCursor");
const dpadOpen = document.getElementById("dpadOpen");
const dpadPanel = document.getElementById("dpadPanel");
const dpadReadout = document.getElementById("dpadReadout");
const dpadReset = document.getElementById("dpadReset");
const dpadKeys = document.querySelectorAll(".dpad-key");
const dpadSequence = [];

audio.volume = Number(volume.value) / 100;

function updateVolume() {
  const value = Number(volume.value);
  audio.volume = value / 100;
  knob.style.transform = `rotate(${-135 + value * 2.7}deg)`;
}

function setPlaying(playing) {
  gramophone.setAttribute("aria-pressed", String(playing));
  gramophoneStage.classList.toggle("is-playing", playing);
  status.textContent = playing ? "LIVE SIGNAL" : "READY";
}

async function playStation() {
  if (!audio.paused) return;
  status.textContent = "TUNING...";
  try {
    await audio.play();
    setPlaying(true);
  } catch (error) {
    console.error(error);
    setPlaying(false);
    status.textContent = "NO SIGNAL";
  }
}

function pauseStation() {
  audio.pause();
  setPlaying(false);
}

gramophone.addEventListener("click", () => audio.paused ? playStation() : pauseStation());
volume.addEventListener("input", updateVolume);
volume.addEventListener("change", updateVolume);
audio.addEventListener("pause", () => setPlaying(false));
audio.addEventListener("error", () => { setPlaying(false); status.textContent = "NO SIGNAL"; });

if (window.matchMedia("(pointer:fine)").matches) {
  document.body.classList.add("cursor-ready");
  document.addEventListener("pointermove", (event) => {
    customCursor.style.left = `${event.clientX}px`;
    customCursor.style.top = `${event.clientY}px`;
    customCursor.style.opacity = "1";
  });
  document.documentElement.addEventListener("mouseleave", () => {
    customCursor.style.opacity = "0";
  });
}

dpadOpen.addEventListener("click", () => dpadPanel.showModal());
dpadKeys.forEach((key) => {
  key.addEventListener("click", () => {
    dpadSequence.push(key.dataset.direction);
    if (dpadSequence.length > 8) dpadSequence.shift();
    dpadReadout.textContent = dpadSequence.join("  ") || "_ _ _ _ _ _ _ _";
  });
});
dpadReset.addEventListener("click", () => {
  dpadSequence.length = 0;
  dpadReadout.textContent = "_ _ _ _ _ _ _ _";
});
updateVolume();
