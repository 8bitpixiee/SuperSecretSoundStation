const gramophone = document.getElementById("gramophoneButton");
const playButton = document.getElementById("playButton");
const pauseButton = document.getElementById("pauseButton");
const status = document.getElementById("playerStatus");
const audio = document.getElementById("radioPlayer");
const volume = document.getElementById("volume");
const knob = document.getElementById("volumeKnob");

audio.volume = Number(volume.value) / 100;

function updateVolume() {
  const value = Number(volume.value);
  audio.volume = value / 100;
  knob.style.transform = `rotate(${-135 + value * 2.7}deg)`;
}

function setPlaying(playing) {
  gramophone.setAttribute("aria-pressed", String(playing));
  playButton.disabled = playing;
  pauseButton.disabled = !playing;
  playButton.classList.toggle("is-active", playing);
  pauseButton.classList.toggle("is-active", !playing);
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
playButton.addEventListener("click", playStation);
pauseButton.addEventListener("click", pauseStation);
volume.addEventListener("input", updateVolume);
volume.addEventListener("change", updateVolume);
audio.addEventListener("pause", () => setPlaying(false));
audio.addEventListener("error", () => { setPlaying(false); status.textContent = "NO SIGNAL"; });
updateVolume();
