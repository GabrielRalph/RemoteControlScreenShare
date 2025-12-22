const { app, BrowserWindow, ipcMain, desktopCapturer } = require('electron');
const path = require('path');

let mainWindow;
let pickerWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/presenter.html'));
}

function createPickerWindow() {
  pickerWindow = new BrowserWindow({
    width: 800,
    height: 600,
    parent: mainWindow,
    modal: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  pickerWindow.loadFile(path.join(__dirname, '../renderer/picker.html'));
  
  pickerWindow.on('closed', () => {
    pickerWindow = null;
  });
}

// Get available screens/windows
ipcMain.handle('get-sources', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['window', 'screen'],
    thumbnailSize: { width: 300, height: 200 }
  });

  return sources.map(source => ({
    id: source.id,
    name: source.name,
    thumbnail: source.thumbnail.toDataURL()
  }));
});

// User selected a source
ipcMain.on('source-selected', (event, sourceId) => {
  mainWindow.webContents.send('start-capture', sourceId);
  if (pickerWindow) pickerWindow.close();
});

// Open picker
ipcMain.on('open-picker', () => {
  if (!pickerWindow) createPickerWindow();
});

app.whenReady().then(createMainWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});