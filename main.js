const {
    app,
    BrowserWindow,
    ipcMain
} = require('electron')

//Loading all the Dependency modules

const path = require('path');
const fs = require('fs');
const wallpaper = require('wallpaper');
const request = require('request');
const Store = require('electron-store');

const store = new Store();
var tags, walls, downloads, cache, time, backgroundDownloads;
let win,intro;

//App Window
//----------
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

    win.setMenu(null);
    // and load the index.html of the app.
    win.loadFile('thewall.html');

    // Check for first time user
    if(store.has('tutorial') == false){
        //Storing Default Config to JSON file 
        createConfig();
    }else{

        fetchVariables();
    }

    // Waiting for window to load contents
    win.once('ready-to-show', () => {     

        //loading Upcoming and Tags into GUI
        loadTags();
        loadUpcoming();
        checkDownloads();
        win.show()
    })

    // Emitted when the window is closed.
    win.on('closed', () => {
        // Dereference the window object
        win = null
    })
}
//---------------------------------------App Window End


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

//Function to create Config file for first-time setup
function createConfig(){
    store.set('tutorial','0');
    store.set('time',{hour:12, min:0});
    store.set('cache',3);
    store.set('tags',{});
    store.set('collection',{});
    store.set('walls',{});
    store.set('downloads',{});
    addFolder(app.getPath('userData')+'/walls');
}

//Function to update objects
function fetchVariables(){
    tags = store.get('tags');
    walls = store.get('walls');
    downloads = store.get('downloads');
    cache = store.get('cache');
    time = store.get('time');
}

//function to list directory files
function listFiles(path){

    let files = fs.readdirSync(path);
    files.forEach(file => {
        upcoming.push(file);
    });
}

//Check for pending downloads
function checkDownloads(){
    
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
    console.log('Requesting unsplash');

    request('https://api.unsplash.com/search/photos?client_id=e3a425aef26263517dc26faa5bb4dfba745034e2178f31a97170d5ee17be8f61&page='+page+'&query='+search, function (error, response, body) {

        //console.log('error:', error);
        //console.log('statusCode:', response && response.statusCode);

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
            console.log(body);
            store.set('downloads', store.get('downloads')+response.results[photo].links.download+',');

        }
    }); 
}

//----------------------------------
//FUNCTIONS FOR MANAGING USER'S TAGS
//----------------------------------

//ADDING
ipcMain.on('addTag', (event, args) => {

    tags[args] = 0;
    store.set('tags',tags);

    addWalls(args);
    event.sender.send('addedTag',args);
});

//DELETING
ipcMain.on('deleteTag', (event, args) => {
    delete tags[args];
    store.set('tags',tags);

    deleteWalls(args);
    event.sender.send('deletedTag',args); 
});

//LOADING
function loadTags(){
    win.webContents.send('populateTags',tags);
}


//------------------------------------------
//FUNCTIONS FOR MANAGING UPCOMING WALLPAPERS
//------------------------------------------

//ADDING
function addWalls(tag_name){

    downloads[tag_name] = cache;
    store.set('downloads',downloads);
    addFolder(app.getPath('userData')+'/walls/'+tag_name+'/');
}

//DELETING
function deleteWalls(tag_name){

    delete downloads[tag_name];
    store.set('downloads',downloads);
    deleteFolder(app.getPath('userData')+'/walls/'+tag_name+'/');
}

//LOADING
function loadUpcoming(){
    win.webContents.send('populateUpcoming',walls,app.getPath('userData'));
}

//----------------------------------
//FUNCTIONS FOR MANAGING DIRECTORIES
//----------------------------------

//ADDING
function addFolder(path){
    console.log('path = ',path);
    fs.mkdir(path,function(err) {
        if (err) {
            return console.error(err);
        }
        console.log("Directory created");
    });
}

function callback(){
    ;
}

//DELETING
function deleteFolder(path){
    if( fs.existsSync(path) ) {
        fs.readdirSync(path).forEach(function(file,index){
            var curPath = path + "/" + file;
            if(fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
}
