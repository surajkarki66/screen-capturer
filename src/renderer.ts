import { writeFile } from "fs";
import electron from "electron";

// To access Menu, dialog in renderer we need remote
import { Menu, dialog } from "@electron/remote";

const { desktopCapturer } = electron;

import "./index.css";

// Global state
let mediaRecorder: {
  start: () => void;
  stop: () => void;
  ondataavailable: (e: BlobEvent) => void;
  onstop: (e: BlobEvent) => Promise<void>;
};
const recordedChunks: Blob[] = [];

// Buttons
const videoElement = document.querySelector("video");

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");

startBtn.onclick = () => {
  if (!mediaRecorder) {
    dialog.showErrorBox("Error", "Please select video source first");
    return false;
  }
  mediaRecorder.start();
  startBtn.classList.add("is-danger");
  stopBtn.style.display = "inline";
  startBtn.innerText = "Recording";
};

stopBtn.onclick = () => {
  mediaRecorder.stop();
  startBtn.classList.remove("is-danger");
  stopBtn.style.display = "none";
  startBtn.innerText = "Start";
};

const videoSelectBtn = document.getElementById("videoSelectBtn");
videoSelectBtn.onclick = getVideoSources;

// Get the available video sources
async function getVideoSources() {
  const inputSources = await desktopCapturer.getSources({
    types: ["window", "screen"],
  });

  const videoOptionsMenu = Menu.buildFromTemplate(
    inputSources.map((source) => {
      return {
        label: source.name,
        click: () => selectSource(source),
      };
    })
  );

  videoOptionsMenu.popup();
}

// Change the videoSource window to record
async function selectSource(source: Electron.DesktopCapturerSource) {
  videoSelectBtn.innerText = source.name;

  const constraints = {
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: "desktop",
        chromeMediaSourceId: source.id,
      },
    },
  };

  // Create a Stream
  // TODO: Solve below TypeError
  const stream = await navigator.mediaDevices.getUserMedia(constraints);

  // Preview the source in a video element
  videoElement.srcObject = stream;
  videoElement.play();

  // Create the Media Recorder
  const options = { mimeType: "video/webm; codecs=vp9" };
  mediaRecorder = new MediaRecorder(stream, options);

  // Register Event Handlers
  mediaRecorder.ondataavailable = handleDataAvailable;
  mediaRecorder.onstop = handleStop;

  // Updates the UI
}

// Captures all recorded chunks
function handleDataAvailable(e: BlobEvent) {
  recordedChunks.push(e.data);
}

// Saves the video file on stop
async function handleStop() {
  const blob = new Blob(recordedChunks, {
    type: "video/webm; codecs=vp9",
  });

  const buffer = Buffer.from(await blob.arrayBuffer());

  const { filePath } = await dialog.showSaveDialog({
    buttonLabel: "Save",
    defaultPath: `vid-${Date.now()}.webm`,
  });

  if (filePath) {
    writeFile(filePath, buffer, () => console.log("video saved successfully!"));
  }
}
