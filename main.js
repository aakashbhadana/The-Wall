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
const shell = require('electron').shell;

const store = new Store();
var tags, walls, downloads, cache, time, backgroundDownloads, ongoing = false, checking = false, backgroundDownloading, wallTimer, deleteQueue = [];
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
        win.webContents.send('toggledWall',store.get('play_pause'));
        win.webContents.send('currentTimer',time);
        loadCurrentWall();
        loadUpcoming();
        win.show();
        //win.toggleDevTools();

        checkDownloads();

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
        { label: 'Next', click: ()=>{win.webContents.send('callMain','nextWall')}},
        { label: 'Play/Pause', click: ()=>{win.webContents.send('callMain','toggleWall')}}
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
    store.set('play_pause',0);
    store.set('delete',[])
    addFolder(app.getPath('userData')+'/walls');

}

//Function to update objects
function fetchVariables(){
    tags = store.get('tags');
    walls = store.get('walls');
    downloads = store.get('downloads');
    cache = store.get('cache');
    time = store.get('time');
    deleteQueue = store.get('delete');
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
        let path = app.getPath('userData')+"\\walls\\"+walls[nextTag][0]+'\\'+nextTag;

        console.log('Next Wall ', path);
        (async () => {
            await wallpaper.set(path);
        })();

        event.sender.send('switchedWall',path,walls[nextTag][1],walls[nextTag][2],walls[nextTag][3]);

    },millis);
}

function loadCurrentWall(){
    (async () => {
        let url = await wallpaper.get();
        console.log('URL :',url);
        let wall = url.substring(url.lastIndexOf('\\')+1);
        console.log('File :', wall);

        if( walls[wall] != undefined ){
            win.webContents.send('switchedWall',url,'@'+walls[wall][1],walls[wall][2],walls[wall][3]);
        }else{
            win.webContents.send('switchedWall',url,'','Wallpaper','set by user');
        }
    })();
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
    let path = app.getPath('userData')+"\\walls\\"+walls[nextTag][0]+'\\'+nextTag;
    console.log('Next Wall ', path);
    (async () => {
        await wallpaper.set(path);
    })();

    event.sender.send('switchedWall',path,walls[nextTag][1],walls[nextTag][2],walls[nextTag][3]);

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

    if( checking == false ){
        checking = true;
        backgroundDownloading = setInterval(function(){

            console.log('Pending Downloads  => ',Object.keys(downloads).length);
            if(Object.keys(downloads).length > 0 && ongoing == false){

                ongoing = true;
                let downloadTag = getRandom(downloads);
                console.log('Starting background downloading... => ',downloadTag);
                Unsplash(downloadTag);

            }else if(Object.keys(downloads).length == 0){
                console.log('++ No Downloads Remaining ++')
                checking = false;
                clearInterval(backgroundDownloading);
            }
        },7000);   
    }
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
    console.log("// Requesting Unsplash //");
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
        downloadWall(response.results[photo].links.download,app.getPath('userData')+'/walls/'+search+'/'+response.results[photo].id+'.jpg',search, response.results[photo].id,response.results[photo].user.username,response.results[photo].user.first_name,response.results[photo].user.last_name);

    }).catch(function (err) {
        console.log('## Unsplash request Error occured =>', err);
    });
}

//Function to download Wallpapers from link

function downloadWall(url, localPath, search, name, username, fname, lname) {


    console.log('Downloading Wallpaper From => ',url,' To => ',localPath);

    request.get(url).on('error', function(err) {
        console.log('Error in downloading Wall => ',err)

    }).on('end', function(response) {

        if(downloads[search] == 1){
            delete downloads[search];
        }else{
            downloads[search] = downloads[search]-1; 
        }
        store.set('downloads',downloads);

        tags[search] = tags[search] + 1;
        store.set('tags',tags);

        walls[name+'.jpg'] = [search,username,fname,lname];

        store.set('walls',walls);

        console.log('Updated pending download = ',downloads);
        loadUpcoming();
        ongoing = false;

        let delqueue = deleteQueue.length;

        while(delqueue > 0){

            let args = deleteQueue[0];
            delete tags[args];
            store.set('tags',tags);
            deleteWalls(args);

            deleteQueue.splice(0,1);
            delqueue = deleteQueue.length;

            console.log('Tag Deleted => ',args);   
        }
        store.set('delete',deleteQueue);

        console.log('------------- Downloading Finished -------------');

    }).pipe(fs.createWriteStream(localPath))
}

//----------------------------------
//FUNCTIONS FOR MANAGING USER'S TAGS
//----------------------------------

//ADDING
ipcMain.on('addTag', (event, args) => {

    if(tags[args] == undefined){
        tags[args] = 0;
        store.set('tags',tags);
        addWalls(args);
        checkDownloads();
        event.sender.send('addedTag',args);   
    }else{
        event.sender.send('tagExists',args); 
    }
});

//DELETING
ipcMain.on('deleteTag', (event, args) => {

    clearInterval(backgroundDownloading);
    checking = false;

    if(ongoing == false){
        delete tags[args];
        store.set('tags',tags);

        deleteWalls(args);
        event.sender.send('deletedTag',args);
        console.log('Tag Deleted => ',args);
    }else{
        deleteQueue.push(args);
        store.set('delete',deleteQueue);
        event.sender.send('deletedTag',args);
        console.log('Added to delete queue => ',deleteQueue);
    }
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

    for (var file_name in walls) {
        if(walls[file_name][0] == tag_name){
            delete walls[file_name];
        }
    }
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

//----------------------
//UPCOMING WALLS OPTIONS
//----------------------

ipcMain.on('setWall', (event, name) => {
    let path = app.getPath('userData')+"\\walls\\"+walls[name][0]+'\\'+name;
    console.log('Set Wall ', path);
    (async () => {
        await wallpaper.set(path);
    })();

    event.sender.send('switchedWall',path,walls[name][1],walls[name][2],walls[name][3]);
});

ipcMain.on('deleteWall', (event, name) => {

    tags[walls[name][0]] = tags[walls[name][0]]-1;
    store.set('tags',tags);

    if( downloads[walls[name][0]] != undefined ){
        downloads[walls[name][0]] = downloads[walls[name][0]] + 1;   
    }else{
        downloads[walls[name][0]] = 1;
    }
    store.set('downloads',downloads);

    delete walls[name];
    store.set('walls',walls);
    loadUpcoming();
    checkDownloads();
});

ipcMain.on('hotlink', (event, url) => {
    shell.openExternal(url);
});
