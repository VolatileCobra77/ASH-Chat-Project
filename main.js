#!/usr/bin/env node

const uuid = require("uuid")
const express = require("express");
const bcrypt = require('bcryptjs');
const crypto = require('crypto')
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const multer = require('multer');
const ws = require("ws");
const fs = require('fs');
const path = require('path');
const os = require('os');
const { channel } = require("diagnostics_channel");
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048, // Key size
    publicKeyEncoding: {
        type: 'spki', // Recommended for public keys
        format: 'pem',
    },
    privateKeyEncoding: {
        type: 'pkcs8', // Recommended for private keys
        format: 'pem',
    },
});

/**
 * Decrypts RSA encrypted data using the server's private key.
 * @param {string} encryptedData - The Base64-encoded encrypted data.
 * @param {string} privateKey - The PEM-formatted private key.
 * @returns {string} - The decrypted plaintext.
 */
function decryptRSA(encryptedData, privateKey) {
  try {
      // Decrypt the data
      const decryptedBuffer = crypto.privateDecrypt(
          {
              key: privateKey,
              padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
              oaepHash: 'sha256',
          },
          Buffer.from(encryptedData, 'base64') // Convert Base64 to Buffer
      );

      // Convert the decrypted buffer to a string
      return decryptedBuffer.toString('utf-8');
  } catch (error) {
      console.error('Decryption Error:', error.message);
      throw new Error('Failed to decrypt the data.');
  }
}



const readline = require('readline');

const KeycloakConnect = require('keycloak-connect');
const session = require('express-session');

// Create interface to listen for input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> ' // Prompt sign for user input
});

// A function to simulate an async task (like a command handler)
async function handleCommand(command) {
    return new Promise((resolve, reject) => {
        resolve(command) // Simulate delay
    });
}

// Start listening for input
rl.prompt();

function processMsgSend(args){
    if (!args[0]){
      console.log("no channel id specified!")
      return
    }
    if (!args[1]){
      console.log("no message specified!")
    }
    const cid = args[0]
    const msg = args.slice(1).join(" ")
    console.log(`Sending message ${msg} to channel ${getChannel(cid).name}`)
    broadcastToClients(JSON.stringify({
      "ip": "SERVER",
      "username": "SERVER",
      "color": "#00000",
      "altColor": "#fffff",
      "timestamp": Date.now(),
      "type": "Server message",
      "content": msg
    }), cid)

}

function processUsers(args){
    try{for (const wsConnection of wsConnections){
      console.log(wsConnection.user)
    }}catch{
      console.error("User does not have an email!")
    }
}

function processDisconnect(args){

  for (const wsConnection of wsConnections){
    if (wsConnection.user.email == args[0]){
      console.log("User found! terminating!")
      wsConnection.ws.send(JSON.stringify({
        "ip": "SERVER",
        "username": "SERVER",
        "color": "#00000",
        "altColor": "#fffff",
        "timestamp": Date.now(),
        "type": "error",
        "content": "You have been disconnected by an admin, any attempt to reconnect could result in a ban."
    }))
      wsConnection.ws.close()
      return;
    }
    
  }
  console.log("No user found")
  console.log("")

}

function processGrabId(args){

}

function processHelp(args){
  if (!args[0]){
    console.log(`HELP MENU:
COMMAND      ARGS                   DESCRIPTION
sendmsg      [channelID] [message]  Sends specified message to specified channel
disconnect   [email]                Disconnects any users with the matching email from the websocket
grabIds      [channelName]          Displays all channelIds that match the name (can be multiple)
help         (command)              Displays this help message or more specific ones per command

[] = REQUIRED
() = OPTIONAL`)
  }
}

rl.on('line', async (input) => {
    const trimmedInput = input.trim();

    // Execute the command asynchronously
    try {
        //console.log(result);
        
        // Exit the process if 'exit' command is given

        let commands = trimmedInput.split(" ")

        const command = commands[0]

        const args = commands.slice(1)

        switch(command){
          case 'exit' : rl.exit();
          case 'sendmsg' : processMsgSend(args);
          case 'disconnect' : processDisconnect(args);
          case 'help': processHelp(args)
          case 'grabId' : processGrabId(args)
          case 'getUsers' : processUsers(args);
        }
    } catch (err) {
        console.error('Error executing command:', err);
    }

    // Keep prompting for more input
    rl.prompt();
}).on('close', () => {
    console.log('Process terminated');
    process.exit(0);
});


const app = express();

let adminList =["nathan.fransham@gmail.com", "ivykb@proton.me", "dbug.djh@gmail.com"]

let wsConnections = []

dotenv.config();
app.use(express.json());

const memoryStore = new session.MemoryStore();
app.use(session({
    secret: process.env.SESSION_SECRET || 'some secret',
    resave: false,
    saveUninitialized: true,
    store: memoryStore
}));

// Initialize Keycloak
const keycloak = new KeycloakConnect({store:memoryStore}, {
    realm: process.env.KEYCLOAK_REALM || 'your-realm',
    'auth-server-url': process.env.KEYCLOAK_URL || 'http://localhost:8080/auth',
    'ssl-required': 'external',
    resource: process.env.KEYCLOAK_CLIENT_ID || 'your-client-id',
    'confidential-port': 0,
    'bearer-only': true
});

app.use(keycloak.middleware())

// Protect API routes
//app.use('/api/*', keycloak.protect());

function makeMediaFolders(email){
    const sanitizedEmail = email.replace(/[^\w.-]/g, '');
    const pathToMake = path.join(__dirname, 'frontend', 'public', 'media',sanitizedEmail)
    fs.mkdirSync(pathToMake, {recursive:true})
    fs.mkdirSync(path.join(pathToMake, 'images'))
    fs.mkdirSync(path.join(pathToMake, 'videos'))

}

app.get("/api/liveshare-url", (req,res)=>{
  authenticateToken(req,res,null, (err,user)=>{
    if(err){
      res.status(500).json({"error":err.toString()})
      return
    }
    if (!user){
      res.status(500).json("error")
      return
    }
    if(user.realm_access.roles.includes("Admin")){
      res.status(200).json({"url":`${fs.readFileSync(path.join(__dirname, "liveshare.txt"), "utf-8")}`})
      return
    }
    res.status(403).json("Unauthorized")
    return
  })
})

function readBlockList(){
  return JSON.parse(fs.readFileSync("blocklist.json", 'utf-8'));
}

/**
 * @typedef {Object} Message
 * @property {string} author
 * @property {string} authorIP
 * @property {string} content
 * @property {string} color
 * @property {string} altColor
 * @property {string} timestamp
 */


/**
 * @typedef {Object} Channel
 * @property {string} id
 * @property {string} name
 * @property {string[]} accessList
 * @property {Message[]} messages
 * @property {ws[]} wsConnections
 */


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const email = req.body.email
      const uploadPath = path.join(__dirname, 'frontend/public/media', email);
  
      // Check if the folder exists, if not, create it
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
  
      cb(null, uploadPath);  // Save to the 'uploads/something' directory
    },
    filename: function (req, file, cb) {
      cb(null, 'profile.png');  // Name the file 'file.png'
    }
  });
  
const upload = multer({ storage: storage });

function broadcastToClients(message, channelId){
    //console.log("Channel ID " + channelId)
    if (!channelId){
      for(connection of wsConnections){
        try{
        connection.ws.send(message)
        }catch{
          console.log("Websocket send error")
        }
      }
    }
    for (connection of wsConnections) {
      if (connection.cid == channelId){
        try{
        connection.ws.send(message);  // Access the 'ws' property of each connection
        }catch{
          console.log("websocket send error")
        }
    }
  }
}


function getUserByEmail(email) {
    const users = loadUserData()
    for (let user of users) {
        if (user.email === email) {
            return user;
        }
    }
    return null; // return null if no match is found
}

function addUserToChannelList(ws, user,uuid, channelId){
  console.log("adding USer to channel " +channelId)

  let index;
  for (wsConnection of wsConnections){
    if (wsConnection.ws.uuid == uuid){
      
      index = wsConnections.indexOf(wsConnection)
      wsConnection.user = user
      wsConnection.ws = ws
      wsConnection.cid = channelId
      wsConnections[index] = wsConnection
      return;
    }
  }
  
}

function getUserFromWs(wsConnection) {

    for (let connection of wsConnections) {
        if (connection.ws == wsConnection) {
            //console.log("found")
            return { user: connection.user, obj: connection }
        }
    }
    console.log("not found")
    return null;
}

// In-memory store (for demonstration purposes)

// Helper functions
const hashPassword = (password) => bcrypt.hashSync(password, 10);
const checkPassword = (storedPassword, providedPassword) => bcrypt.compareSync(providedPassword, storedPassword);
const generateToken = (userId) => jwt.sign({ userId }, process.env.SECRET_KEY, { expiresIn: process.env.JWT_EXPIRES_IN });


function readChannels(){
  return JSON.parse(fs.readFileSync("channels.json"))
}

/*
"author":"AuthorUSername",
"authorIP":"AuthorIP",
"content":"STUFF",
"color":"#FFFF",
"altColor":"#0000",
"timestamp":"000000"
*/

/** 
 * @returns {Channel}
 * 
*/

function getChannel(channelId){
  let channels = readChannels()
  for(let channel of channels){
    if (channel.id == channelId){
      return channel
    }
  }
  console.log("Not found, id=" + channelId)
  return null
}

function getChannelIdFromName(name){
  let channels = readChannels();
  channels.forEach(channel => {
    if (channel.name == name){
      return channel.cid;
    }
  });
  return null
}

function authenticateChannel(userEmail, channelId){
  let channel=getChannel(channelId)
  if (adminList.map(admin => admin.trim().toLowerCase()).includes(userEmail.trim().toLowerCase())){
    return true;
  }
  for (let user of channel.accessList){
    if (user == userEmail || user == "all"){
      return true;
    }

    
  }
  return false;
}




function saveChannels(channels){

  fs.writeFileSync("channels.json", JSON.stringify(channels, null, 2), 'utf-8')

}

function addChannel(channelName, accessList, ownerId){
  console.log("Hashing channelID")
  let channelID = bcrypt.hashSync(channelName, bcrypt.genSaltSync(10))
  console.log("channel id Hashed")
  accessList.push(ownerId)
  let channelToAdd = {
    "owner":ownerId,
    "id":channelID,
    "name":channelName,
    "accessList":accessList,
    "messages":[

    ]
  }
  let channels = readChannels()
  channels.push(channelToAdd)
  console.log("addig Channel")
  saveChannels(channels)
  return channelToAdd.id
}

const USER_DATA_FILE = path.join(__dirname, 'users.json');

const loadUserData = () => {
    return JSON.parse(fs.readFileSync(USER_DATA_FILE, 'utf-8'));
};

const authenticateToken = (req =null, res=null, token=null, next=function(err,user){}, ) => {
  try {
    // // Fetch the public keys
    // const { data } = await axios.get(
    //   'https://keycloak.mrpickle.ca/realms/mrpickle.ca/protocol/openid-connect/certs'
    // );

    // // Find the matching key using the "kid" field from the token header
    // const decodedHeader = jwt.decode(token, { complete: true });
    // const jwk = data.keys.find(key => key.kid === decodedHeader.header.kid);

    // if (!jwk) throw new Error('Key not found');

    // Construct the public key
    let publicKey = `-----BEGIN CERTIFICATE-----\nMIICpTCCAY0CBgGTble7OTANBgkqhkiG9w0BAQsFADAWMRQwEgYDVQQDDAttcnBpY2tsZS5jYTAeFw0yNDExMjcxNTU2MDNaFw0zNDExMjcxNTU3NDNaMBYxFDASBgNVBAMMC21ycGlja2xlLmNhMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAz2geUfaVXT+xEGolyaD6UuXDNQzO9z9MiDeh2ovElDY+ZlejKHxbtId3dardS+fDCGGpOtisnNWhaBw/K0hbFsp69+z87JnzAUEUpE2FSiU6GIbMSUVUZ341m4LforJeFzU7hqjCSEVgrv70+ZGK0K6snHPfkIR+Kd5sC40M57Ttk6mH9BvSQlW8LvSrJPbAYRUXtGSR7E0QxcMokjG7ry3FiK3RIpz+NV4baQWqNJoOngLUiFCQF2AKlA6bjZ/xxEbbHE0mEs0g7Tc8S5Mo2/KvXgODYkFRfJ/yTErqp+kKemanOMknsHkQ9hd7DzPJ/BgWeXft1XwxOA0ZWjNrOQIDAQABMA0GCSqGSIb3DQEBCwUAA4IBAQBjIbfqCkM2d0/BBn3JMk4neSE1sJC5/C6EjKIGDqRjiMOPbkVHlWDk3FetDcLBP620yyTKaa3dIheRZ8m2efkGtPznlGa22Z0SOZnv+sWvsvjfhelJe8X9j8cQJkyzzMSLxbSZFKD2SbsPysySgS6DSuC09RzogKGjSzWzrzCRTCURBD4y3DKU0e7B0XRaDNrr5om3maA+E6ufDO8gnyUjdDrVkGWuFZdHEVXqWweX4RysTipq0NbAKOBwlJ0cTyN4C6VGNQrsP+KrzNsMbVz1EiDp5gFSIud6n5ILGplZ1o0X4a4VlnDjyzyvvLmt0wgzPMNUC5HqPNrKAqStLhou\n-----END CERTIFICATE-----`;
    // Verify the token

    if (!token && !req){
      console.error("no token provided")
    }else if (!token){
      let authorizationHeader = req.headers['authorization']; // Get the header
      if (authorizationHeader) {
        token = authorizationHeader.split(' ')[1]; // Extract the token 
      }
    }


   //console.log("verifying token "+token)
    
    
    let payload = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
   //console.log('Token is valid:', payload);
    next(null,payload)
  } catch (err) {
    console.error('Token validation failed:', err);
    next(err,null)
  }
};

const saveUserData = (data) => {
    fs.writeFileSync(USER_DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
};


app.use(express.static("./frontend"))

app.post("/api/signup", (req,res)=>{
    let {username, email, password} = req.body
    let users = loadUserData()
    if (users.some(user=> user.email === email)){
        res.status(400).json({"error":"User Already Exists"})
        return;
    }
    decryptedPassword = decryptRSA(password, privateKey)
    const hashedPass = hashPassword(decryptedPassword)
    email = email.tolowerCase()
    users.push({
        username,
        email,
        passHash: hashedPass,
        active:{
            isActive:false,
            sessionToken:null
        }
    })
    saveUserData(users)
    res.status(201).json({"token": generateToken(email), "username":username})

})


// Make change password API hook
app.post("/api/chgPasswd", (req,res)=>{
  jwt.verify(req.headers['authorization'], process.env.SECRET_KEY, (user, error)=>{
    if (error){
      res.json({"error":error})
      return;
    }
    
    let localUser = getUserByEmail(user.userId)
    if (!checkPassword(localUser.passHash, req.body.password)){
      
    }

  })

})


app.post("/api/login", (req,res)=>{
    const {email, password} = req.body
    let users = loadUserData()
    let user = users.find(user => user.email.toLowerCase() === email);
    console.log("login Request for " + email)

    if (!user){
        res.status(400).json({"error":"Email Not Found"})
        console.log("failure\n reason: User Not Found")
        return
    }
    if (!password){
      res.status(400).json({"error":"No password, contact VolatileCobra77"})
      return
    }
    if (!checkPassword(user.passHash, decryptRSA(password, privateKey))){
        res.status(400).json({"error":"Invalid Credentials"})
        console.log("failure\n reason: Invalid Credentials")
        return
    }
    if (user.active.isActive || user.active.sessionToken){
        res.status(400).json({"error":"Session already active, please log out of all other sessions"})
        console.log("failure\n reason: User already Active")
        return
    }
    const token=generateToken(email)
    user.active = {
        isActive:true,
        sessionToken:token
    }
    const username = user.username
    res.json({username, token})

    //console.log(user)

})

app.post("/api/googleOauthReturn", (req,res)=>{
    
})

app.post("/api/channels/create", (req,res)=>{
  authenticateToken(req,res,null, (err, user)=>{
    if (err){
      res.status(500).json({"error":err})
      return;

    }
    if (!req.body.channelName && !req.body.accessList){
      res.status(400).json({"error":"ChannelName and AccessList must be specified"})
      return;
    }
    res.json({"message":"Successfully created channel","cid":addChannel(req.body.channelName, req.body.accessList, user.email)})

  })  
})
app.post("/api/channels/delete", (req,res)=>{
  authenticateToken(req,res,null,(err,user)=>{
    let channel = getChannel(getChannelIdFromName(req.channelName))
    if (!channel){
      return res.status(400).json({"error":"invalid channel name"})
    }
    if (!user || user.userId != channel.owner){
      return res.status(401).json("Unauthorized")
    }

    let channels = readChannels();
    channels.forEach(chan=>{
      if (chan == channel){
        channels[chan] = null
        return;
      }
    })
    saveChannels(channels)
    return res.status(201);
  })
})

app.post("/api/channels/changeAccess", (req,res)=>{
    authenticateToken(req,res,null,(err,user)=>{
      if (err){ res.status(500); return;}
      let channel = getChannel(req.body.cid)
      if (!user.userId == channel.owner){
        res.status(401)
      }
      if (req.body.type == 'add'){
        let channelIndex = readChannels().indexOf(channel)
        let channels = readChannels()
        channel.accessList += req.body.userEmail
        channels[channelIndex] = channel
        saveChannels(channels)
        res.status(201)
      }else if (req.body.type == 'rem'){
        let channelIndex = readChannels().indexOf(channel)
        let channels = readChannels()
        channel.accessList.filter((email => email != req.body.userEmail))
        channels[channelIndex] = channel
        saveChannels(channels)
      }

    })
})


app.get("/api/channels/list", (req,res)=>{
  authenticateToken(req,res,null,(err,user)=>{
    if (err){
      res.status(500).json({"error":err})
      return
    }
    let channels = readChannels()
    let accessable = []
    for (let channel of channels){
      if (channel.accessList.find(email => email == user.userId || email =='all') || adminList.map(admin => admin.trim().toLowerCase()).includes(user.userId.trim().toLowerCase()) || channel.ownerId == user.userId){
        accessable.push({"cid":channel.id, "name":channel.name})
      }
    }
    res.json(accessable)

  })
})

app.get("/api/encryption/publicKey", (req,res) =>{
  res.json({"publicKey": publicKey})

})

app.post("/api/channels/find", (req,res)=>{
  let channels = readChannels()
  for (let channel of channels){
      if (channel.id == req.body.cid || req.body.cname == channel.name){
        return res.json(channel)
      }
  }
  return res.status(404).json("Channel Not Found")
})

app.post('/api/profile/getPFP', (req, res) => {
    let email
    jwt.verify(req.body.token, process.env.SECRET_KEY, (err,user)=>{
        //console.log("things")
        if (err){
            //console.log("error!!!!")
            res.status(500)
            return;
        }
        //console.log(user)
        email = user.userId
    })

    console.log("looking for email " + email)
    // Ensure email is provided
    if (!email) {
        return res.status(400).json({ error: 'Token Is Required' });
    }

    // Sanitize email for directory lookup
    const sanitizedEmail = email.replace(/[^\w.-]/g, '');

    //console.log(sanitizedEmail)
    // Construct the folder path
    const folderPath = path.join(__dirname, 'frontend', 'public', 'media', sanitizedEmail);
    const profilePicPath = path.join(folderPath, 'profile.png');
    //console.log(profilePicPath)

    // Check if the folder and profile picture exist
    fs.stat(profilePicPath, (err, stats) => {
        if (err || !stats.isFile()) {
            //console.log("not found")
            // If profile picture not found, return the default profile picture
            const defaultPicPath = '/public/media/root/default_pfp.png';
            return res.json({ path: defaultPicPath });
        }
        //console.log("found")
        // Return the path to the found profile picture
        res.json({ path: `/public/media/${sanitizedEmail}/profile.png` });
    });
});


app.get("/api/tokenTester",(req,res)=>{
    authenticateToken(req,res,null, (err,user)=>{
        if(err){
            res.json({"authenticated":false})
            console.log("Token was Invalid")
            return
        }
        res.json({"authenticated":true})
        //console.log("authenticated user: "+user.userId)
    })
})

app.get("/api/theme/upload", (req,res)=>{
  let data = req.body
  if (!data, !data.themeName, !data.username, !data.primary, !data.secondary, !data.accent, !data.base100){
    res.status(400).json({"error":"Not all required fields are present"})
    return
  }
  let themeObject = {
    [`${data.username}-${data.themeName}`]: {
      "primary": data.primary,
      "secondary": data.secondary,
      "accent": data.accent,
      "neutral": data.neutral || "#374151",
      "base-100": data.base100,
      "base-200": data.base200,
      "base-300": data.base300,
      "base-content": data.baseContent,
      "info": data.info || "#3B82F6",
      "success": data.success || "#10B981",
      "warning": data.warning || "#F59E0B",
      "error": data.error || "#EF4444",
      "--rounded-box": data.roundedBox || "1rem",
      "--rounded-btn": data.roundedBtn || "0.5rem",
      "--rounded-badge": data.roundedBadge || "1.5rem",
      "--animation-btn": data.animationBtn ||"0.3s",
      "--animation-input": data.animationInput ||"0.25s",
      "--btn-text-case": data.btnTextCase || "normal",
      "--btn-focus-scale": data.btnFocusScale || "0.98",
      "--border-btn": data.borderBtn || "2px",
      "--tab-border": data.tabBorder || "2px",
      "--tab-radius": data.tabRad || "0.75rem"
    }
  }

})

app.listen(80, ()=>{
    console.log("Webserver is UP!")

})

// app.post('/api/chgPfp', upload.single('file'), (req, res) => {
    // console.log("changed PFP")
    // The file will be saved to the 'uploads/' directory
    // res.json({ message: 'File uploaded successfully', file: req.file });
  // });


const rateLimitInterval = 20000; // 2 seconds 
const maxMessages = 10
const server = new ws.Server({ port: 8080 });

app.get('/api/onlineUsers', (req,res)=>{
  returnJson = []
  if (req.query.channelId === undefined || req.query.channelId === null) {
    res.json({ "ERROR": "No Channel ID, use ?channelId=CHANNELID to specify" });
    return;
  }
  for (let user of wsConnections){
    if(!user){
      return res.json([{"username":"NO ONLINE USERS", "type":"online"}]);
    }
    if (user.cid == req.query.channelId.toString()){
      if (user.lastMessageTime + 180000 <= Date.now()){
        try{
          returnJson.push({username:user.user.username, type:"idle"})
          }catch (e){
          console.error(e)
          }
      }else{
        try{
          returnJson.push({username:user.user.username, type:"online"})
          }catch (e){
          console.error(e)
          }
      }
    }
    
  }
  res.json(returnJson)
})

// Add Keycloak token verification helper
async function verifyKeycloakToken(token) {
    try {
        const grantManager = keycloak.grantManager;
        const grant = await grantManager.createGrant({ access_token: token });
        const accessToken = grant.access_token;
        
        if (!accessToken.isExpired()) {
            return {
                valid: true,
                username: accessToken.content.preferred_username,
                email: accessToken.content.email
            };
        }
        return { valid: false };
    } catch (err) {
        console.error('Token verification failed:', err);
        return { valid: false };
    }
}

// Update WebSocket message handler
// Add Keycloak token verification helper
async function verifyKeycloakToken(token) {
    try {
        const grantManager = keycloak.grantManager;
        const grant = await grantManager.createGrant({ access_token: token });
        const accessToken = grant.access_token;
        
        if (!accessToken.isExpired()) {
            return {
                valid: true,
                username: accessToken.content.preferred_username,
                email: accessToken.content.email
            };
        }
        return { valid: false };
    } catch (err) {
        console.error('Token verification failed:', err);
        return { valid: false };
    }
}

async function updateUsersAndGroups(ws, messageJson, token) {
  usersJson = []
  if(messageJson.channelId === null || messageJson.channelId === undefined){
    console.log("no channel ID, exiting...")
    return;
  }
  for (let user of wsConnections){
    //console.log("found a user! ")
    //console.log(user.user)
    if (user.cid == messageJson.channelId.toString()){
      if (user.messageTimestamps[user.messageTimestamps.length - 1] + 180000 <= Date.now()){
        try{
          usersJson.push({username:user.user.username || "NO USERNAME", type:"idle"})
          }catch (e){
          console.error(e)
          }
      }else{
        try{
          usersJson.push({username:user.user.username || "NO USERNAME", type:"online"})
          }catch (e){
          console.error(e)
          }
      }
    }
    
  }
  
  if (!usersJson[0]){

    usersJson = [{"username":"NO ONLINE USERS", "type":"online"}]
  }
  //console.log("outputted user json: " + usersJson) 
  ws.send(JSON.stringify({
    "ip": "SERVER",
    "username": "SERVER",
    "color": "#00000",
    "altColor": "#fffff",
    "timestamp": Date.now(),
    "type": "userList",
    "content": usersJson
  }))
  let channels = readChannels()
  let accessable = []
  for (let channel of channels){
    if (channel.accessList.find(email => email == token.email || email =='all') || adminList.map(admin => admin.trim().toLowerCase()).includes(token.email.trim().toLowerCase()) || channel.ownerId == token.email){
      accessable.push({"cid":channel.id, "name":channel.name})
    }
  }
  ws.send(JSON.stringify({
    "ip": "SERVER",
    "username": "SERVER",
    "color": "#00000",
    "altColor": "#fffff",
    "timestamp": Date.now(),
    "type": "groupList",
    "content": accessable
  }))
}


// Update WebSocket message handler
server.on('connection', (ws, req) => {
    console.log('A new client connected!');
    ws.uuid = uuid.v4();
    ws.send(JSON.stringify({"uuid": ws.uuid}));
    wsConnections.push({ 
        "ws": {"uuid": ws.uuid},
        user: {"username": "UNDEFINED"}, 
        lastMessageTime: 0, 
        cid: null
    });

    ws.on('message', async (message) => {
        let messageJson;
        try {
            messageJson = JSON.parse(message);
        } catch (err) {
            console.log("Malformed JSON");
            ws.send(JSON.stringify({
                "ip": "SERVER",
                "username": "SERVER",
                "color": "#00000",
                "altColor": "#fffff",
                "timestamp": Date.now(),
                "type": "error",
                "content": "Malformed JSON"
            }));
            return;
        }

        // Validate required fields
        if (!messageJson.username || !messageJson.token || !messageJson.type) {
            console.log("invalid connection received");
            ws.send(JSON.stringify({
                "ip": "SERVER",
                "username": "SERVER",
                "color": "#00000",
                "altColor": "#fffff",
                "timestamp": Date.now(),
                "type": "error",
                "content": "Invalid Request"
            }));
            return;
        }

        // Get connection for rate limiting
        let wsConnection = wsConnections.find(conn => conn.ws.uuid === messageJson.uuid);
        let now = Date.now()
        try{
        if (!wsConnection.messageTimestamps) {
          wsConnection.messageTimestamps = [];
        }}catch{
          console.error("Could not set messageTimestamp property, forcibly closing")
          return;
        }
      
      // Remove timestamps older than the time window
      wsConnection.messageTimestamps = wsConnection.messageTimestamps.filter(
          timestamp => now - timestamp <= rateLimitInterval
      );
      
      // Check if the user exceeded the allowed number of messages
      if (wsConnection.messageTimestamps.length >= maxMessages && !["ping", "channelReq", "delMsg"].includes(messageJson.type)) {
          ws.send(JSON.stringify({
              "ip": "SERVER",
              "username": "SERVER",
              "color": "#00000",
              "altColor": "#fffff",
              "timestamp": now,
              "type": "error",
              "content": "You are sending messages too fast, please slow down."
          }));
          return;
      }
      
      // Add the current timestamp to the list
      wsConnection.messageTimestamps.push(now);

        // Verify token
        let tokenParsed = null
        authenticateToken(null,null, messageJson.token, (err,user)=>{
          if(!err){
            tokenParsed = user
          }else{
            console.error("Token not properly authenticated")
            return
          }
        });
        if (!tokenParsed) {
            ws.send(JSON.stringify({
                "ip": "SERVER",
                "username": "SERVER",
                "color": "#00000",
                "altColor": "#fffff",
                "timestamp": Date.now(),
                "type": "error",
                "content": "Invalid Token, please log in again"
            }));
            return;
        }
        updateUsersAndGroups(ws, messageJson, tokenParsed)
        // Username verification
        if (tokenParsed.preferred_username !== messageJson.username) {
            ws.send(JSON.stringify({
                "ip": "SERVER",
                "username": "SERVER",
                "color": "#00000",
                "altColor": "#fffff",
                "timestamp": Date.now(),
                "type": "error",
                "content": "Username mismatch"
            }));
            console.log(messageJson.username + " " + tokenParsed.preferred_username)
            return;
        }

        if(messageJson.type === "ping"){
          //console.log("ping")
          ws.send(JSON.stringify({
            "type":"ping",
            "timeDifference":Date.now() - messageJson.timestamp,
            "timestamp":Date.now()
          }))
          wsConnection.messageTimestamps.pop()
          return;
        }
        if(messageJson.type==="delMsg"){
          let channels= readChannels()
          
          let channel = channels.find(channel => channel.id == messageJson.channelId);
          channel.messages = channel.messages.filter(message => message.id != messageJson.content)
          console.log(channel.messages)
          saveChannels(channels)
          broadcastToClients(JSON.stringify({
            "ip": "SERVER",
            "username": "SERVER",
            "color": "#00000",
            "altColor": "#fffff",
            "timestamp": Date.now(),
            "type": "delMsg",
            "content":messageJson.content
        }), messageJson.channelId)
        }
        if(messageJson.type === "channelReq"){
          if(!messageJson.channelId){
            ws.send(JSON.stringify({
              "ip": "SERVER",
              "username": "SERVER",
              "color": "#00000",
              "altColor": "#fffff",
              "timestamp": Date.now(),
              "type": "error",
              "content": "No channel ID"
          }));
          return
          }
          if(!authenticateChannel(tokenParsed.email, messageJson.channelId)){
            return;
          }
          ws.send(JSON.stringify({
            "ip": "SERVER",
            "username": "SERVER",
            "color": "#00000",
            "altColor": "#fffff",
            "timestamp": Date.now(),
            "type": "messageList",
            "content": getChannel(messageJson.channelId).messages
        }));
        wsConnection.messageTimestamps.pop()
        }

        // Handle connection message
        if (messageJson.type === "connection") {
            console.log("NEW CONNECTION");
            if (!authenticateChannel(tokenParsed.email, messageJson.channelId)) {
                ws.send(JSON.stringify({
                    "ip": "SERVER",
                    "username": "SERVER",
                    "color": "#00000",
                    "altColor": "#fffff",
                    "timestamp": Date.now(),
                    "type": "error",
                    "content": `Unauthorized to Join Channel ${getChannel(messageJson.channelId).name}, Ask Owner for permission. <button class="btn btn-primary" onclick="joinChannel('0')"> Go Back </button>`
                }));
                return;
            }

            addUserToChannelList(ws, {username: messageJson.username}, messageJson.uuid, messageJson.channelId.toString());
            broadcastToClients(JSON.stringify({
                "ip": "SERVER",
                "username": "SERVER",
                "color": "#00000",
                "altColor": "#fffff",
                "timestamp": Date.now(),
                "type": "connection",
                "content": `${messageJson.username} connected from ${req.headers['x-forwarded-for'] || req.socket.remoteAddress} to channel ${getChannel(messageJson.channelId).name}`
            }), messageJson.channelId);
        } 
        // Handle message
        else if (messageJson.type === "message") {
            if (readBlockList().some(substring => messageJson.content.includes(substring))) {
                ws.send(JSON.stringify({
                    "ip": "SERVER",
                    "username": "SERVER",
                    "color": "#00000",
                    "altColor": "#fffff",
                    "timestamp": Date.now(),
                    "type": "error",
                    "content": "Message contains blocked content"
                }));
                return;
            }
            generateUniqueID(messageJson.content, messageJson.timestamp).then(messageId =>{
              broadcastToClients(JSON.stringify({
                "ip": req.headers['x-forwarded-for'] || req.socket.remoteAddress,
                "username": messageJson.username,
                "color": messageJson.color || "#00000",
                "altColor": messageJson.altColor || "#ffff",
                "timestamp": messageJson.date || Date.now(),
                "type": "message",
                "content": urlify(messageJson.content),
                "id":messageId
            }), messageJson.channelId);
            let channels= readChannels()
            let channel = channels.find(channel => channel.id == messageJson.channelId);
            channel.messages.push({
              "ip": req.headers['x-forwarded-for'] || req.socket.remoteAddress,
              "username": messageJson.username,
              "color": messageJson.color || "#00000",
              "altColor": messageJson.altColor || "#ffff",
              "timestamp": messageJson.date || Date.now(),
              "type": "message",
              "content": urlify(messageJson.content),
              "id":messageId
          })
            saveChannels(channels)
            })
            
        }
    });

  ws.on("close", () => {
    try {
      const { user, obj } = getUserFromWs(ws);
      if (!user) {
        console.error("A user disconnected but was not found in the user list. restart server.");
        return;
      }
      let oldWsConnections = wsConnections
      wsConnections = wsConnections.filter(item => item !== obj);
      console.log(oldWsConnections == wsConnections)
      console.log("removed User")
      broadcastToClients(JSON.stringify({
        "ip": "SERVER",
        "username": "SERVER",
        "color": "#00000",
        "altColor": "#fffff",
        "timestamp": Date.now(),
        "type": "disconnect",
        "content": `${user.username} disconnected`
      }), obj.cid);
    } catch (err) {
      console.error(err);
    }
  });
});
function urlify(text) {
  let urlRegex= /(([a-z]+:\/\/)?(([a-z0-9\-]+\.)+([a-z]{2}|aero|arpa|biz|com|coop|edu|gov|info|int|jobs|mil|museum|name|nato|net|org|pro|travel|local|internal))(:[0-9]{1,5})?(\/[a-z0-9_\-\.~]+)*(\/([a-z0-9_\-\.]*)(\?[a-z0-9+_\-\.%=&amp;]*)?)?(#[a-zA-Z0-9!$&'()*+.=-_~:@/?]*)?)(\s+|$)/gi

  return text.replace(urlRegex, function(url) {
    if (!url.startsWith("https://") || !url.startsWith("http://")){
      oldurl = url
      url = "https://" + url
    }
    return '<a class="text-secondary underline" target="_blank" href="' + url + '">' + oldurl + '</a>';
  })
  // or alternatively
  // return text.replace(urlRegex, '<a href="$1">$1</a>')
}
function generateUniqueID(message, timestamp) {
  // Combine the message and timestamp to create a unique input string
  const input = message + ":" + timestamp;

  // Use the SubtleCrypto API for hashing (SHA-256)
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(input))
      .then(hashBuffer => {
          // Convert the ArrayBuffer result to a hexadecimal string
          let hexString = '';
          const view = new DataView(hashBuffer);
          for (let i = 0; i < hashBuffer.byteLength; i++) {
              hexString += view.getUint8(i).toString(16).padStart(2, '0');
          }
          return hexString;
      });
}
