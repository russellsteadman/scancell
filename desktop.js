const { app, BrowserWindow } = require('electron');
const path = require('path');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname, './desktop/icons/icon-512.png'),
    title: 'Scan Cell | Yeast Counter for FEH Nano',
    autoHideMenuBar: true,
    backgroundColor: '#F2F2F2',
    webPreferences: {
      nodeIntegration: false,
      webgl: false,
      webaudio: false
    }
  });

  // and load the index.html of the app.
  win.loadFile('desktop/index.html');

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (win === null) createWindow();
});