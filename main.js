const {
    app,
    BrowserWindow,
    ipcMain,
    Tray,
    Menu
} = require('electron')

//Loading all the Dependency modules

const path = require('path');
const fs = require('fs');
const https = require('https');
const wallpaper = require('wallpaper');
const request = require('request-promise');
const Store = require('electron-store');
const internetAvailable = require("internet-available");


const store = new Store();
var tags, walls, downloads, cache, time, backgroundDownloads, ongoing = 0, backgroundDownloading, wallTimer;
let win,intro, tray = null;


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
    }
    fetchVariables();
    // Waiting for window to load contents
    win.once('ready-to-show', () => {     
        //loading Upcoming and Tags into GUI
        loadTags();
        win.webContents.send('switchedWall',store.get('current'));
        win.webContents.send('toggledWall',store.get('play_pause'));
        win.webContents.send('currentTimer',time);
        loadUpcoming();
        win.show()

        if(store.get('play_pause') == 0){
            changeWalls();   
        }
    })

    // Emitted when the window is closed.
    win.on('hide', () => {
        // Dereference the window object
        checkDownloads();
    })
}
//---------------------------------------App Window End


// This method will be called when Electron has finished initialization
app.on('ready', () => {

    createWindow();

    tray = new Tray('assets/icons/wall.png')
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Quit', click: ()=>{win.close()}},
        { label: 'v1.0'}
    ])
    tray.setToolTip('The Wall App');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
        win.isVisible() ? win.hide() : win.show();loadUpcoming();
    })
})

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
    store.set('current','sample.png');
    store.set('play_pause',0);
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

//Function to Change Desktop wallpapers{
function changeWalls(){

    let millis = 1000* ((3600 * time['hour']) + (60 * time['min'])) ;
    console.log('Changing Walls every ',millis);
    wallTimer = setInterval(function(){

        let nextTag = getRandom(walls);
        let path = app.getPath('userData')+"\\walls\\"+nextTag+'\\'+walls[nextTag][getRandomInt(0,walls[nextTag].length - 1)];
        store.set('current',path);

        console.log('Next Wall ', path);
        (async () => {
            await wallpaper.set(path);
        })();

        event.sender.send('switchedWall',path);

    },millis);
}

ipcMain.on('toggleWall', (event, args) => {

    if(store.get('play_pause') == 0){
        clearInterval(wallTimer);
        store.set('play_pause',1);
        console.log('Paused');
    }else{
        changeWalls();
        store.set('play_pause',0);
        console.log('Played');
    }

    event.sender.send('toggledWall',store.get('play_pause'));

});

ipcMain.on('nextWall', (event, args) => {
    let nextTag = getRandom(walls);
    let path = app.getPath('userData')+"\\walls\\"+nextTag+'\\'+walls[nextTag][getRandomInt(0,walls[nextTag].length - 1)];
    store.set('current',path);
    console.log('Next Wall ', path);
    (async () => {
        await wallpaper.set(path);
    })();

    event.sender.send('switchedWall',path);

});

ipcMain.on('setTimer', (event, hr, min) => {

    time['hour'] = parseInt(hr);
    time['min'] = parseInt(min);
    
    if (!(isNaN(hr) || isNaN(min))){
        store.set('time', time);    
        event.sender.send('currentTimer',time);   
    }
});

//Check for pending downloads
function checkDownloads(){

    backgroundDownloading = setInterval(function(){

        console.log('Pending Downloads  => ',Object.keys(downloads).length);
        if(Object.keys(downloads).length > 0 && ongoing == 0 && win.isVisible() == false){

            ongoing = 1;
            let downloadTag = getRandom(downloads);
            console.log('Starting background downloading... => ',downloadTag);
            Unsplash(downloadTag);

        }else if(Object.keys(downloads).length == 0){
            console.log('++ No Downloads Remaining ++')
            clearInterval(backgroundDownloading);
        }
    },7000);
}

//Function to check if Internat is available

function Unsplash(downloadTag){
    internetAvailable({
        timeout: 5000,
        retries: 10,
        domainName: "unsplash.com",
    }).then(() => {
        requestUnsplash(downloadTag);
    }).catch(() => {
        console.log('## No Internet ##');
    });
}

//Function to get random integers for wallpapers addition and deletion

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

//Function to get random property from an Object
function getRandom(obj){
    let keys = Object.keys(obj);
    if(keys.length > 0){
        return keys[ keys.length * Math.random() << 0];   
    }
}

//Function to make requests to Unsplash API

function requestUnsplash(search){
    console.log("Requesting Unsplash //");
    // let page = getRandomInt(1,100);
    let page = getRandomInt(0,10);
    let options = {
        "method":"GET", 
        uri: 'https://api.unsplash.com/search/photos?client_id=e3a425aef26263517dc26faa5bb4dfba745034e2178f31a97170d5ee17be8f61&page='+page+'&query='+search,
        json: true,
        headers: {
            'User-Agent': 'Request-Promise'
        }
    };
    request(options).then(function (response) {

        let photo = getRandomInt(0,9);
        let h = response.results[photo].height;
        let w = response.results[photo].width;

        while(h > w){
            photo = getRandomInt(0,9);
            h = response.results[photo].height;
            w = response.results[photo].width;
        }

        downloadWall(response.results[photo].links.download,app.getPath('userData')+'/walls/'+search+'/'+response.results[photo].id+'.jpg',search, response.results[photo].id);

    }).catch(function (err) {
        console.log('## Unsplash request Error occured =>', err);
    });
}

//Function to download Wallpapers from link

function downloadWall(url, localPath, search, name) {


    console.log('Downloading Wallpaper From => ',url,' To => ',localPath);

    request.get(url).on('error', function(err) {
        console.log('Error in downloading Wall => ',err)

    }).on('response', function(response) {

        if(downloads[search] == 1){

            delete downloads[search];
            store.set('downloads',downloads);

            tags[search] = tags[search] + 1;
            store.set('tags',tags);

            if(walls[search] == undefined){
                walls[search] = [];
                walls[search].push(name +'.jpg');
            }else{
                walls[search].push(name +'.jpg');   
            }
            store.set('walls',walls);

            console.log('Updated pending download = ',downloads);

        }else{

            downloads[search] = downloads[search]-1; 
            store.set('downloads',downloads);

            tags[search] = tags[search] + 1;
            store.set('tags',tags);

            if(walls[search] == undefined){
                walls[search] = [];
                walls[search].push(name +'.jpg');
            }else{
                walls[search].push(name +'.jpg');   
            }
            store.set('walls',walls);

            console.log('Updated pending downloads = ',downloads);
        }
        ongoing = 0;
        console.log('------------- Downloading Finished -------------');

    }).pipe(fs.createWriteStream(localPath))
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

    delete walls[tag_name];
    store.set('walls',walls);

    deleteFolder(app.getPath('userData')+'/walls/'+tag_name+'/');
    loadUpcoming();

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
    console.log('Directory created = ',path);
    fs.mkdir(path,function(err) {
        if (err) {
            return console.error(err);
        }
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
