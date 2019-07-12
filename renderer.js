/*------------------------
Created by Aakash Bhadana |
-------------------------*/

const { ipcRenderer } = require('electron');
const remote = require('electron').remote;

//Function to redirect Main process calls to Main process functions
ipcRenderer.on('callMain', (event, fxn, args) => {
    window[fxn](args);
});

//Change downloading status in App
ipcRenderer.on('downloading', (event, x) => {
    if(x == 1){
        document.getElementById('downloading').className = "gradient-border";   
    }else{
        document.getElementById('downloading').className = "blue-border";
    }
});

//Change Internet status in App
ipcRenderer.on('noInternet', (event, x) => {
    if(x == 1){
        document.getElementById('noInternet').style.display = "block";   
    }else{
        document.getElementById('noInternet').style.display = "none";   
    }
});

//Generate a notification toast
ipcRenderer.on('notify', (event, msg) => {
    notify(msg);
});

//Set Wallpaper
function setWall(name){
    ipcRenderer.send('setWall',name); 
}

//Delete Wallpaper
function deleteWall(name){
    ipcRenderer.send('deleteWall',name); 
}

//Open Wallpaper on UNSPLASH
function hotlink(name){
    ipcRenderer.send('hotlink',name); 
}

//Skip current wall to next
function nextWall(){
    ipcRenderer.send('nextWall'); 
}

//Callback on successfull wallpaper change
ipcRenderer.on('switchedWall', (event, dir, username, fname, lname, html) => {
    dir = dir.replace(/\\/g,'/');
    dir = dir.replace(/ /g,'%20');
    document.getElementById('CurrentWall').style.backgroundImage = "url('"+ dir +"')";
    document.getElementById('fname').innerHTML = fname;
    document.getElementById('lname').innerHTML = lname;
    
    if(username != ""){
     document.getElementById('username').innerHTML = "<a onclick=\"hotlink('https://unsplash.com')\" style='color:#000;'>@"+username+"</a><br><span  style='color:#000;font-size:10px'>on <a onclick=\"hotlink('https://unsplash.com')\" style='color:#000'>Unsplash</a></span>";   
    }

});

//Play or Pause wallpaper change
function toggleWall(){
    ipcRenderer.send('toggleWall'); 
}

//Callback on wallpaper pause/play
ipcRenderer.on('toggledWall', (event, play_pause) => {

    if( play_pause == 1 ){
        document.getElementById('play_pause').src = 'assets/play.png';
    }else{
        document.getElementById('play_pause').src = 'assets/pause.png';   
    }
});

//Calling Main process to add new tag
function newTag(){
    let tag = document.getElementById('TagInput').value;
    if(tag != ""){
        ipcRenderer.send('addTag',tag); 
    }
}

//Callback on successfull Tag addition
ipcRenderer.on('addedTag', (event, messages,tags) => {
    if(Object.keys(tags).length == 1){
        document.getElementById('Tags').innerHTML = "";
    }
    document.getElementById('TagInput').value = "";
    document.getElementById('Tags').innerHTML += "<div id=\""+messages+"\" class=\"control\"><div class=\"tags has-addons\"><a class=\"tag is-link\">"+messages+"</a><a onclick=\"removeTag('"+messages+"')\" class=\"tag is-delete\"></a></div></div>"
});

//Call from MAIN to inform that Tag already exist
ipcRenderer.on('tagExists', (event, messages) => {
    notify('Tag already added');
});

//Delete Tag
function removeTag(tag){
    ipcRenderer.send('deleteTag',tag); 
}

//Callback on Tag deletion 
ipcRenderer.on('deletedTag', (event, messages,tags) => {
    if(Object.keys(tags).length == 0){
        document.getElementById('Tags').innerHTML = "<img src='assets/empty.png' style='width:25px;height:25px;margin-right: 10px;vertical-align:middle'><span style='font-size:13px;color:#ccc'> No tags added</span>";
    }
    let element = document.getElementById(messages);
    element.parentNode.removeChild(element);

    notify('Deleted '+messages);
});

//Load all the user Tags into App
ipcRenderer.on('populateTags', (event, tags) => {

    if(Object.keys(tags).length == 0){ //Check if any tags are added
        document.getElementById('Tags').innerHTML = "<img src='assets/empty.png' style='width:25px;height:25px;margin-right: 10px;vertical-align:middle'><span style='font-size:13px;color:#ccc'> No tags added</span>";
    }
    for (var tag_name in tags) {
        document.getElementById('Tags').innerHTML += "<div id=\""+tag_name+"\" class=\"control\"><div class=\"tags has-addons\"><a class=\"tag is-link\">"+tag_name+"</a><a onclick=\"removeTag('"+tag_name+"')\" class=\"tag is-delete\"></a></div></div>";
    }

});

//Load all the offline wallpapers to App
ipcRenderer.on('populateUpcoming', (event, walls, dir) => {
    
    document.getElementById('Upcoming').innerHTML = "";
    
    if(Object.keys(walls).length == 0){ //Check if offline wallpapera are available
        
        document.getElementById('Upcoming').innerHTML = "<div id'skeleton'><div style='width: 90px; height: 90px;background-color: #f6f6f6;border-radius: 10px;padding: 10px;text-align: center;display: inline-block;;margin: 2px'></div><br><div style='width: 90px; height: 90px;background-color: #f6f6f6;border-radius: 10px;padding: 10px;text-align: center;display: inline-block;margin: 2px'></div><div style='width: 90px; height: 90px;background-color: #f6f6f6;border-radius: 8px;padding: 10px;text-align: center;display: inline-block;background-image: url(assets/dots.png);background-size: 40px;background-repeat: no-repeat;background-position: center;margin: 2px'></div></div>"
    }
    
    dir = dir.replace(/\\/g,'/');
    dir = dir.replace(/ /g,'%20');

    for (var file_name in walls) {
        document.getElementById('Upcoming').innerHTML += "<div class='upcoming' style=\"background-image: url(' "+dir+"/walls/"+walls[file_name][0]+'/'+file_name+"');\" onmouseover=\"tileOverlay('"+file_name+"',1)\" onmouseout=\"tileOverlay('"+file_name+"',0)\"><div  id='tile_"+file_name+"' class='upcomingOverlay'><div class='deletebt'><img src='assets/hotlink.png' onclick=\"hotlink('"+walls[file_name][4]+"')\" style='width: 15px;vertical-align: middle;float: left;margin-left: 10px'><img src='assets/cross.png'  onclick=\"deleteWall('"+file_name+"')\" style='width: 10px;height: 10px'></div><div id='tagFamily' class='tagFamily'>"+walls[file_name][0]+"</div><div class='usebt' onclick=\"setWall('"+file_name+"')\">SET</div></div></div>"
    }
});

//Set new wallpaper change duration
function setTimer(){
    let hr = document.getElementById('hr').value;
    let min =document.getElementById('min').value;
    ipcRenderer.send('setTimer',hr,min);    
}

//Display current wallpaper duration
ipcRenderer.on('currentTimer', (event, time) => {
    document.getElementById('hr').value = time['hour'];
    document.getElementById('min').value = time['min'];
});