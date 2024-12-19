const chatForm = document.getElementById("messageInput")
let msgReturn = document.getElementById("chat-window")
const chatTitle = document.getElementById("chatTitle")

let socket
let visible = true

let socketPingInterval = 300
let settings = JSON.parse(localStorage.getItem("settings"))

if(!settings){
    settings= {
        "Theme":"light",
        "Notif":{
            "enabled":true,
            "level":0
        },
        "Debug":{
            "enabled":true,
            "level":0
        },
        "Chat":{
            "primaryColor":"#FFFFFFF",
            "secondaryColor":"#000000",
            "auto-link":true,
            "send-ip":false
        },
        "Friends":{
            "discoverable":false,
            "friends":[
                {
                    "username":"USERNAME",
                    "email":"someone@example.com"
                }
            ]
        }
    }
    localStorage.setItem("settings", JSON.stringify(settings))
}

document.getElementById("socketPingIntChange").addEventListener("change",()=>{
    socketPingInterval = document.getElementById("socketPingIntChange").value
})

// Request notification permissions on page load
document.addEventListener("DOMContentLoaded", () => {
    if (Notification.permission !== "granted") {
        Notification.requestPermission();
    }
});

document.addEventListener("visibilitychange", () => {
    visible = document.visibilityState === "visible"

});

function truncateString(str) {
    return str.length > 30 ? str.slice(0, 27) + "..." : str;
}

// Function where you want to trigger the notification
function sendNotification(imgPath, header, content, bypassVisibility = false, serverMessage = false) {
    // Check if permission is granted
    if (settings.Debug.enabled){console.log("sending notification!")};
    if (Notification.permission === "granted") {
        if(!visible && settings.Notif.enabled|| bypassVisibility){
            if (!visible && settings.Notif.level =="0"|| bypassVisibility){
                new Notification(header, {
                    body: content,
                    icon: imgPath  // optional
            });
            }else if(!visible && settings.Notif.level =="1" && serverMessage || bypassVisibility){
                new Notification(header, {
                    body: content,
                    icon: imgPath  // optional
            });
            }else if(bypassVisibility){
                new Notification(header, {
                    body: content,
                    icon: imgPath  // optional
            });
            }
        }
    } else {
        if (settings.Debug.enabled){console.log("Notifications are not permitted.")};
        !settings.Notif.enabled ? null :addInfo("Notifications not allowed! <button onclick=\"Notification.requestPermission()\">Click me to request</button>")
    }
}


async function getChatName(){
    const data = await fetch("/api/channels/find", {
        method:"POST",
        headers:{
            "Content-Type":"application/json"
        },
        body:JSON.stringify({"cid":localStorage.getItem("channelId")})
    })
    const jsonData = await data.json()
    if (settings.Debug.enabled){console.log("THIS IS THE DATA YOU NEED: " + jsonData)};
    chatTitle.innerText = "CHAT: " + jsonData.name
    localStorage.setItem("channel", jsonData.name)
    document.getElementById("windowTitle").innerText = "chat.mrpickle.ca | In channel \"" + jsonData.name + "\""
}

getChatName()


let wsUrl;
const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';  // Use 'wss' if using HTTPS, otherwise 'ws'

function addERROR(errorType, errorMsg, time){
    msgReturn.innerHTML += `<div class="message bg-red-900 rounded-md flex flex-row"><span><svg viewBox="-2.4 -2.4 28.80 28.80" fill="none" xmlns="http://www.w3.org/2000/svg" transform="matrix(1, 0, 0, 1, 0, 0)rotate(0)"><g id="SVGRepo_bgCarrier" stroke-width="0" transform="translate(0,0), scale(1)"><rect x="-2.4" y="-2.4" width="28.80" height="28.80" rx="14.4" fill="#7ed0ec" strokewidth="0"></rect></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round" stroke="#CCCCCC" stroke-width="0.144"></g><g id="SVGRepo_iconCarrier"> <path fill-rule="evenodd" clip-rule="evenodd" d="M14 2C14 2.74028 13.5978 3.38663 13 3.73244V4H20C21.6569 4 23 5.34315 23 7V19C23 20.6569 21.6569 22 20 22H4C2.34315 22 1 20.6569 1 19V7C1 5.34315 2.34315 4 4 4H11V3.73244C10.4022 3.38663 10 2.74028 10 2C10 0.895431 10.8954 0 12 0C13.1046 0 14 0.895431 14 2ZM4 6H11H13H20C20.5523 6 21 6.44772 21 7V19C21 19.5523 20.5523 20 20 20H4C3.44772 20 3 19.5523 3 19V7C3 6.44772 3.44772 6 4 6ZM15 11.5C15 10.6716 15.6716 10 16.5 10C17.3284 10 18 10.6716 18 11.5C18 12.3284 17.3284 13 16.5 13C15.6716 13 15 12.3284 15 11.5ZM16.5 8C14.567 8 13 9.567 13 11.5C13 13.433 14.567 15 16.5 15C18.433 15 20 13.433 20 11.5C20 9.567 18.433 8 16.5 8ZM7.5 10C6.67157 10 6 10.6716 6 11.5C6 12.3284 6.67157 13 7.5 13C8.32843 13 9 12.3284 9 11.5C9 10.6716 8.32843 10 7.5 10ZM4 11.5C4 9.567 5.567 8 7.5 8C9.433 8 11 9.567 11 11.5C11 13.433 9.433 15 7.5 15C5.567 15 4 13.433 4 11.5ZM10.8944 16.5528C10.6474 16.0588 10.0468 15.8586 9.55279 16.1056C9.05881 16.3526 8.85858 16.9532 9.10557 17.4472C9.68052 18.5971 10.9822 19 12 19C13.0178 19 14.3195 18.5971 14.8944 17.4472C15.1414 16.9532 14.9412 16.3526 14.4472 16.1056C13.9532 15.8586 13.3526 16.0588 13.1056 16.5528C13.0139 16.7362 12.6488 17 12 17C11.3512 17 10.9861 16.7362 10.8944 16.5528Z" fill="#000000"></path> </g></svg> </span><span class="text-primary">[</span><span class="text-red-600 ml-0.5 mr-0.5">SERVER </span> <span class="text-secondary align-bottom relative ml-0.5 mr-0.5 text-sm sm:text-md"> ${time} </span> <span class="text-accent italic align-bottom ml-0.5 mr-0.5 text-xs sm:text-sm"> (Authentic server message) </span><span class="text-primary">]</span> <p class="text-orange-500" style="margin-left:10px; margin-right:10px"> ${errorType}: ${errorMsg} </p></div>`
}
function addInfo(message, time){
    msgReturn.innerHTML += `<div class=" message bg-base-300 rounded-md flex flex-row"><span><svg viewBox="-2.4 -2.4 28.80 28.80" fill="none" xmlns="http://www.w3.org/2000/svg" transform="matrix(1, 0, 0, 1, 0, 0)rotate(0)"><g id="SVGRepo_bgCarrier" stroke-width="0" transform="translate(0,0), scale(1)"><rect x="-2.4" y="-2.4" width="28.80" height="28.80" rx="14.4" fill="#7ed0ec" strokewidth="0"></rect></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round" stroke="#CCCCCC" stroke-width="0.144"></g><g id="SVGRepo_iconCarrier"> <path fill-rule="evenodd" clip-rule="evenodd" d="M14 2C14 2.74028 13.5978 3.38663 13 3.73244V4H20C21.6569 4 23 5.34315 23 7V19C23 20.6569 21.6569 22 20 22H4C2.34315 22 1 20.6569 1 19V7C1 5.34315 2.34315 4 4 4H11V3.73244C10.4022 3.38663 10 2.74028 10 2C10 0.895431 10.8954 0 12 0C13.1046 0 14 0.895431 14 2ZM4 6H11H13H20C20.5523 6 21 6.44772 21 7V19C21 19.5523 20.5523 20 20 20H4C3.44772 20 3 19.5523 3 19V7C3 6.44772 3.44772 6 4 6ZM15 11.5C15 10.6716 15.6716 10 16.5 10C17.3284 10 18 10.6716 18 11.5C18 12.3284 17.3284 13 16.5 13C15.6716 13 15 12.3284 15 11.5ZM16.5 8C14.567 8 13 9.567 13 11.5C13 13.433 14.567 15 16.5 15C18.433 15 20 13.433 20 11.5C20 9.567 18.433 8 16.5 8ZM7.5 10C6.67157 10 6 10.6716 6 11.5C6 12.3284 6.67157 13 7.5 13C8.32843 13 9 12.3284 9 11.5C9 10.6716 8.32843 10 7.5 10ZM4 11.5C4 9.567 5.567 8 7.5 8C9.433 8 11 9.567 11 11.5C11 13.433 9.433 15 7.5 15C5.567 15 4 13.433 4 11.5ZM10.8944 16.5528C10.6474 16.0588 10.0468 15.8586 9.55279 16.1056C9.05881 16.3526 8.85858 16.9532 9.10557 17.4472C9.68052 18.5971 10.9822 19 12 19C13.0178 19 14.3195 18.5971 14.8944 17.4472C15.1414 16.9532 14.9412 16.3526 14.4472 16.1056C13.9532 15.8586 13.3526 16.0588 13.1056 16.5528C13.0139 16.7362 12.6488 17 12 17C11.3512 17 10.9861 16.7362 10.8944 16.5528Z" fill="#000000"></path> </g></svg> </span><span class="text-primary">[</span><span class="text-red-600 ml-0.5 mr-0.5">SERVER </span> <span class="text-secondary align-bottom relative ml-0.5 mr-0.5 text-sm sm:text-md"> ${time} </span> <span class="text-accent italic align-bottom ml-0.5 mr-0.5 text-xs sm:text-sm"> (Authentic server message) </span><span class="text-primary">]</span> <p class="text-green-600" style="margin-left:10px; margin-right:10px"> INFO: ${message} </p></div>`
}
function addMsg(Sender, senderIp, senderColor, message, time, messageId){
    let msg = `<div id=${messageId} class="message rounded-md relative flex flex-row"><!--<span><img width="30px" height="30px" class="rounded-full block" id="pfp" src="/public/media/root/default_pfp.png"> </span>--><span class="text-primary">[</span><span class="text-red-600 ml-0.5 mr-0.5">${Sender} </span> <span class="text-secondary align-bottom relative ml-0.5 mr-0.5 text-sm sm:text-md"> ${time} </span> <span class="text-accent italic align-bottom ml-0.5 mr-0.5 text-xs sm:text-sm"> ${senderIp} </span><span class="text-primary">]</span> <p class="text-primary" style="margin-left:10px; margin-right:10px"> ${message} </p>`
    if (Sender == keycloak.tokenParsed.preferred_username){
        msg += `<a class="align-bottom no-underline text-error hover:cursor-pointer min-w-[30px] absolute right-0" onclick="deleteMsg('${messageId}')"> <svg class="fill-error stroke-black" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M 27.9999 51.9063 C 41.0546 51.9063 51.9063 41.0781 51.9063 28 C 51.9063 14.9453 41.0312 4.0937 27.9765 4.0937 C 14.8983 4.0937 4.0937 14.9453 4.0937 28 C 4.0937 41.0781 14.9218 51.9063 27.9999 51.9063 Z M 27.9999 47.9219 C 16.9374 47.9219 8.1014 39.0625 8.1014 28 C 8.1014 16.9609 16.9140 8.0781 27.9765 8.0781 C 39.0155 8.0781 47.8983 16.9609 47.9219 28 C 47.9454 39.0625 39.0390 47.9219 27.9999 47.9219 Z M 22.2343 41.9687 L 33.7187 41.9687 C 35.3827 41.9687 36.3436 41.0547 36.4374 39.3906 L 37.3046 20.2656 L 38.6640 20.2656 C 39.2968 20.2656 39.8124 19.7266 39.8124 19.0937 C 39.8124 18.4375 39.2968 17.9219 38.6640 17.9219 L 33.3671 17.9219 L 33.3671 16.0234 C 33.3671 14.1953 32.1483 13.0469 30.4140 13.0469 L 25.5155 13.0469 C 23.7812 13.0469 22.5858 14.1953 22.5858 16.0234 L 22.5858 17.9219 L 17.2655 17.9219 C 16.6327 17.9219 16.0936 18.4375 16.0936 19.0937 C 16.0936 19.7266 16.6327 20.2656 17.2655 20.2656 L 18.6718 20.2656 L 19.5390 39.3906 C 19.6093 41.0547 20.5936 41.9687 22.2343 41.9687 Z M 24.9296 17.9219 L 24.9296 16.4688 C 24.9296 15.8359 25.3749 15.4141 26.0077 15.4141 L 29.8514 15.4141 C 30.5077 15.4141 30.9530 15.8359 30.9530 16.4688 L 30.9530 17.9219 Z M 23.6405 39.3906 C 23.1249 39.3906 22.7733 39.0156 22.7499 38.4531 L 22.1171 22.7266 C 22.0936 22.1875 22.4687 21.7890 23.0546 21.7890 C 23.5936 21.7890 23.9452 22.1641 23.9921 22.7266 L 24.5546 38.4297 C 24.5780 38.9922 24.2265 39.3906 23.6405 39.3906 Z M 27.9530 39.3672 C 27.3905 39.3672 26.9921 38.9922 26.9921 38.4297 L 26.9921 22.7266 C 26.9921 22.1875 27.3671 21.7890 27.9530 21.7890 C 28.5390 21.7890 28.9140 22.1875 28.9140 22.7266 L 28.9140 38.4297 C 28.9140 38.9922 28.5390 39.3672 27.9530 39.3672 Z M 32.2890 39.3906 C 31.7030 39.3906 31.3514 38.9922 31.3749 38.4297 L 31.9374 22.7266 C 31.9609 22.1641 32.3358 21.7890 32.8514 21.7890 C 33.4374 21.7890 33.8358 22.1875 33.8124 22.7266 L 33.1796 38.4531 C 33.1562 39.0156 32.8046 39.3906 32.2890 39.3906 Z"></path></g></svg></a>`
    }
    
    msgReturn.innerHTML += msg + "</div>"
}

function uploadTheme(primary, secondary,accent, base100, neutral=null, base200=null, base300=null, baseContent=null, info=null,success=null,warning=null,error=null, roundedBox=null, roundedBtn=null,roundedBadge=null, animationBtn=null,animationInput=null,btnTextCase=null,btnFocusScale=null,borderBtn=null,tabBorder=null,tabRad=null){
    if(!primary, !secondary,!accent,!base100){
        console.error("NOPE")
        return
    }
    let response = fetch("/api/theme/upload", {
        "method":"GET",
        "headers":{
            "Content-Type":"application/json"
        }, "body":JSON.stringify({primary,secondary,accent,neutral,base100,base200,base300,baseContent,info,success,warning,error,roundedBox,roundedBtn,roundedBadge, animationBtn, animationInput, btnTextCase, btnFocusScale, borderBtn, tabBorder,tabRad})
    })
    let responseData = response.json()
    if (response.status !== 200){
        console.error("color upload failed " + responseData.error)
        return
    }
    
}

const host = window.location.hostname;  // Get the current hostname (e.g., localhost or 168.99.44.34)

// wsUrl = `${protocol}://${host}/ws`;
wsUrl = `${protocol}://chat.mrpickle.ca/ws`
let reconnectAttempts = 0;
let maxReconnectAttempts = 5;

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

function getHumanTime(time){
    const date = new Date(time); 
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');  // Months are 0-based
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const clockTime = `${hours}:${minutes}:${seconds}`
    const clockDate = `${year}-${month}-${day}`

    // Format as YYYY-MM-DD HH:MM:SS
    const humanReadable = `${convertTo12Hour(clockTime)}`;
    return humanReadable
}
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

async function deleteMsg(messageId){
    if(socket){
        socket.send(JSON.stringify({"uuid":localStorage.getItem("uuid"), "username":keycloak.tokenParsed.preferred_username, "token":keycloak.token, "type":"delMsg", "content":messageId, "timestamp":Date.now(), "channelId":localStorage.getItem("channelId")}))
    }
}


async function initWebSocket(){
    addInfo("Waiting on KeyCloak token... ", getHumanTime(Date.now()))
    let startTime = Date.now()
    while (!keycloak.tokenParsed){
        if(!keycloak.authenticationSuccess && Date.now() - startTime > 10000){
            clearScreen()
            addERROR("Authentication Error", "you are not authenticated. please <a onclick=\"keycloak.login()\" href=\"#\">log in</a>", getHumanTime(Date.now()))
            return
        }
        if (settings.Debug.enabled){console.log(`waiting for KC token for ${Date.now()-startTime} ms`)};
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (settings.Debug.enabled){console.log("TOKEN AQUIRED, Continuing")};
    addInfo(`Token Aquired after ${Date.now()-startTime}ms, contacting server...`, getHumanTime(Date.now()))

    socket = new WebSocket(wsUrl)



    // When the connection is successfully established
    socket.onopen = function(event) {
        addInfo("Connected to Server", getHumanTime(Date.now()))
        reconnectAttempts = 0
        // Optionally, send a message to the server once connected
        
    };
    socket.onclose = function(event){
        if (settings.Debug.enabled){console.log("websocket disconnected!")};
        if(reconnectAttempts >= maxReconnectAttempts){
            addERROR("Connection Error", "Websocket reconnect failed, check internet connection or contact VolatileCobra77", getHumanTime(Date.now())) 
        }else{
            addERROR(`Disconnected from Backend, attempting reconnect. Reconnect attempts ${reconnectAttempts}/${maxReconnectAttempts}`, getHumanTime(Date.now()))
            reconnectAttempts +=1
            initWebSocket()
        }
    }




    socket.onmessage = function(event) {
        if (settings.Debug.enabled){console.log("Message from server: ", event.data);};
        let message = JSON.parse(event.data)
        if (message.uuid){
            localStorage.setItem("uuid", message.uuid)
            if (settings.Debug.enabled){console.log("Data Sent for Auth" + JSON.stringify({"uuid":localStorage.getItem("uuid"), "username":keycloak.tokenParsed.preferred_username, "token":keycloak.token, "type":"connection", "content":"", "timestamp":Date.now(), "channelId":localStorage.getItem("channelId")}))};
            socket.send(JSON.stringify({"uuid":localStorage.getItem("uuid"), "username":keycloak.tokenParsed.preferred_username, "token":keycloak.token, "type":"connection", "content":"", "timestamp":Date.now(), "channelId":localStorage.getItem("channelId")}));
            socket.send(JSON.stringify({"uuid":localStorage.getItem("uuid"), "username":keycloak.tokenParsed.preferred_username, "token":keycloak.token, "type":"channelReq", "content":"", "timestamp":Date.now(), "channelId":localStorage.getItem("channelId")}))
            return
        }
        if (settings.Debug.enabled){console.log(message)};
        // Convert to a Date object

        // Get human-readable parts of the date
        const humanReadable = getHumanTime(message.timestamp)
    if (settings.Debug.enabled){console.log(humanReadable);};
        if(message.type === "ping"){
            document.getElementById("up").innerText=message.timeDifference
            document.getElementById("down").innerText = message.timestamp - Date.now()
            return;

        }
        if (message.username == "SERVER" && message.ip == "SERVER"){
            if(message.type == "error" || message.type =="internal-error"){
                addERROR(message.type, message.content, humanReadable)
                sendNotification("/public/src/imgs/error.png", `ERROR`, `${message.content} occured at ${humanReadable}`, false, true)

            }else if(message.type == "delMsg"){
                document.getElementById(message.content).remove()
            }
            else if(message.type == "messageList"){
                console.log("message list recieved for channel")
                message.content.forEach(message => {
                    if(message.timestamp && message.ip && message.username && message.content && message.id){
                        addMsg(message.username, message.ip, null, message.content, getHumanTime(message.timestamp), message.id)
                    }
                });
            }else if(message.type == "userList"){

                let outputList = []

                for (user of message.content){
                    outputList.push({"username":user.username, "status":user.type})
                        
                }
                
                outputList = sortUsers(outputList)
                if (settings.Debug.enabled){console.log(outputList)};
                let onlineContent = document.getElementById("onlineContent")
                onlineContent.innerHTML = ""
                for (user of outputList){
                    
                    if (user.status ==="online"){
                        onlineContent.innerHTML+=`<div class="rounded-md flex flex-row w-min max-w-min bg-success"><strong class="mx-2 text-neutral"> ${user.username} </strong> <span class="text-success-content mr-2"> ${user.status}</span></div>`
                    }else{
                        onlineContent.innerHTML+=`<div class="rounded-md flex flex-row w-min max-w-min bg-warning"><strong class="mx-2 text-neutral"> ${user.username} </strong> <span class="text-warning-content mr-2"> ${user.status}</span></div>`
                    }
                }

            }else if(message.type =="groupList"){
                groupsContent.innerHTML = ''
                for(channel of message.content){
                    groupsContent.innerHTML += `<a class="groupBtn" href="#" onclick="joinChannel('${channel.cid}')"><div class="alert alert-info" role="alert"><strong>${channel.name}</strong></div></a>`
                
                }
            }
            else{
                addInfo(message.content, humanReadable)
                sendNotification("/public/src/imgs/info.png", `Message from server`, `Server said ${message.content} on the ${humanReadable}`, false, true)
            }
        }else{
        
            addMsg(message.username, message.ip, message.color, message.content, humanReadable, message.id)
            sendNotification("/public/src/imgs/info.png", `New message in channel ${localStorage.getItem("channel")}`, `${message.username} said ${truncateString(message.content)} on the ${humanReadable}`,false, false)
        }
    };

    // When an error occurs
    socket.onerror = function(error) {
        if (settings.Debug.enabled){console.log("WebSocket error: ", error);};
    };

    // When the connection is closed
    socket.onclose = function(event) {
        if (event.wasClean) {
            if (settings.Debug.enabled){console.log(`WebSocket connection closed cleanly, code=${event.code}, reason=${event.reason}`);};
        } else {
            if (settings.Debug.enabled){console.log('Connection died');};
        }
    };


}
initWebSocket()
function clearScreen(){
    Array.from(document.getElementById('chat-window').children).forEach(childNode => {
        if (childNode.classList.contains("message")) {
            childNode.remove();
        }
    });
    
    
}
function disconnect(input){
    socket.close(1000, "Disconnect")
    socket = null
}

function copyText(text){
    navigator.clipboard.writeText(text).then(() => {if (settings.Debug.enabled){console.log('Text copied to clipboard');}}).catch(err => {console.error('Failed to copy text: ', err);})
}

function reconnect(input){
    
    if(!socket){
        initWebSocket()
    }else{
        addInfo("already connected to websocket!", getHumanTime(Date.now()))
    }
}

console.log("new chat.js used")

function help(input){
    
     msgReturn.innerHTML += `<div class="message bg-base-300 rounded-md flex flex-col"><div class="text-6xl text-center text-primary font-bold mt-[10px]">Help menu</div><div class="text-sm text-secondary mx-[10px] my-[10px] text-center">Arguments wrapped in [] are required, arguments wrapped in () are optional. Arguments are listed in order</div><div class="overflow-auto h-96 w-full scrollbar-none"><table class="table"><thead><tr><th>Command</th><th>Arguments</th><th>Implemented</th><th>Description</th><th>Copy/Use</th></tr></thead><tbody><tr class="hover"><td>help</td><th>(command)</th><th><input type="checkbox" class="checkbox checkbox-primary checkbox-lg" disabled checked></th><th>Displays this help menu, optionaly displays in-depth help with a certian command</th><th><button onclick="navigator.clipboard.writeText('!help (command)');" class="btn btn-primary btn-sm">Copy</button><button onclick="document.getElementById('message').value += ' !help (command)'" class="btn btn-secondary btn-sm">Use</button></th></tr><tr class="hover"><td>channels list</td><th>NONE</th><th><input type="checkbox" class="checkbox checkbox-primary checkbox-lg" disabled checked></th><th>Lists all avalible channels to the user, excluding private channels</th><th><button onclick="navigator.clipboard.writeText('!channels list');" class="btn btn-primary btn-sm">Copy</button><button onclick="document.getElementById('message').value += ' !channels list'" class="btn btn-secondary btn-sm">Use</button></th></tr><tr class="hover"><td>channels create</td><th>[private | public] [name]</th><th><input type="checkbox" class="checkbox checkbox-primary checkbox-lg" disabled checked></th><th>Creates a new channel with the specified name and access, defaults to public if no valid option is present</th><th><button onclick="navigator.clipboard.writeText('!channels create public [name]');" class="btn btn-primary btn-sm">Copy</button><button onclick="document.getElementById('message').value += ' !channels create public [name]'" class="btn btn-secondary btn-sm">Use</button></th></tr><tr class="hover"><td>channels access</td><th>[Email] (Channel Id) (add | remove)</th><th><input type="checkbox" class="checkbox checkbox-primary checkbox-lg" disabled ></th><th>Changes a user's access to the specified channel, if no channel is specified it uses current channel. Must be owner of channel to use. If add or remove is not specified, defaults to add</th><th><button onclick="alert('this command isint implemented yet!')" class="btn btn-primary btn-sm">Copy</button><button onclick="alert('this command isint implemented yet!')" class="btn btn-secondary btn-sm">Use</button></th></tr><tr class="hover"><td>channels connect</td><th>[Channel Id]</th><th><input type="checkbox" class="checkbox checkbox-primary checkbox-lg" disabled checked></th><th>Connects to the specified channel</th><th><button onclick="navigator.clipboard.writeText('!channels connect [cid]');" class="btn btn-primary btn-sm">Copy</button><button onclick="document.getElementById('message').value += ' !channels connect [cid]'" class="btn btn-secondary btn-sm">Use</button></th></tr><tr class="hover"><td>disconnect</td><th>NONE</th><th><input type="checkbox" class="checkbox checkbox-primary checkbox-lg" disabled checked></th><th>Disconnects from websocket</th><th><button onclick="navigator.clipboard.writeText('!disconnect');" class="btn btn-primary btn-sm">Copy</button><button onclick="document.getElementById('message').value += ' !disconnect'" class="btn btn-secondary btn-sm">Use</button></th></tr><tr class="hover"><td>reconnect</td><th>NONE</th><th><input type="checkbox" class="checkbox checkbox-primary checkbox-lg" disabled checked></th><th>Reconnects to the websocket once disconnected</th><th><button onclick="navigator.clipboard.writeText('!reconnect');" class="btn btn-primary btn-sm">Copy</button><button onclick="document.getElementById('message').value += ' !reconnect'" class="btn btn-secondary btn-sm">Use</button></th></tr><tr class="hover"><td>clear</td><th>NONE</th><th><input type="checkbox" class="checkbox checkbox-primary checkbox-lg" disabled checked></th><th>clears all messages from the window, Client side only</th><th><button onclick="navigator.clipboard.writeText('!clear');" class="btn btn-primary btn-sm">Copy</button><button onclick="document.getElementById('message').value += ' !clear'" class="btn btn-secondary btn-sm">Use</button></th></tr></tbody></table></div><div class="text-center text-sm text-secondary m-[10px]">More commands to come in the future, along with autocomplete</div></div>` //long-ass line of code - ivy; Then Split it up yourself - VolatileCobra77;
}
function channels(input){
    let inList = input.split(" ")
    if (inList[1] =="list"){
        addInfo('Getting Channels', getHumanTime(Date.now()))
        getChannels()    
        return
    }
    if (inList[1] =="connect" && inList[2]){
        joinChannel(inList[2])
        return
    }else if (inList[1]=="connnect" && ! inList[2]){
        addERROR('ERROR', 'No Channel Id Specified, Please specify the channel ID to connect to', getHumanTime(Date.now()))
    }
    if (inList[1]=="create" && inList[2]){
        let type = inList[2]
        let name =inList.slice(3).join(" ");
        
        createChannel(type, name)
    }else if (inList[1] == "create" & !inList[3]){
        addERROR("ERROR", 'No Name Specified', getHumanTime(Date.now()))
    }else if (inList[1] == "delete"){
        if (!inList[2]){
            addERROR("No Name Specified", getHumanTime(Date.now()))
            return;
        }
        requestRemoveChannel(inList[2])
    }
    else{
        addERROR('ERROR', "Invalid input", getHumanTime(Date.now()))
    }
}
async function getChannels(){
    let returnData = await fetch("/api/channels/list", {
        "method":"GET",
        "headers":{
            "Authorization":`Bearer ${keycloak.token}`
        }
    })
    let returnJson = await returnData.json()
    let infoData = "<div>" 
    for(channel of returnJson){
        infoData += `<a class="groupBtn" href="#" onclick="joinChannel('${channel.cid}')"><div class="alert alert-warning" role="alert"><strong>${channel.name}</strong> Channel ID: ${channel.cid}</div></a>`
    }
    infoData += "</div>"
    addInfo(infoData, getHumanTime(Date.now()))
}

async function requestRemoveChannel(name){
    const returnData = fetch("/api/channels/delete", {
        "method":"POST",
        "headers":{
            "Content-Type":"application/json",
            "Authorization":`Bearer ${keycloak.token}`
        },
        "body":JSON.stringify({"channelName":name})
    })
    if (returnData.status != 201){
        let returnDataJson = await returnData.json()
        addERROR("ERROR", returnDataJson.error, getHumanTime(Date.now()))
        return;
    }
    addInfo(`Channel ${name} deleted sucessfully`)
    if(localStorage.getItem("channelName" == name)){
        localStorage.setItem("channelId", 0)
        window.location.href = "/"
        return
    }
    
}

async function createChannel(type, name){
    if (!type == 'public' || !type == 'private'){
        type = 'public'
    }

    let accessList = []

    if (type=='public'){
        accessList = ['all']
    }else if (type=='private'){
        accessList = []
    }
    let conf = await fetch("/api/channels/create", {
        "method":"POST",
        "headers":{
            "Content-Type":"application/json",
            "Authorization" : `Bearer ${keycloak.token}`
        },
        "body":JSON.stringify({"channelName":name, "accessList":accessList})
    })
    let confJson = await conf.json()

    if (confJson.error){
        addERROR('ERROR', confJson.error, getHumanTime(Date.now()))
        return
    }

    addInfo(confJson.message +", Channel ID: " + confJson.cid + "<button class='btn btn-primary' onclick='joinChannel(" + confJson.cid + ")'> Join Channel </button>", getHumanTime(Date.now()))
}

async function inviteToChannel(user, channelId){

}

const commandList = ["!clear", "!disconnect", "!help", "!reconnect", "!channels"]
//? !channel join [channel], !channel list
//? private channels could start with an `!`, not showing in `!channel list`
//? default could be `main`

const commandValues = [clearScreen, disconnect, help, reconnect, channels]

document.getElementById("message-input").addEventListener("submit", (event) => {
    event.preventDefault(); // Prevents form from submitting and reloading the page

    let message = document.getElementById("message").value;
    for (command of commandList){
        if (!message.includes(command)) continue;
        commandValues[commandList.indexOf(command)](message)
        document.getElementById("message").value="";
        return
    }
    if (settings.Debug.enabled){console.log("Message:", message);};
    if (socket) {
        socket.send(JSON.stringify({
            "uuid":localStorage.getItem("uuid"),
            "username": keycloak.tokenParsed.preferred_username,
            "token": keycloak.token,
            "type": "message",
            "content": message,
            "timestamp": Date.now(),
            "channelId": localStorage.getItem("channelId")
        }));
        document.getElementById("message").value = "";
    } else {
        console.error("WebSocket is not initialized.");
        addERROR("SOCKET_ERROR", "Websocket is not connected, reload page", getHumanTime(Date.now()))
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
    onlineContent.classList.remove("hidden")
    onlineContent.classList.add("flex")
    groupsContent.classList.add("hidden")
    friendsContent.classList.add("hidden")
    onlineNav.classList.add("active")
    groupsNav.classList.remove("active")
    friendsNav.classList.remove("active")
    
}
function activateGroups(){
    onlineContent.classList.add("hidden")
    groupsContent.classList.remove("hidden")
    groupsContent.classList.add("flex")
    friendsContent.classList.add("hidden")
    onlineNav.classList.remove("active")
    groupsNav.classList.add("active")
    friendsNav.classList.remove("active")
    
}
function activateFriends(){
    onlineContent.classList.add("hidden")
    groupsContent.classList.add("hidden")
    friendsContent.classList.remove("hidden")
    friendsContent.classList.add("flex")
    onlineNav.classList.remove("active")
    groupsNav.classList.remove("active")
    friendsNav.classList.add("active")
    
}
function sortUsers(users) {
    return users.sort((a, b) => {
        if (settings.Debug.enabled){console.log("user1: ")};
        if (settings.Debug.enabled){console.log(a)};
        if (settings.Debug.enabled){console.log("user2: ")};
        if (settings.Debug.enabled){console.log(b)};
        // Prioritize 'online' status
        if (a.status === "online" && b.status !== "online") return -1;
        if (a.status !== "online" && b.status === "online") return 1;

        // Sort alphabetically by username
        return a.username.localeCompare(b.username);
    });
}
async function getOnlineUsers(){
    let serverRes = await fetch(`/api/onlineUsers?channelId=${localStorage.getItem("channelId")}`, {
        "method":"GET"
    })
    let resJson = await serverRes.json()

    let outputList = []

    for (user of resJson){
        outputList.push({"username":user.username, "status":user.type})
            
    }
    
    outputList = sortUsers(outputList)
    if (settings.Debug.enabled){console.log(outputList)};
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
getOnlineUsers()
//setInterval(getOnlineUsers, 500)

async function getAllowedChannels(){
    let returnData = await fetch("/api/channels/list", {
        "method":"GET",
        "headers":{
            "Authorization":`Bearer ${keyclaok.token}`
        }
    })
    let returnJson = await returnData.json()
    let groupsContent = document.getElementById("groupsContent")
    groupsContent.innerHTML = ''
    for(channel of returnJson){
        groupsContent.innerHTML += `<a class="groupBtn" href="#" onclick="joinChannel('${channel.cid}')"><div class="alert alert-info" role="alert"><strong>${channel.name}</strong></div></a>`
    }
}

function joinChannel(cid){
    localStorage.setItem("channelId", cid)
    window.location.href="/"
}
//setInterval(getAllowedChannels, 500)

setInterval(()=>{
    try{
        socket.send(JSON.stringify({
            "uuid":localStorage.getItem("uuid"),
            "username": keycloak.tokenParsed.preferred_username,
            "token": keycloak.token,
            "type": "ping",
            "content": "",
            "timestamp": Date.now(),
            "channelId": localStorage.getItem("channelId")
        }))
    }catch{
        //if (settings.Debug.enabled){console.log("unable to update ping, websocket not connected")}
        document.getElementById("up").innerText="NAN"
        document.getElementById("down").innerText = "NAN"
    }
}, socketPingInterval)