const express = require("express");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const multer = require('multer');
const ws = require("ws");
const fs = require('fs');
const path = require('path');
const os = require('os')


const app = express();

let clients = []
let blocklist = ['onclick=', '<iframe']

dotenv.config();
app.use(express.json());

function makeMediaFolders(email){
    const sanitizedEmail = email.replace(/[^\w.-]/g, '');
    const pathToMake = path.join(__dirname, 'Frontend', 'public', 'media',sanitizedEmail)
    fs.mkdirSync(pathToMake, {recursive:true})
    fs.mkdirSync(path.join(pathToMake, 'images'))
    fs.mkdirSync(path.join(pathToMake, 'videos'))

}
let wsConnections = []

function readBlockList(){
  return JSON.parse(fs.readFileSync("blocklist.json", 'utf-8'));
}


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const email = req.body.email
      const uploadPath = path.join(__dirname, 'Frontend/public/media', email);
  
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

function broadcastToClients(message){
    for (let connection of wsConnections) {
        connection.ws.send(message);  // Access the 'ws' property of each connection
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

function getUserFromWs(wsConnection) {
    for (let connection of wsConnections) {
        if (connection.ws === wsConnection) {
            return { user: connection.user, obj: connection }
        }
    }
    return null;
}

// In-memory store (for demonstration purposes)

// Helper functions
const hashPassword = (password) => bcrypt.hashSync(password, 10);
const checkPassword = (storedPassword, providedPassword) => bcrypt.compareSync(providedPassword, storedPassword);
const generateToken = (userId) => jwt.sign({ userId }, process.env.SECRET_KEY, { expiresIn: process.env.JWT_EXPIRES_IN });



const USER_DATA_FILE = path.join(__dirname, 'users.json');

const loadUserData = () => {
    return JSON.parse(fs.readFileSync(USER_DATA_FILE, 'utf-8'));
};

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    console.log("authenticating token: " + token)
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
        if (err) {next(err,null);return;}
        req.user = user;
        next(err,user);
    });
};

const saveUserData = (data) => {
    fs.writeFileSync(USER_DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
};


app.use(express.static("./Frontend"))

app.post("/api/signup", (req,res)=>{
    const {username, email, password} = req.body
    let users = loadUserData()
    if (users.some(user=> user.email === email)){
        res.status(400).json({"error":"User Already Exists"})
        return;
    }

    const hashedPass = hashPassword(password)
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

app.post("/api/login", (req,res)=>{
    const {email, password} = req.body
    let users = loadUserData()
    let user = users.find(user => user.email === email);
    console.log("login Request for " + email)

    if (!user){
        res.status(400).json({"error":"Email Not Found"})
        console.log("failure\n reason: User Not Found")
        return
    }
    if (!checkPassword(user.passHash, password)){
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
    const folderPath = path.join(__dirname, 'Frontend', 'public', 'media', sanitizedEmail);
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
    authenticateToken(req,res,(err,user)=>{
        if(err){
            res.json({"authenticated":false})
            console.log("Token was Invalid yes")
            return
        }
        res.json({"authenticated":true})
        console.log("authenticated user: "+user.userId)
    })
})


app.listen(80, ()=>{
    console.log("Webserver is UP!")

})

app.post('/api/chgPfp', upload.single('file'), (req, res) => {
    console.log("changed PFP")
    // The file will be saved to the 'uploads/' directory
    res.json({ message: 'File uploaded successfully', file: req.file });
  });


const rateLimitInterval = 2000; // 2 seconds 
const server = new ws.Server({ port: 8080 });

app.get('/api/onlineUsers', (req,res)=>{
  returnJson = []
  for (user of wsConnections){
    //console.log("processing user: " +user.user.username)
    if (user.lastMessageTime + 180000 <= Date.now()){
      returnJson.push({username:user.user.username, type:"idle"})
    }else{
      returnJson.push({username:user.user.username, type:"online"})
    }
  }
  res.json(returnJson)
})


server.on('connection', (ws, req) => {
  console.log('A new client connected!');

  wsConnections.push({ ws, lastMessageTime: 0 }); // Initialize with a default timestamp of 0
  
  // Respond to messages received from the client
  ws.on('message', (message) => {
    //console.log(`Received message: ${message}`);
    
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
    
    if (!messageJson.username && !messageJson.token && !messageJson.type && !messageJson.content) {
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

    // Get the connection object to track rate limiting
    const wsConnection = wsConnections.find(conn => conn.ws === ws);
    if (!wsConnection) return;

    const now = Date.now();

    // Rate-limiting check
    if (now - wsConnection.lastMessageTime < rateLimitInterval) {
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

    // Update the last message time after passing the rate-limit check
    wsConnection.lastMessageTime = now;

    jwt.verify(messageJson.token, process.env.SECRET_KEY, (err, jwtUser) => {
      if (err) {
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

      let user = getUserByEmail(jwtUser.userId);
      if (!user) {
        ws.send(JSON.stringify({
          "ip": "SERVER",
          "username": "SERVER",
          "color": "#00000",
          "altColor": "#fffff",
          "timestamp": Date.now(),
          "type": "internal-error",
          "content": "Unable to find user"
        }));
        return;
      }

      if (user.username !== messageJson.username) {
        ws.send(JSON.stringify({
          "ip": "SERVER",
          "username": "SERVER",
          "color": "#00000",
          "altColor": "#fffff",
          "timestamp": Date.now(),
          "type": "error",
          "content": "Usernames do not match"
        }));
        return;
      }

      if (messageJson.type === "connection") {
        broadcastToClients(JSON.stringify({
          "ip": "SERVER",
          "username": "SERVER",
          "color": "#00000",
          "altColor": "#fffff",
          "timestamp": Date.now(),
          "type": "connection",
          "content": `${user.username} connected from ${ws._socket.remoteAddress}`
        }));
        let index = wsConnections.indexOf(wsConnection)
        wsConnection.user = user
        wsConnections[index] = wsConnection
      } else if (messageJson.type === "message") {
        if(readBlockList().some(substring => messageJson.content.includes(substring))){
          ws.send(JSON.stringify({
            "ip": "SERVER",
            "username": "SERVER",
            "color": "#00000",
            "altColor": "#fffff",
            "timestamp": Date.now(),
            "type": "error",
            "content": `fuck you`
          }))
          return;
        }
        broadcastToClients(JSON.stringify({
          "ip": ws._socket.remoteAddress,
          "username": user.username,
          "color": messageJson.color || "#00000",
          "altColor": messageJson.altColor || "#ffff",
          "timestamp": messageJson.date || Date.now(),
          "type": "message",
          "content": messageJson.content
        }));
      } else {
        ws.send(JSON.stringify({
          "ip": "SERVER",
          "username": "SERVER",
          "color": "#00000",
          "altColor": "#fffff",
          "timestamp": Date.now(),
          "type": "error",
          "content": "Message type invalid"
        }));
      }
    });
  });

  ws.on("close", () => {
    try {
      const { user, obj } = getUserFromWs(ws);
      if (!user) {
        console.error("A user disconnected but was not found in the user list. restart server.");
        return;
      }
      wsConnections = wsConnections.filter(item => item.ws !== ws);
      broadcastToClients(JSON.stringify({
        "ip": "SERVER",
        "username": "SERVER",
        "color": "#00000",
        "altColor": "#fffff",
        "timestamp": Date.now(),
        "type": "disconnect",
        "content": `${user.username} disconnected`
      }));
    } catch (err) {
      console.error(err);
    }
  });

  // Send a message to the client once they connect
});
