const {
    app,
    BrowserWindow,
    ipcMain
} = require('electron')

//Loading all the dependency modules
const path = require('path');
const fs = require('fs');
const wallpaper = require('wallpaper');
const request = require('request');
const Store = require('electron-store');


// Using electron-store module to handle JSON file storage
const store = new Store();

var tags, walls;

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
            store.set('walls','');
            store.set('downloads','');

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

//----------------------------------
//FUNCTIONS FOR MANAGING USER'S TAGS
//----------------------------------
ipcMain.on('refreshTags', (event, args) => {
    event.sender.send('refreshedTags',tags);
});

ipcMain.on('addTag', (event, args) => {
    store.set('tags', store.get('tags')+args+',');
    event.sender.send('addedTag',args);
    tags = store.get('tags').split(',');
    tags.pop();
});

ipcMain.on('deleteTag', (event, args) => {
    let tags = store.get('tags');
    updatedTags = tags.replace(args+',','');
    store.set('tags', updatedTags);
    event.sender.send('deletedTag',args); 
    tags = store.get('tags').split(',');
    tags.pop();
});

function refreshTags(){
    tags = store.get('tags').split(',');
    tags.pop();
    win.webContents.send('populateTags',tags);
    requestUnsplash();

}

function loadUpcoming(){
    let upcoming = [];
    let files = fs.readdirSync(app.getPath('userData')+'/walls');

    files.forEach(file => {
        upcoming.push(file);
    });
    win.webContents.send('populateUpcoming',upcoming,app.getPath('userData'));
}

//Function to get random integers for wallpapers addition and deletion

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

//Function to make requests to Unsplash API

function requestUnsplash(){

    let search = tags[getRandomInt(0,tags.length-1)];
    let page = getRandomInt(1,100);

    request('https://api.unsplash.com/search/photos?client_id=e3a425aef26263517dc26faa5bb4dfba745034e2178f31a97170d5ee17be8f61&page='+page+'&query='+search, function (error, response, body) {
        console.log('error:', error); // Print the error if one occurred
        console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
        if(body){
 
            let response =  JSON.parse(body);
            let photo = getRandomInt(1,10);
            let h = response.results[photo].height;
            let w = response.results[photo].width;
            
            while(h > w){
                photo = getRandomInt(1,10);
                h = response.results[photo].height;
                w = response.results[photo].width;
            }
            
            store.set('downloads', store.get('downloads')+response.results[photo].links.download+',');
            console.log(store.get('downloads'));
            

        }
    }); 
}

//------------------------------------------
//FUNCTIONS FOR MANAGING UPCOMING WALLPAPERS
//------------------------------------------

function addWalls(qty){

}