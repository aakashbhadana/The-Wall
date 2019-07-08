const { ipcRenderer } = require('electron');
const remote = require('electron').remote;

document.getElementById("close-btn").addEventListener("click", function (e) {
    ipcRenderer.send('');    
}); 

ipcRenderer.on('callMain', (event, fxn) => {
    window[fxn]();
});

function nextWall(){
    ipcRenderer.send('nextWall'); 
}
ipcRenderer.on('switchedWall', (event, dir, username, fname, lname) => {
    dir = dir.replace(/\\/g,'/');
    dir = dir.replace(/ /g,'%20');
    document.getElementById('CurrentWall').style.backgroundImage = "url('"+ dir +"')";
    document.getElementById('fname').innerHTML = fname;
    document.getElementById('lname').innerHTML = lname;
    document.getElementById('username').innerHTML = username;

});

function toggleWall(){
    ipcRenderer.send('toggleWall'); 
}

ipcRenderer.on('toggledWall', (event, play_pause) => {

    if( play_pause == 1 ){
        document.getElementById('play_pause').src = 'assets/play.png';
    }else{
        document.getElementById('play_pause').src = 'assets/pause.png';   
    }
});

//Calling Main process to add Tag to Storeage
function newTag(){
    let tag = document.getElementById('TagInput').value;
    if(tag != ""){
        ipcRenderer.send('addTag',tag); 
    }
}

//Adding Tag to the Display list on Callback 
ipcRenderer.on('addedTag', (event, messages) => {
    document.getElementById('TagInput').value = "";
    document.getElementById('Tags').innerHTML += "<div id=\""+messages+"\" class=\"control\"><div class=\"tags has-addons\"><a class=\"tag is-link\">"+messages+"</a><a onclick=\"removeTag('"+messages+"')\" class=\"tag is-delete\"></a></div></div>"
});

//Calling Main process to remove Tag from Storeage
function removeTag(tag){
    ipcRenderer.send('deleteTag',tag); 
}

//Removing Tag from the Display list on Callback 
ipcRenderer.on('deletedTag', (event, messages) => {
    let element = document.getElementById(messages);
    element.parentNode.removeChild(element);
    
    notify('Deleted '+messages);
});

ipcRenderer.on('populateTags', (event, tags) => {
    for (var tag_name in tags) {
        document.getElementById('Tags').innerHTML += "<div id=\""+tag_name+"\" class=\"control\"><div class=\"tags has-addons\"><a class=\"tag is-link\">"+tag_name+"</a><a onclick=\"removeTag('"+tag_name+"')\" class=\"tag is-delete\"></a></div></div>"
    }

});

ipcRenderer.on('populateUpcoming', (event, walls, dir) => {

    dir = dir.replace(/\\/g,'/');
    dir = dir.replace(/ /g,'%20');
    document.getElementById('Upcoming').innerHTML = "";
    
    for (var file_name in walls) {
            document.getElementById('Upcoming').innerHTML += "<div class='upcoming' style=\"background-image: url(' "+dir+"/walls/"+walls[file_name][0]+'/'+file_name+"');\" onmouseover=\"tileOverlay('"+file_name+"',1)\" onmouseout=\"tileOverlay('"+file_name+"',0)\"><div  id='tile_"+file_name+"' class='upcomingOverlay'><div class='deletebt'><img src='assets/hotlink.png' onclick=\"hotlink("+file_name+")\" style='width: 15px;vertical-align: middle;float: left;margin-left: 10px'><img src='assets/cross.png' style='width: 10px;height: 10px'></div><div id='tagFamily' class='tagFamily'>"+walls[file_name][0]+"</div><div class='usebt'>SET</div></div></div>"
    }
});

function setTimer(){
    let hr = document.getElementById('hr').value;
    let min =document.getElementById('min').value;
    ipcRenderer.send('setTimer',hr,min);    
}
ipcRenderer.on('currentTimer', (event, time) => {
    document.getElementById('hr').value = time['hour'];
    document.getElementById('min').value = time['min'];
});