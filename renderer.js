const { ipcRenderer } = require('electron');
const remote = require('electron').remote;

document.getElementById("close-btn").addEventListener("click", function (e) {

    ipcRenderer.send('');    
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
});

ipcRenderer.on('populateTags', (event, messages) => {
    if(messages == ""){
        document.getElementById('Tags').innerHTML = "<img src=\"assets/empty.png\" style=\"width:35px;height:35px;vertical-align:middle;margin-right:15px;margin-left:20px\"><span style=\"font-size:12px;font-family:Segoe UI;color:#666\">Try adding some<br> Tags</span>"
    }else{
        let tags = messages.split(',');
        for(let i=0; i<tags.length-1; i++){
            document.getElementById('Tags').innerHTML += "<div id=\""+tags[i]+"\" class=\"control\"><div class=\"tags has-addons\"><a class=\"tag is-link\">"+tags[i]+"</a><a onclick=\"removeTag('"+tags[i]+"')\" class=\"tag is-delete\"></a></div></div>"
        }
    }
});

ipcRenderer.on('populateUpcoming', (event, walls, dir) => {
    dir = dir.replace(/\\/g,'/');
    dir = dir.replace(/ /g,'%20');
    if(walls.length > 0){
        for(let i=0; i<walls.length; i++){

            document.getElementById('Upcoming').innerHTML += "<div class=\"upcoming\" style=\"background-image: url(' "+dir+"/walls/"+walls[i]+"');\"></div>"
        }
    }else{

    } 
});