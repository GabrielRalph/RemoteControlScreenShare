const { app, BrowserWindow, screen } = require('electron');

app.whenReady().then(() => {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.bounds;

    const win = new BrowserWindow({
        width: width,
        height: height,
        x: 0,
        y: 0,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        movable: false,
        focusable: false,
        webPreferences: {
            nodeIntegration: true
        }
    });

    win.setIgnoreMouseEvents(true);
    win.setAlwaysOnTop(true, 'screen-saver');

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {
                margin: 0;
                padding: 0;
                overflow: hidden;
            }
            .border {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                border: 5px solid rgba(143, 83, 201, 1);
                border-radius: 20px 20px 0 0;
                box-sizing: border-box;
                pointer-events: none;
            }
        </style>
    </head>
    <body>
        <div class="border"></div>
    </body>
    </html>
    `;

    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
