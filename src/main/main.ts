import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { DatabaseService } from './database';

let mainWindow: BrowserWindow | null;
let dbService: DatabaseService;

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
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
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
