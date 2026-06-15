import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { DatabaseService } from './database';

const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_IS_DEV === '1';
const DEV_SERVER_URL = 'http://localhost:3000';

let mainWindow: BrowserWindow | null;
let dbService: DatabaseService;

async function loadDevURLWithRetry(window: BrowserWindow, retries = 20, interval = 1500) {
  for (let i = 0; i < retries; i++) {
    try {
      await window.loadURL(DEV_SERVER_URL);
      console.log(`[DEV] 成功加载开发服务器: ${DEV_SERVER_URL}`);
      return true;
    } catch (err) {
      const remaining = retries - i - 1;
      console.log(`[DEV] 等待开发服务器... (${remaining} 次剩余, ${interval}ms)`);
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
  console.error('[DEV] 开发服务器连接超时，请确认 npm run dev:renderer 已启动');
  window.webContents.executeJavaScript(`
    document.body.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#1a1a2e;color:#fff;font-family:sans-serif;">
      <h1 style="color:#e94560;">🎻 弦轴配合系统</h1>
      <h2>正在等待开发服务器启动...</h2>
      <p style="color:#a0a0a0;margin:20px 0;">请确保 webpack-dev-server 正在运行于 ${DEV_SERVER_URL}</p>
      <button onclick="location.reload()" style="padding:12px 24px;background:#e94560;color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer;">刷新重试</button>
    </div>';
  `);
  return false;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js'),
    },
    title: '弦轴锥度配合系统 - 传统制琴工艺',
    backgroundColor: '#1a1a2e',
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (isDev) {
    console.log('[MODE] 开发模式 - 连接开发服务器');
    loadDevURLWithRetry(mainWindow);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    console.log('[MODE] 生产模式 - 加载本地构建产物');
    const indexPath = path.join(__dirname, 'index.html');
    console.log('[PROD] 加载文件:', indexPath);
    mainWindow.loadFile(indexPath).catch(err => {
      console.error('[PROD] 加载失败，请先执行 npm run build:', err);
      mainWindow?.webContents.executeJavaScript(`
        document.body.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#1a1a2e;color:#fff;font-family:sans-serif;">
          <h1 style="color:#e94560;">⚠️ 未找到构建产物</h1>
          <p style="color:#fdcb6e;margin:20px 0;">请先执行: <code style="background:#000;padding:4px 8px;border-radius:4px;">npm run build</code></p>
          <p style="color:#a0a0a0;">或开发模式执行: <code style="background:#000;padding:4px 8px;border-radius:4px;">npm run dev</code></p>
        </div>';
      `);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  dbService = new DatabaseService();
  dbService.init();
  setupIPC();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function setupIPC() {
  ipcMain.handle('peg:create', (_, data) => dbService.createPegRecord(data));
  ipcMain.handle('peg:find', (_, query) => dbService.findPegRecords(query));
  ipcMain.handle('peg:findOne', (_, id) => dbService.findOnePegRecord(id));
  ipcMain.handle('peg:update', (_, id, data) => dbService.updatePegRecord(id, data));
  ipcMain.handle('peg:remove', (_, id) => dbService.removePegRecord(id));

  ipcMain.handle('archive:create', (_, data) => dbService.createArchive(data));
  ipcMain.handle('archive:find', (_, query) => dbService.findArchives(query));
  ipcMain.handle('archive:findOne', (_, id) => dbService.findOneArchive(id));
  ipcMain.handle('archive:update', (_, id, data) => dbService.updateArchive(id, data));
  ipcMain.handle('archive:remove', (_, id) => dbService.removeArchive(id));

  ipcMain.handle('library:create', (_, data) => dbService.createLibraryItem(data));
  ipcMain.handle('library:find', (_, query) => dbService.findLibraryItems(query));
  ipcMain.handle('library:findOne', (_, id) => dbService.findOneLibraryItem(id));
  ipcMain.handle('library:update', (_, id, data) => dbService.updateLibraryItem(id, data));
  ipcMain.handle('library:remove', (_, id) => dbService.removeLibraryItem(id));
}
