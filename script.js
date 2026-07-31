const button = document.getElementById("playerButton");
const label = document.getElementById("playerLabel");
const status = document.getElementById("playerStatus");
const audio = document.getElementById("radioPlayer");
const volume = document.getElementById("volume");
const knob = document.getElementById("volumeKnob");

audio.volume = Number(volume.value) / 100;

function setPlaying(playing) {
  button.classList.toggle("is-playing", playing);
  button.setAttribute("aria-pressed", String(playing));
  button.setAttribute("aria-label", playing ? "Pause radio station" : "Play radio station");
  label.textContent = playing ? "PAUSE" : "PLAY";
  status.textContent = playing ? "LIVE" : "READY";
}

button.addEventListener("click", async () => {
  if (!audio.paused) {
    audio.pause();
    setPlaying(false);
    return;
  }

  status.textContent = "TUNING...";
  try {
    await audio.play();
    setPlaying(true);
  } catch (error) {
    console.error(error);
    setPlaying(false);
    status.textContent = "NO SIGNAL";
  }
});

volume.addEventListener("input", () => {
  const value = Number(volume.value);
  audio.volume = value / 100;
  knob.style.transform = `rotate(${-135 + value * 2.7}deg)`;
});

audio.addEventListener("pause", () => setPlaying(false));
audio.addEventListener("error", () => {
  setPlaying(false);
  status.textContent = "NO SIGNAL";
});
