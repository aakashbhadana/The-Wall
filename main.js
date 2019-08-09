/*------------------------
Created by Aakash Bhadana |
-------------------------*/

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
const downloader = require('image-downloader')
const Store = require('electron-store');
const internetAvailable = require("internet-available");
const shell = require('electron').shell;

const store = new Store(); //Storage module, storing data in config.json

var tags, walls, downloads, cache, time, ongoing = false, ongoingTag = "", checking = false, backgroundDownloading, wallTimer, timer; //Run time variables

/*-------------------------
USAGE OF RUNTIME VARIABLES |
---------------------------

tags                   => Stores the user's tags and their quantity offline
walls                  => Stores Offline available wallpapers nam
e, tag, autho name, author's username, Unsplash html link
downloads              => List of pending downloads
cahce                  => Currently set wallpaper duration
ongoing                => Flag to check if any download is in progress
checking               => Flag to check if background download check is running
backgroundDownloading  => Reference to background download check interval function
walltimer              => Reference to background wallaper timer function
timer                  => Stores amount of time completed in wallpaper duration

*/

var win, intro, tray = null; //Window objects

//App Window
//----------
function createWindow(){

    // Create the App main window
    win = new BrowserWindow({
        show: false,
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

    // and load the thewall.html of the app
    win.loadFile('thewall.html');

    fetchVariables();

    // Waiting for window to load contents
    win.once('ready-to-show', () => {

        //loading Upcoming and Tags into GUI
        win.webContents.send('toggledWall', store.get('play_pause'));
        win.webContents.send('currentTimer', time);
        loadCurrentWall();
        loadUpcoming();
        loadTags();

        //win.toggleDevTools();

        checkDownloads();

        if (store.get('play_pause') == 0) {
            changeWalls();
        }
    })

    // Emitted when the window is closed.
    win.on('hide', () => {
        // Dereference the window object
        checkDownloads();
    })
}
//-------------------------App Window End


//Creating Config file for first-time setup
function createConfig() {
    store.set('tutorial', '0');
    store.set('time', { hour: 6, min: 0 });
    store.set('cache', 5);
    store.set('tags', {});
    store.set('collection', {});
    store.set('walls', {});
    store.set('downloads', {});
    store.set('play_pause', 0);
    store.set('timer', 0);
    addFolder(app.getPath('userData') + '/walls');

}

//Load runtime variables from config.json
function fetchVariables() {
    tags = store.get('tags');
    walls = store.get('walls');
    downloads = store.get('downloads');
    cache = store.get('cache');
    time = store.get('time');
    timer = store.get('timer');
}

//List directory files (Unused for now)
function listFiles(path) {

    let files = fs.readdirSync(path);
    files.forEach(file => {
        upcoming.push(file);
    });
}

//Change Desktop wallpapers at intervals
function changeWalls() {

    let secs = (3600 * time['hour']) + (60 * time['min']);
    console.log('Changing Walls every ', secs);

    wallTimer = setInterval(function () {

        if (timer >= secs) {

            let nextTag = getRandom(walls);


            if (nextTag != null) { //Check if Wallpapers are downloaded 
                let path = app.getPath('userData') + "\\walls\\" + walls[nextTag][0] + '\\' + nextTag;

                console.log('Next Wall ', path);
                (async () => {
                    await wallpaper.set(path);
                })();
                win.webContents.send('switchedWall', path, walls[nextTag][1], walls[nextTag][2], walls[nextTag][3]);

                (async () => {
                    let url = await wallpaper.get();
                    let wall = url.substring(url.lastIndexOf('\\') + 1);

                    if (walls[wall] != undefined) {
                        win.webContents.send('callMain', 'deleteWall', wall);
                    }

                })();
            }
            timer = 0;
            store.set('timer', timer);
        } else {
            timer = timer + 30;
            store.set('timer', timer);
        }
    }, 30000);


}

//Load currently set wallpaper
function loadCurrentWall() {

    (async () => {
        let url = await wallpaper.get();//URL of current Wallpaper
        console.log('URL :', url);
        let wall = url.substring(url.lastIndexOf('\\') + 1); //Stripping filename of current Wallpapers
        console.log('File :', wall);

        if (walls[wall] != undefined) {
            win.webContents.send('switchedWall', url, walls[wall][1], walls[wall][2], walls[wall][3], walls[wall][4]);
        } else {
            win.webContents.send('switchedWall', url, "", "Wallpaper", "set by User");
        }
    })();
}

//Play or Pause wallpaper change cycle
ipcMain.on('toggleWall', (event, args) => {

    if (store.get('play_pause') == 0) { // Stop changing wallpapers
        clearInterval(wallTimer);
        store.set('play_pause', 1);
        console.log('Paused');

    } else {                          // Resume changing wallpapers
        changeWalls();
        store.set('play_pause', 0);
        console.log('Played');
    }

    event.sender.send('toggledWall', store.get('play_pause'));

});

//Skip current wallpaper and load next
ipcMain.on('nextWall', (event, args) => {

    let nextTag = getRandom(walls);

    //Check if Wallpapers are downloaded
    if (nextTag != null) {

        (async () => {
            let url = await wallpaper.get();
            let wall = url.substring(url.lastIndexOf('\\') + 1);

            if (walls[wall] != undefined) {
                win.webContents.send('callMain', 'deleteWall', wall);
            }

        })();

        let path = app.getPath('userData') + "\\walls\\" + walls[nextTag][0] + '\\' + nextTag;
        console.log('Next Wall ', path);
        (async () => {
            await wallpaper.set(path);
        })();

        event.sender.send('switchedWall', path, walls[nextTag][1], walls[nextTag][2], walls[nextTag][3]);
    } else {
        win.webContents.send('notify', 'No offline Wallpapers');
    }


});

//Load currently set wallpaper duration into GUI
ipcMain.on('setTimer', (event, hr, min) => {

    time['hour'] = parseInt(hr);
    time['min'] = parseInt(min);

    if (!(isNaN(hr) || isNaN(min))) {
        store.set('time', time);
        win.webContents.send('notify', 'Wallpaper duration changed');
        clearInterval(wallTimer);
        changeWalls();
        event.sender.send('currentTimer', time);
    }
});

//Check for pending downloads
function checkDownloads() {

    if (checking == false) {
        checking = true;

        backgroundDownloading = setInterval(function () {
            console.log('Pending Download Tags  => ', Object.keys(downloads).length);

            if (Object.keys(downloads).length > 0 && ongoing == false) {

                win.webContents.send('downloading', 1); // Showing downloaing status

                ongoing = true;
                let downloadTag = getRandom(downloads);
                ongoingTag = downloadTag;
                console.log('Starting background downloading... => ', downloadTag);
                Unsplash(downloadTag);

            } else if (Object.keys(downloads).length == 0) {
                console.log('++ No Downloads Remaining ++')
                checking = false;
                win.webContents.send('downloading', 0); // Hiding downloaing status
                clearInterval(backgroundDownloading);
            }
        }, 7000);
    }
}

//Function to check if Internat is available
function Unsplash(downloadTag) {
    internetAvailable({
        timeout: 5000,
        retries: 10,
        domainName: "unsplash.com",
    }).then(() => {

        win.webContents.send('noInternet', 0); // Hiding no internet status
        getPages(downloadTag);

    }).catch(() => {

        win.webContents.send('noInternet', 1); // Showing no internet status 
        console.log('## No Internet ##');
        loadUpcoming();
        ongoing = false;
        ongoingTag = "";
    });
}

//Function to get random integers for wallpapers addition and deletion
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

//Function to get random property from an Object
function getRandom(obj) {
    let keys = Object.keys(obj);
    if (keys.length > 0) {
        return keys[keys.length * Math.random() << 0];
    } else {
        return null; //Object is empty
    }
}

//Checking Total number of pages available on UNSPLASH
function getPages(search) {

    let options = {
        "method": "GET",
        uri: 'https://unsplash.com/napi/search/photos?query=' + search + 'r&per_page=100',
        json: true,
        timeout: 5000,
        headers: {
            'User-Agent': 'Request-Promise'
        }
    };
    request(options).then(function (response) {
        requestUnsplash(search, response.total_pages);

    }).catch(function (err) {
        console.log('## Page number request error occured =>', err);
        ongoing = false;
        ongoingTag = "";
        return null;
    });

    console.log("// Requesting Page number //");
}

//Function to make requests to Unsplash API
function requestUnsplash(search, totalPages) {

    let page = getRandomInt(0, totalPages - 1); // Getting random page from total available pages on UNSPLASH
    let options = {
        "method": "GET",
        uri: 'https://unsplash.com/napi/search/photos?query=' + search + '&per_page=100&page=' + page,
        json: true,
        timeout: 5000,
        headers: {
            'User-Agent': 'Request-Promise'
        }
    };
    request(options).then(function (response) {


        let photo = getRandomInt(0, 99);
        let h = response.results[photo].height;
        let w = response.results[photo].width;

        while (h > w) {
            photo = getRandomInt(0, 99);
            h = response.results[photo].height;
            w = response.results[photo].width;
        }

        //Calling download image function
        downloadWall(response.results[photo].links.download, app.getPath('userData') + '/walls/' + search + '/' + response.results[photo].id + '.jpg', search, response.results[photo].id, response.results[photo].user.username, response.results[photo].user.first_name, response.results[photo].user.last_name, response.results[photo].links.html);

    }).catch(function (err) {
        console.log('## Unsplash request Error occured =>', err);
        ongoing = false;
        ongoingTag = "";
        return null;
    });

    console.log("// Requesting Unsplash //" + page);
}

//Function to download Wallpapers from Unsplash link
function downloadWall(url, localPath, search, name, username, fname, lname, html) {

    console.log('Downloading Wallpaper From => ', url, ' To => ', localPath);
    options = {
        url: url,
        dest: localPath,
        timeout: 5000
    }

    download = downloader.image(options).then(({ filename, image }) => {

        if (downloads[search] == 1) {
            delete downloads[search];
        } else {
            downloads[search] = downloads[search] - 1;
        }
        store.set('downloads', downloads);

        tags[search] = tags[search] + 1;
        store.set('tags', tags);

        walls[name + '.jpg'] = [search, username, fname, lname, html];
        store.set('walls', walls);

        console.log('Updated pending download = ', downloads);

        loadUpcoming();
        ongoing = false;
        ongoingTag = "";

        console.log('------------- Downloading Finished -------------');

    }).catch((err) => {

        console.log('Error in downloading Wall => ', err);
        loadUpcoming();
        ongoing = false;
        ongoingTag = "";
        return null;

    })
}

//----------------------------------
//FUNCTIONS FOR MANAGING USER'S TAGS
//----------------------------------

//ADDING TAGS
ipcMain.on('addTag', (event, args) => {

    if (tags[args] == undefined) {
        tags[args] = 0;
        store.set('tags', tags);
        addWalls(args);
        checkDownloads();
        event.sender.send('addedTag', args, tags);
    } else {
        event.sender.send('tagExists', args);
    }
});

//DELETING TAGS
ipcMain.on('deleteTag', (event, args) => {

    if (ongoingTag == args) {
        download = null; // Stoping Ongoing Download
    }
    delete tags[args];
    store.set('tags', tags);

    deleteWalls(args);
    event.sender.send('deletedTag', args, tags);
    console.log('Tag Deleted => ', args);
});

//LOADING TAGS
function loadTags() {
    win.webContents.send('populateTags', tags);
}


//------------------------------------------
//FUNCTIONS FOR MANAGING UPCOMING WALLPAPERS
//------------------------------------------

//ADDING WALLPAPERS
function addWalls(tag_name) {

    downloads[tag_name] = cache;
    store.set('downloads', downloads);
    addFolder(app.getPath('userData') + '/walls/' + tag_name + '/');

}

//DELETING WALLPAPERS
function deleteWalls(tag_name) {

    delete downloads[tag_name];
    store.set('downloads', downloads);

    for (var file_name in walls) {
        if (walls[file_name][0] == tag_name) {
            delete walls[file_name];
        }
    }
    store.set('walls', walls);

    deleteFolder(app.getPath('userData') + '/walls/' + tag_name + '/');
    loadUpcoming();

}

//LOADING WALLPAPERS
function loadUpcoming() {
    win.webContents.send('populateUpcoming', walls, app.getPath('userData'));
}

//----------------------------------
//FUNCTIONS FOR MANAGING DIRECTORIES
//----------------------------------

//ADDING DIRECTORY
function addFolder(path) {
    console.log('Directory created = ', path);
    fs.mkdir(path, function (err) {
        if (err) {
            return console.error(err);
        }
    });
}

function callback() {
    ;
}

//DELETING DIRECTORY
function deleteFolder(path) {
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach(function (file, index) {
            var curPath = path + "/" + file;
            if (fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolder(curPath);
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

//Use selected Wallapaper
ipcMain.on('setWall', (event, name) => {
    let path = app.getPath('userData') + "\\walls\\" + walls[name][0] + '\\' + name;
    console.log('Set Wall ', path);
    (async () => {
        await wallpaper.set(path);
    })();

    event.sender.send('switchedWall', path, walls[name][1], walls[name][2], walls[name][3]);
});

//Delete Selected Wallpaper
ipcMain.on('deleteWall', (event, name) => {

    tags[walls[name][0]] = tags[walls[name][0]] - 1;
    store.set('tags', tags);

    //Adding replacement for deleted Wallpaper
    if (downloads[walls[name][0]] != undefined) {
        downloads[walls[name][0]] = downloads[walls[name][0]] + 1;
    } else {
        downloads[walls[name][0]] = 1;
    }
    store.set('downloads', downloads);

    delete walls[name];
    store.set('walls', walls);
    loadUpcoming();
    checkDownloads();
});


//Open UNSPLASH page in external browser for selected wallpaper
ipcMain.on('hotlink', (event, url) => {

    shell.openExternal(url);
});


//First time user window
//----------------------
function firstTime() {

    intro = new BrowserWindow({
        show: false,
        frame: false,
        resizable: false,
        width: 800,
        height: 600,
        icon: path.join(__dirname, 'assets/icons/wall.png'),
        webPreferences: {
            nodeIntegration: true
        }
    })

    intro.setMenu(null);
    intro.loadFile('intro.html');
    intro.once('ready-to-show', () => {
        intro.show();
    });

}

// FIRST TIME SETUP FINISHED
ipcMain.on('finishSetup', (event, name) => {
    //Storing Default Config to JSON file 
    createConfig();
    fetchVariables();
    createWindow();

    win.once('ready-to-show', () => {

        win.show();

        //loading Upcoming and Tags into GUI
        win.webContents.send('toggledWall', store.get('play_pause'));
        win.webContents.send('currentTimer', time);
        loadCurrentWall();
        loadUpcoming();
        loadTags();
        //win.toggleDevTools();
        if (store.get('play_pause') == 0) {
            changeWalls();
        }
    })

    intro.close();
    addtoStart();

    //Adding Tray icon
    tray = new Tray(path.join(__dirname, 'assets/icons/wall.png'))
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Quit', click: () => { win.close() } },
        { label: 'Next', click: () => { win.webContents.send('callMain', 'nextWall') } },
        { label: 'Play/Pause', click: () => { win.webContents.send('callMain', 'toggleWall') } }
    ])
    tray.setToolTip('The Wall App');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
        win.isVisible() ? win.hide() : win.show(); loadUpcoming();
    })
});

//ADD PROGRAM TO STARTUP PROGRAM LIST
function addtoStart() {

    const exeName = path.basename(process.execPath);
    app.setLoginItemSettings({
        openAtLogin: true,
        path: process.execPath,
        args: [
            '--processStart', "${exeName}",
            '--process-start-args', "--hidden"
        ]
    });
}

//This method will be called when Electron has finished initialization
app.on('ready', () => {

    // Check for first time user
    if (store.has('tutorial') == false) {
        console.log('// FIRST TIME SETUP //')
        firstTime();
    } else {
        createWindow();
        tray = new Tray(path.join(__dirname, 'assets/icons/wall.png'))
        const contextMenu = Menu.buildFromTemplate([
            { label: 'Quit', click: () => { win.close() } },
            { label: 'Next', click: () => { win.webContents.send('callMain', 'nextWall') } },
            { label: 'Play/Pause', click: () => { win.webContents.send('callMain', 'toggleWall') } }
        ])
        tray.setToolTip('The Wall App');
        tray.setContextMenu(contextMenu);

        tray.on('click', () => {
            win.isVisible() ? win.hide() : win.show(); loadUpcoming();
        })
    }
})

//Quit when all windows are closed.
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
