'use strict';
const { app, BrowserWindow, Tray, Menu, screen, ipcMain, nativeImage } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { startServer } = require('./server');

const WIDTH = 140;
const MIN_H = 60;
const MAX_H = 240;
const POS_FILE = () => path.join(app.getPath('userData'), 'window-position.json');

let win = null;
let tray = null;
let trayTip = 'Quota Orb';

if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => { if (win) win.show(); });

// ── Window position persistence ──────────────────────────────────────────────
function loadPosition() {
  try {
    const p = JSON.parse(fs.readFileSync(POS_FILE(), 'utf8'));
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
    const visible = screen.getAllDisplays().some((d) => {
      const a = d.workArea;
      return p.x >= a.x - WIDTH + 20 && p.x <= a.x + a.width - 20 && p.y >= a.y && p.y <= a.y + a.height - 20;
    });
    return visible ? p : null;
  } catch { return null; }
}
let saveTimer = null;
function savePositionSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (!win || win.isDestroyed()) return;
    const [x, y] = win.getPosition();
    try { fs.writeFileSync(POS_FILE(), JSON.stringify({ x, y })); } catch {}
  }, 400);
}

// ── Autostart (login item) ───────────────────────────────────────────────────
function enableAutostart() {
  if (process.env.QUOTA_ORB_NO_AUTOSTART) return;
  if (process.platform === 'linux') {
    const dir = path.join(os.homedir(), '.config', 'autostart');
    const exec = app.isPackaged ? `"${process.execPath}"` : `"${process.execPath}" "${app.getAppPath()}"`;
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'quota-orb.desktop'),
        `[Desktop Entry]\nType=Application\nName=Quota Orb\nExec=${exec}\nX-GNOME-Autostart-enabled=true\n`);
    } catch {}
    return;
  }
  const settings = { openAtLogin: true };
  if (!app.isPackaged) { settings.path = process.execPath; settings.args = [app.getAppPath()]; }
  app.setLoginItemSettings(settings);
}

// ── Window / tray ────────────────────────────────────────────────────────────
function createWindow(port) {
  const pos = loadPosition();
  win = new BrowserWindow({
    width: WIDTH,
    height: 100,
    ...(pos || {}),
    useContentSize: true,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  if (process.platform === 'darwin') win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.on('moved', savePositionSoon);
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.once('ready-to-show', () => win.show());
  win.loadURL(`http://127.0.0.1:${port}/`);
}

function createTray() {
  const img = nativeImage.createFromPath(path.join(__dirname, '..', 'assets', 'tray.png'));
  tray = new Tray(img);
  tray.setToolTip(trayTip);
  const toggle = () => { if (!win) return; win.isVisible() ? win.hide() : win.show(); };
  const menu = Menu.buildFromTemplate([
    { label: 'Mostrar / ocultar', click: toggle },
    { label: 'Cerrar', click: () => app.quit() },
  ]);
  tray.on('click', toggle);
  if (process.platform === 'linux') tray.setContextMenu(menu); // Linux ignores right-click events
  else tray.on('right-click', () => tray.popUpContextMenu(menu));
}

function updateTooltip(data) {
  const f = (n, u) => (u?.status === 'ok' ? `${Math.round(u.remaining)}%` : (u?.hint || '—'));
  trayTip = `Codex: ${f('Codex', data.codex)} · Claude: ${f('Claude', data.claude)}`;
  if (tray) tray.setToolTip(trayTip);
}

ipcMain.on('widget:height', (e, h) => {
  if (!win || win.isDestroyed() || !Number.isFinite(h)) return;
  win.setContentSize(WIDTH, Math.round(Math.min(MAX_H, Math.max(MIN_H, h))));
});

async function captureAndQuit(file) {
  setTimeout(async () => {
    const img = await win.webContents.capturePage(); // only the window area
    fs.writeFileSync(file, img.toPNG());
    app.quit();
  }, 2500);
}

if (process.platform === 'linux') app.disableHardwareAcceleration();
app.setAppUserModelId('com.yeremyacuna.quotaorb');

app.whenReady().then(async () => {
  if (process.platform === 'darwin') app.dock?.hide();
  const { port } = await startServer({ onUpdate: updateTooltip });
  createWindow(port);
  try { createTray(); } catch (e) { console.error('Tray unavailable:', e.message); }
  enableAutostart();
  if (process.env.QUOTA_ORB_SCREENSHOT) captureAndQuit(process.env.QUOTA_ORB_SCREENSHOT);
});

// Keep running in the tray when the window is hidden.
app.on('window-all-closed', () => {});
