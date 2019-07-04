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

ipcRenderer.on('populateTags', (event, tags) => {
    for (var tag_name in tags) {
        document.getElementById('Tags').innerHTML += "<div id=\""+tag_name+"\" class=\"control\"><div class=\"tags has-addons\"><a class=\"tag is-link\">"+tag_name+"</a><a onclick=\"removeTag('"+tag_name+"')\" class=\"tag is-delete\"></a></div></div>"
    }

});

ipcRenderer.on('populateUpcoming', (event, walls, dir) => {
    dir = dir.replace(/\\/g,'/');
    dir = dir.replace(/ /g,'%20');
    for (var tag_name in walls) {
        document.getElementById('Upcoming').innerHTML += "<div class=\"upcoming\" style=\"background-image: url(' "+dir+"/walls/"+tag_name+"');\"></div>"        
    }
});