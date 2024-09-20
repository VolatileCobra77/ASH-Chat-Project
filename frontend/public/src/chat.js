const chatForm = document.getElementById("messageInput")
let msgReturn = document.getElementById("chat-window")

let wsUrl;
const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';  // Use 'wss' if using HTTPS, otherwise 'ws'

function addERROR(errorType, errorMsg, time){
    msgReturn.innerHTML += `<div class="alert alert-danger message" role="alert"><strong>SERVER: </strong>${errorType}: ${errorMsg} <span style="font-size: x-small; ">(Authentic Server Message)</span><span class="float-end me-3"<p> ${time} </p> </span></div>`
}
function addInfo(message, time){
    msgReturn.innerHTML += `<div class="alert alert-info message" role="alert"><strong>SERVER: </strong>INFO: ${message} <span style="font-size: x-small; ">(Authentic Server Message)</span><span class="float-end me-3"<p> ${time} </p> </span></div>`
}
function addMsg(Sender, senderIp, senderColor, message, time){
    msgReturn.innerHTML += `<div class=" alert alert-primary message" role="alert"><strong style="color:${senderColor};">${Sender}: </strong>${message} <span style="font-size: x-small; ">(from ${senderIp})</span><span class="float-end me-3 d-flex flex-row"><p style="margin-right:10px;"> ${time} </p> <a href="#" class="" onclick="copyText('${message}')"><i class="copyBtn fa-solid fa-copy"></i></a></span></div>`
}//Wrap all A tags in a span

const host = window.location.hostname;  // Get the current hostname (e.g., localhost or 168.99.44.34)

wsUrl = `${protocol}://${host}:8080`;

let socket = new WebSocket(wsUrl)

// When the connection is successfully established
socket.onopen = function(event) {
    console.log("WebSocket connection opened");
    // Optionally, send a message to the server once connected
    
};
function convertTo12Hour(time24) {
    let [hours, minutes, seconds] = time24.split(':').map(Number);
    let period = 'AM';

    if (hours === 0) {
        hours = 12;
    } else if (hours >= 12) {
        period = 'PM';
        if (hours > 12) {
            hours -= 12;
        }
    }

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
}
function convertDate(date) {
    const months = ["Jan", "Feb", "Mar", "apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"];
    const suffixes = ["th", "st", "nd", "rd"];

    let [year, month, day] = date.split('-').map(Number);
    month -= 1; // Convert month to zero-indexed (0-11 for Jan-Dec)

    const suffix = (day % 10 <= 3 && Math.floor(day / 10) !== 1) ? suffixes[day % 10] : "th";

    return `${day}${suffix} of ${months[month]} ${year}`;
}


// When a message is received from the server
if (!localStorage.getItem('channelId')){
    localStorage.setItem('channelId', '0')
}


socket.onmessage = function(event) {
    console.log("Message from server: ", event.data);
    let message = JSON.parse(event.data)
    if (message.uuid){
        localStorage.setItem("uuid", message.uuid)
        socket.send(JSON.stringify({"uuid":localStorage.getItem("uuid"), "username":localStorage.getItem("username"), "token":localStorage.getItem("token"), "type":"connection", "content":"", "timestamp":Date.now(), "channelId":localStorage.getItem("channelId")}));
        return
    }
    console.log(message)
    const date = new Date(message.timestamp);  // Convert to a Date object

    // Get human-readable parts of the date
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');  // Months are 0-based
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const clockTime = `${hours}:${minutes}:${seconds}`
    const clockDate = `${year}-${month}-${day}`

    // Format as YYYY-MM-DD HH:MM:SS
    const humanReadable = `${convertDate(clockDate)} at ${convertTo12Hour(clockTime)}`;

console.log(humanReadable);
    if (message.username == "SERVER" && message.ip == "SERVER"){
        if(message.type == "error" || message.type =="internal-error"){
            addERROR(message.type, message.content, humanReadable)
        }else{
            addInfo(message.content, humanReadable)
        }
    }else{
    
        addMsg(message.username, message.ip, message.color, message.content, humanReadable)
    }
};

// When an error occurs
socket.onerror = function(error) {
    console.log("WebSocket error: ", error);
};

// When the connection is closed
socket.onclose = function(event) {
    if (event.wasClean) {
        console.log(`WebSocket connection closed cleanly, code=${event.code}, reason=${event.reason}`);
    } else {
        console.log('Connection died');
    }
};

function clearScreen(){
    Array.from(document.getElementById('chat-window').children).forEach(childNode => {
        if (childNode.classList.contains("message")) {
            childNode.remove();
        }
    });
    
    
}
function disconnect(){
    socket.close(1000, "Disconnect")
}

function copyText(text){
    navigator.clipboard.writeText(text).then(() => {console.log('Text copied to clipboard');}).catch(err => {console.error('Failed to copy text: ', err);});
}

function reconnect(){
    window.location.href="/chat/"
}

function help(){
    addInfo('<h1>Command Descriptions</h1><ul class="list-group list-group-numbered"><li class="list-group-item">!help - shows this message</li><li class="list-group-item">!clear - clears the screen</li><li class="list-group-item ">!disconnect - disconnects from the session</li></ul><h1>Possible commands in the future</h1><ul class="list-group list-group-numbered">   <li class="list-group-item">!channels list - shows avalible channels</li>   <li class="list-group-item">!channels create [type] [name] - crates a channel, type is private or public, name is the name of the channel</li>   <li class="list-group-item">!channels invite [email] (channel) - invites specified user to channel if it is private, if a channel is specified after the user it invites them to that instead.</li></ul>') //long-ass line of code
}
function channels(){

}

const commandList = ["!clear", "!disconnect", "!help", "!reconnect", "!channels"]
//? !channel join [channel], !channel list
//? private channels could start with an `!`, not showing in `!channel list`
//? default could be `main`

const commandValues = [clearScreen, disconnect, help, reconnect, channels]

document.getElementById("message-input").addEventListener("submit", (event) => {
    event.preventDefault(); // Prevents form from submitting and reloading the page

    let message = document.getElementById("message").value;
    if (commandList.includes(message)){
        commandValues[commandList.indexOf(message)]()
        document.getElementById("message").value="";
        return
    }
    console.log("Message:", message);
    if (socket) {
        socket.send(JSON.stringify({
            "uuid":localStorage.getItem("uuid"),
            "username": localStorage.getItem("username"),
            "token": localStorage.getItem("token"),
            "type": "message",
            "content": message,
            "timestamp": Date.now(),
            "channelId": localStorage.getItem("channelId")
        }));
        document.getElementById("message").value = "";
    } else {
        console.error("WebSocket is not initialized.");
    }
});
function isNearBottom(div) {
    const scrollPosition = div.scrollTop + div.clientHeight;
    const scrollHeight = div.scrollHeight;
    if (window.innerHeight >= 333){
        return scrollHeight - scrollPosition <=100
    }
    return scrollHeight - scrollPosition <= window.innerHeight * 0.3;; // Checks if within 30% of the bottom
}

function scrollToBottom(div) {
    div.scrollTop = div.scrollHeight; // Scroll to the bottom
}
let div = document.getElementById("chat-window")
setInterval(()=>{
    if (isNearBottom(div)) {
        scrollToBottom(div);
    }
    // rip "var"
    // 1995-2015
}, 100)

let onlineContent = document.getElementById("onlineContent")
let groupsContent = document.getElementById("groupsContent")
let friendsContent = document.getElementById("friendsContent")
let onlineNav = document.getElementById("nav-Online")
let groupsNav = document.getElementById("nav-Groups")
let friendsNav = document.getElementById("nav-Friends")


function activateOnline(){
    onlineContent.classList.remove("visually-hidden")
    groupsContent.classList.add("visually-hidden")
    friendsContent.classList.add("visually-hidden")
    onlineNav.classList.add("active")
    groupsNav.classList.remove("active")
    friendsNav.classList.remove("active")
    
}
function activateGroups(){
    onlineContent.classList.add("visually-hidden")
    groupsContent.classList.remove("visually-hidden")
    friendsContent.classList.add("visually-hidden")
    onlineNav.classList.remove("active")
    groupsNav.classList.add("active")
    friendsNav.classList.remove("active")
    
}
function activateFriends(){
    onlineContent.classList.add("visually-hidden")
    groupsContent.classList.add("visually-hidden")
    friendsContent.classList.remove("visually-hidden")
    onlineNav.classList.remove("active")
    groupsNav.classList.remove("active")
    friendsNav.classList.add("active")
    
}
function sortUsers(users) {
    return users.sort((a, b) => {
        // Prioritize 'online' status
        if (a.status === "online" && b.status !== "online") return -1;
        if (a.status !== "online" && b.status === "online") return 1;

        // Sort alphabetically by username
        return a.username.localeCompare(b.username);
    });
}
async function getOnlineUsers(){
    let serverRes = await fetch(`/api/onlineUsers?channelId=0`, {
        "method":"GET"
    })
    let resJson = await serverRes.json()

    let outputList = []

    for (user of resJson){
        outputList.push({"username":user.username, "status":user.type})
            
    }
    
    outputList = sortUsers(outputList)
    let onlineContent = document.getElementById("onlineContent")
    onlineContent.innerHTML = ""
    for (user of outputList){
        
        if (user.status ==="online"){
            onlineContent.innerHTML+=`<div class="alert alert-info" role="alert"><strong>${user.username}</strong> Status: ${user.status}</div>`
        }else{
            onlineContent.innerHTML+=`                                <div class="alert alert-warning" role="alert">
            <strong>${user.username}</strong> Status: ${user.status}
        </div>`
        }
    }

}
//getOnlineUsers()
//setInterval(getOnlineUsers, 500)

async function getAllowedChannels(){
    let returnData = await fetch("/api/channels/list", {
        "method":"GET",
        "headers":{
            "Authorization":`Bearer ${localStorage.getItem('token')}`
        }
    })
    let returnJson = await returnData.json()
    let groupsContent = document.getElementById("groupsContent")
    for(channel of returnJson){
        groupsContent.innerHTML += `<a class="groupBtn" href="#" onclick="joinChannel('${channel.cid}')"><div class="alert alert-info" role="alert"><strong>${channel.name}</strong></div></a>`
    }
}

function joinChannel(cid){
    localStorage.setItem("channelId", cid)
    window.location.href="/chat/"
}