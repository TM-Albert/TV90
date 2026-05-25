/* ===== TV90 App ===== */

const state = {
  powered: false,
  playing: false,
  paused: false,
  cassetteIn: false,
};

/* ===== DOM ===== */
const screenWrap    = document.getElementById('screenWrap');
const screenInner   = document.getElementById('screenInner');
const idleScreen    = document.getElementById('idleScreen');
const ytPlayerDiv   = document.getElementById('ytPlayerDiv');
const pausedOverlay = document.getElementById('pausedOverlay');
const staticCanvas  = document.getElementById('staticCanvas');
const powerBtn      = document.getElementById('powerBtn');
const ledPower      = document.getElementById('ledPower');
const ledRecord     = document.getElementById('ledRecord');
const urlInput      = document.getElementById('urlInput');
const playBtn       = document.getElementById('playBtn');
const cassette      = document.getElementById('cassette');
const labelTitle    = document.getElementById('labelTitle');
const reel1         = document.getElementById('reel1');
const reel2         = document.getElementById('reel2');
const vcrStatus     = document.getElementById('vcrStatus');
const vcrTime       = document.getElementById('vcrTime');
const vcrLedPlay    = document.getElementById('vcrLedPlay');
const historyList   = document.getElementById('historyList');
const cornerClock   = document.getElementById('cornerClock');
const btnStop       = document.getElementById('btnStop');
const btnRew        = document.getElementById('btnRew');
const btnFF         = document.getElementById('btnFF');
const btnEject      = document.getElementById('btnEject');
const btnPlay2      = document.getElementById('btnPlay2');

/* ===== CLOCK ===== */
function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  cornerClock.textContent = `${h}:${m}:${s}`;
}
setInterval(updateClock, 1000);
updateClock();

/* ===== VCR TIME (synced from YT player) ===== */
let vcrTimeInterval = null;

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function startVcrTimeTracker() {
  stopVcrTimeTracker();
  vcrTimeInterval = setInterval(() => {
    if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
      try { vcrTime.textContent = formatTime(ytPlayer.getCurrentTime()); } catch {}
    }
  }, 1000);
}

function stopVcrTimeTracker() {
  clearInterval(vcrTimeInterval);
  vcrTimeInterval = null;
}

/* ===== YOUTUBE IFRAME API ===== */
let ytPlayer = null;
let ytReady = false;
let ytPendingVideoId = null;
let currentVolume = 80;

// Called by YouTube script automatically
window.onYouTubeIframeAPIReady = function () {
  ytReady = true;
  if (ytPendingVideoId) {
    _initPlayer(ytPendingVideoId);
    ytPendingVideoId = null;
  }
};

function _initPlayer(videoId) {
  if (ytPlayer) {
    ytPlayer.loadVideoById(videoId);
    ytPlayer.setVolume(currentVolume);
    _onVideoStarted();
    return;
  }
  ytPlayer = new YT.Player('ytPlayerDiv', {
    videoId,
    width: '100%',
    height: '100%',
    playerVars: { autoplay: 1, rel: 0, modestbranding: 1 },
    events: {
      onReady(e) {
        e.target.setVolume(currentVolume);
        _onVideoStarted();
      },
    },
  });
}

function _onVideoStarted() {
  state.playing = true;
  state.paused = false;
  idleScreen.style.display = 'none';
  pausedOverlay.classList.remove('visible');
  vcrStatus.textContent = 'PLAY';
  vcrLedPlay.classList.add('on');
  ledRecord.classList.add('on');
  reel1.classList.add('spinning');
  reel2.classList.add('spinning');
  startVcrTimeTracker();
}

/* ===== VOLUME ===== */
function setVolume(vol) {
  currentVolume = Math.max(0, Math.min(100, vol));
  if (ytPlayer && typeof ytPlayer.setVolume === 'function') {
    ytPlayer.setVolume(currentVolume);
  }
}

document.getElementById('tvVolUp').addEventListener('click',      () => setVolume(currentVolume + 10));
document.getElementById('tvVolDown').addEventListener('click',    () => setVolume(currentVolume - 10));
document.getElementById('remoteVolUp').addEventListener('click',  () => setVolume(currentVolume + 10));
document.getElementById('remoteVolDown').addEventListener('click',() => setVolume(currentVolume - 10));

/* ===== EXTRACT VIDEO ID ===== */
function extractVideoId(url) {
  try {
    const u = new URL(url.trim());
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('?')[0];
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v') || u.pathname.split('/').pop();
  } catch {}
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

/* ===== LOAD VIDEO ===== */
async function loadVideo(url) {
  const videoId = extractVideoId(url);
  if (!videoId) { flashInput(); return; }

  insertCassette(url.slice(0, 22) + '…', videoId);
  vcrStatus.textContent = 'LOADING';

  try {
    await fetch('/api/watch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, videoId }),
    });
    loadHistory();
  } catch {}

  document.getElementById('chNum').textContent =
    String(Math.floor(Math.random() * 58 + 2)).padStart(2, '0');

  const doPlay = () => {
    if (ytReady) {
      _initPlayer(videoId);
    } else {
      ytPendingVideoId = videoId;
    }
  };

  if (!state.powered) {
    powerOn(() => setTimeout(doPlay, 300));
  } else {
    setTimeout(doPlay, 300);
  }
}

/* ===== POWER ===== */
function powerOn(cb) {
  if (state.powered) { if (cb) cb(); return; }
  state.powered = true;
  powerBtn.classList.add('on');
  ledPower.classList.add('on');
  screenWrap.classList.remove('powering-off');
  screenWrap.classList.add('powering-on');
  setTimeout(() => {
    screenWrap.classList.remove('powering-on');
    if (cb) cb();
  }, 1400);
}

function powerOff() {
  if (!state.powered) return;
  state.powered = false;
  powerBtn.classList.remove('on');
  ledPower.classList.remove('on');
  ledRecord.classList.remove('on');
  vcrLedPlay.classList.remove('on');
  screenWrap.classList.remove('powering-on');
  screenWrap.classList.add('powering-off');
  setTimeout(() => {
    screenWrap.classList.remove('powering-off');
    idleScreen.style.display = 'flex';
    if (ytPlayer) { try { ytPlayer.stopVideo(); } catch {} }
    pausedOverlay.classList.remove('visible');
    stopVcrTimeTracker();
    vcrTime.textContent = '00:00';
    vcrStatus.textContent = 'STOP';
    state.playing = false;
    state.paused = false;
    reel1.classList.remove('spinning');
    reel2.classList.remove('spinning');
  }, 500);
}

powerBtn.addEventListener('click', () => {
  if (state.powered) powerOff(); else powerOn();
});

/* ===== STOP (toggle pause / resume) ===== */
btnStop.addEventListener('click', () => {
  if (!state.powered || !ytPlayer || !state.playing) return;

  if (!state.paused) {
    ytPlayer.pauseVideo();
    state.paused = true;
    vcrStatus.textContent = 'PAUSE';
    vcrLedPlay.classList.remove('on');
    reel1.classList.remove('spinning');
    reel2.classList.remove('spinning');
    pausedOverlay.classList.add('visible');
    stopVcrTimeTracker();
  } else {
    ytPlayer.playVideo();
    state.paused = false;
    vcrStatus.textContent = 'PLAY';
    vcrLedPlay.classList.add('on');
    reel1.classList.add('spinning');
    reel2.classList.add('spinning');
    pausedOverlay.classList.remove('visible');
    startVcrTimeTracker();
  }
});

/* ===== EJECT ===== */
btnEject.addEventListener('click', () => {
  if (!state.cassetteIn) return;
  if (ytPlayer) { try { ytPlayer.stopVideo(); } catch {} }
  state.playing = false;
  state.paused = false;
  idleScreen.style.display = 'flex';
  pausedOverlay.classList.remove('visible');
  ledRecord.classList.remove('on');
  vcrLedPlay.classList.remove('on');
  reel1.classList.remove('spinning');
  reel2.classList.remove('spinning');
  stopVcrTimeTracker();
  vcrTime.textContent = '00:00';
  vcrStatus.textContent = 'EJECT';
  ejectCassette();
  setTimeout(() => { vcrStatus.textContent = 'STOP'; }, 1500);
});

/* ===== PLAY BUTTON ===== */
btnPlay2.addEventListener('click', () => {
  const url = urlInput.value.trim();
  if (url) loadVideo(url);
});
playBtn.addEventListener('click', () => {
  const url = urlInput.value.trim();
  if (!url) { flashInput(); return; }
  loadVideo(url);
});
urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') playBtn.click(); });

/* ===== HOLD FF / REW ===== */
let seekInterval = null;

function startSeek(deltaSeconds) {
  if (!ytPlayer || !state.playing) return;
  triggerScreenGlitch();
  vcrStatus.textContent = deltaSeconds > 0 ? 'F.FWD' : 'REW';
  reel1.style.animationDuration = deltaSeconds > 0 ? '0.1s' : '0.15s';
  reel2.style.animationDuration = deltaSeconds > 0 ? '0.1s' : '0.15s';

  seekInterval = setInterval(() => {
    try {
      const cur = ytPlayer.getCurrentTime();
      ytPlayer.seekTo(Math.max(0, cur + deltaSeconds), true);
    } catch {}
  }, 250);
}

function stopSeek() {
  if (!seekInterval) return;
  clearInterval(seekInterval);
  seekInterval = null;
  reel1.style.animationDuration = '';
  reel2.style.animationDuration = '';
  if (state.playing && !state.paused) vcrStatus.textContent = 'PLAY';
  else if (state.paused) vcrStatus.textContent = 'PAUSE';
}

btnRew.addEventListener('mousedown', () => startSeek(-5));
btnFF.addEventListener('mousedown',  () => startSeek(5));
btnRew.addEventListener('touchstart', (e) => { e.preventDefault(); startSeek(-5); });
btnFF.addEventListener('touchstart',  (e) => { e.preventDefault(); startSeek(5); });
['mouseup', 'mouseleave'].forEach(ev => {
  btnRew.addEventListener(ev, stopSeek);
  btnFF.addEventListener(ev, stopSeek);
});
['touchend', 'touchcancel'].forEach(ev => {
  btnRew.addEventListener(ev, stopSeek);
  btnFF.addEventListener(ev, stopSeek);
});

/* ===== CHANNEL DIAL ===== */
document.getElementById('dialChannel').addEventListener('click', () => {
  const n = Math.floor(Math.random() * 58 + 2);
  const ns = String(n).padStart(2, '0');
  document.getElementById('chNum').textContent = ns;
  document.querySelector('.channel-num').textContent = `CH ${ns}`;
  if (!state.playing) triggerScreenGlitch();
});

/* ===== CASSETTE ===== */
function insertCassette(title, videoId) {
  state.cassetteIn = true;
  labelTitle.textContent = title || 'YOUTUBE';
  cassette.classList.remove('inserting');
  void cassette.offsetWidth;
  cassette.classList.add('inserting');
}

function ejectCassette() {
  state.cassetteIn = false;
  cassette.classList.remove('inserting');
}

/* ===== SCREEN GLITCH ===== */
function triggerScreenGlitch() {
  screenInner.classList.add('glitching');
  setTimeout(() => screenInner.classList.remove('glitching'), 300);
}

/* ===== RANDOM STATIC BURST ===== */
const staticCtx = staticCanvas.getContext('2d');
staticCanvas.width  = 320;
staticCanvas.height = 240;

let staticAnimId   = null;
let staticActive   = false;
let interferenceOn = true;

const interferenceBtn = document.getElementById('interferenceBtn');
interferenceBtn.addEventListener('click', () => {
  interferenceOn = !interferenceOn;
  interferenceBtn.textContent = `⚡ INTERFERENCE: ${interferenceOn ? 'ON' : 'OFF'}`;
  interferenceBtn.classList.toggle('off', !interferenceOn);
});

function drawStaticFrame() {
  if (!staticActive) return;
  const imgData = staticCtx.createImageData(320, 240);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.random() > 0.5 ? 255 : 0;
    d[i] = v; d[i + 1] = v; d[i + 2] = v; d[i + 3] = 255;
  }
  // occasional horizontal bright streak
  if (Math.random() < 0.15) {
    const row = Math.floor(Math.random() * 240);
    for (let x = 0; x < 320; x++) {
      const idx = (row * 320 + x) * 4;
      d[idx] = 255; d[idx + 1] = 255; d[idx + 2] = 255; d[idx + 3] = 255;
    }
  }
  staticCtx.putImageData(imgData, 0, 0);
  staticAnimId = requestAnimationFrame(drawStaticFrame);
}

function showStaticBurst() {
  if (staticActive) return;
  staticActive = true;
  staticCanvas.style.display = 'block';
  drawStaticFrame();
  const duration = 600 + Math.random() * 1800; // 0.6–2.4 s
  setTimeout(() => {
    staticActive = false;
    staticCanvas.style.display = 'none';
    cancelAnimationFrame(staticAnimId);
    staticAnimId = null;
  }, duration);
}

function scheduleStaticBurst() {
  const delay = 10000 + Math.random() * 20000; // 10–30 s
  setTimeout(() => {
    if (interferenceOn && state.powered && state.playing && !state.paused) {
      showStaticBurst();
    }
    scheduleStaticBurst();
  }, delay);
}
scheduleStaticBurst();

/* ===== AMBIENT IDLE GLITCH ===== */
setInterval(() => {
  if (state.powered && !state.playing && Math.random() < 0.08) triggerScreenGlitch();
}, 3000);

/* ===== FLASH INPUT ===== */
function flashInput() {
  urlInput.style.borderColor  = 'rgba(255,50,50,0.6)';
  urlInput.style.boxShadow    = '0 0 12px rgba(255,50,50,0.3)';
  setTimeout(() => { urlInput.style.borderColor = ''; urlInput.style.boxShadow = ''; }, 800);
}

/* ===== HISTORY ===== */
async function loadHistory() {
  try {
    const rows = await (await fetch('/api/history')).json();
    historyList.innerHTML = '';
    rows.forEach(row => {
      const el = document.createElement('div');
      el.className = 'history-item';
      el.textContent = row.url.replace(/https?:\/\/(www\.)?/, '').slice(0, 30);
      el.title = row.url;
      el.addEventListener('click', () => { urlInput.value = row.url; loadVideo(row.url); });
      historyList.appendChild(el);
    });
  } catch {}
}

document.getElementById('clearBtn').addEventListener('click', async () => {
  await fetch('/api/history', { method: 'DELETE' });
  historyList.innerHTML = '';
});

loadHistory();

/* ===== REMOTE POWER ===== */
document.getElementById('remotePower').addEventListener('click', () => {
  if (state.powered) powerOff(); else powerOn();
});
