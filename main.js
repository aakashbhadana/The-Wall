const {
    app,
    BrowserWindow,
    ipcMain
} = require('electron')

const path = require('path');
const fs = require('fs');
const wallpaper = require('wallpaper');

// Using electron-store module to handle JSON file storage
const Store = require('electron-store');
const store = new Store();


let win,intro

function createWindow() {
    // Create the App window.
    win = new BrowserWindow({
        show:false,
        frame: false,
        resizable: false,
        width: 920,
        height: 650,
        icon: path.join(__dirname, 'assets/icons/wall.png'),
        webPreferences: {
            nodeIntegration: true
        }
    })
    win.setMenu(null)
    // and load the index.html of the app.
    win.loadFile('thewall.html')

    // Waiting for window to load contents
    win.once('ready-to-show', () => {
        // Check for first time user
        if(store.has('tutorial') == false){

            //Storing Default Config to JSON file 
            store.set('tutorial','0');
            store.set('tags','');
            store.set('collection','');
            store.set('time','24,0');

            // Creating DIrectory to store downloaded wallpapers
            fs.mkdir(app.getPath('userData')+'/walls',function(err) {
                if (err) {
                    return console.error(err);
                }
                console.log("Directory walls created");
            });


        }else{

            //loading Upcoming Wallpapers into GUI
            loadUpcoming();
            //Loading Tags into GUI
            refreshTags();
        }    
        win.show()
    })

    // Emitted when the window is closed.
    win.on('closed', () => {
        // Dereference the window object
        win = null
    })
}

// This method will be called when Electron has finished initialization

app.on('ready',createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
        createWindow()
    }
})

ipcMain.on('addTag', (event, args) => {
    store.set('tags', store.get('tags')+args+',');
    event.sender.send('addedTag',args); 
});

ipcMain.on('deleteTag', (event, args) => {
    let tags = store.get('tags');
    newtags = tags.replace(args+',','');
    store.set('tags', newtags);
    event.sender.send('deletedTag',args); 
});

function refreshTags(){
    win.webContents.send('populateTags',store.get('tags'));
}

function loadUpcoming(){
    let upcoming = [];
    let files = fs.readdirSync(app.getPath('userData')+'/walls');

    files.forEach(file => {
        upcoming.push(file);
    });
    win.webContents.send('populateUpcoming',upcoming,app.getPath('userData'));
}
