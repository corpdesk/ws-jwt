/**
 * Based on https://www.linode.com/docs/guides/authenticating-over-websockets-with-jwt/
 * By github.com/@georemo
 * 
 * 1. auth using jwt...DONE
 * 2. send to selected end user...DONE
 * 
 * TODO:
 * 1. test with rxjs/webSocket 
 * 2. transform the codes to typescript
 * 3. use redis for socket storage
 * 4. use mongo db for socket storage
 * 5. use mysql for socket storage
 */

// Import the packages the application uses.
const express = require('express');
const cors = require('cors')
const jwt = require('jsonwebtoken');
const WebSocket = require('ws');
const url = require('url');


// Initialize the Express JS application, and define the port number it uses.
const app = express();
const origin = [
    'http://localhost',
    'http://localhost:4200',
    // 'http://localhost:4401',
    // 'http://localhost:4500', // shell app
    // 'http://localhost:3000', // cd-api
]
app.use(cors({
    origin: origin,
    methods: ["GET", "POST"]
}));
const port = 3000;

// Define the secret to be used in the JWT signing algorithm.
const jwtSecret = "example-secret";

// Create an array with user login credentials and information.
// Typically, you would likely store this information in a database,
// and ideally the passwords would be stored encrypted.
const userCredentials = [{
        "username": "userA",
        "userId": 1010,
        "password": "example-password-userA",
        "userInfo": "I am userA.",
        "jtwToken": null
    },
    {
        "username": "userB",
        "userId": 1011,
        "password": "example-password-userB",
        "userInfo": "I am userB.",
        "jtwToken": null
    },
    {
        "username": "userC",
        "password": "example-password-userC",
        "userId": 1012,
        "userInfo": "I am userC.",
        "jtwToken": null
    }
];

// ** userID: wss
webSockets = []

// Have Express JS serve the static files in the `/public` directory.
app.use(express.static('public'));

// Create an endpoint for authentication.
app.get('/auth', (req, res) => {
    res.send(fetchUserToken(req));
});

// Check request credentials, and create a JWT if there is a match.
const fetchUserToken = (req) => {
    // console.log('fetchUserToken()/req.query.username:', req.query.username);
    // console.log('fetchUserToken()/req.query.password:', req.query.password);
    for (i = 0; i < userCredentials.length; i++) {
        if (userCredentials[i].username == req.query.username &&
            userCredentials[i].password == req.query.password) {
            const jToken = jwt.sign({
                    "sub": userCredentials[i].userId,
                    "username": req.query.username
                },
                jwtSecret, {
                    expiresIn: 900
                } // Expire the token after 15 minutes.
            );
            return {token: jToken}
        }
    }
    return "Error: No matching user credentials found.";
}

// Have Express JS begin listening for requests.
const expressServer = app.listen(port, () => {
    console.log("Express server listening at http://localhost:" + port);
})

// Define the WebSocket server. Here, the server mounts to the `/ws`
// route of the Express JS server.
const wss = new WebSocket.Server({
    server: expressServer,
    path: '/ws'
});

// Create an empty list that can be used to store WebSocket clients.
var socketsStore = [];

// Handle the WebSocket `connection` event. This checks the request URL
// for a JWT. If the JWT can be verified, the client's connection is added;
// otherwise, the connection is closed.
wss.on('connection', (ws, req) => {
    console.log("wss.on(connection)/01");
    var token = url.parse(req.url, true).query.token;
    console.log('token:', token);

    var wsUsername = "";


    // Handle the WebSocket `message` event. If any of the clients has a token
    // that is no longer valid, send an error message and close the client's
    // connection.
    ws.on('message', (data) => {
        console.log("wss.on(message)/01");
        data = JSON.parse(data);
        console.log("wss.on(message)/data:", data);
        saveSocket(data, ws);
        const senderSocket = destinationSocket(data.userId);
        token = data.jwtToken;
        console.log("wss.on(message)/token:", token);
        jwt.verify(token, jwtSecret, (err, decoded) => {
            console.log("wss.on(message)/02");
            if (err) {
                console.log('jwt.verify(token)/err:', err)

                if (senderSocket) {
                    senderSocket.send("Error: Your token is no longer valid. Please reauthenticate.");
                    senderSocket.close();
                } else {
                    console.log('senderSocket is invalid');
                }
            } else {
                console.log("wss.on(message)/03");
                const recepientSocket = destinationSocket(data.destination);
                if (recepientSocket) {
                    console.log("wss.on(message)/04");
                    console.log("wss.on(message)/data to send:", data);
                    recepientSocket.send(JSON.stringify(data));
                } else {
                    console.log('recepientSocket is invalid');
                }
            }
        });
    });
});

function clientHasSocket(userId) {
    return socketsStore.filter(s => s.userId === userId).length > 0;
}

// get destination socket based on the selected user;
function destinationSocket(userId) {
    const socketArr = socketsStore.filter(s => s.userId === userId).map(s => s.socket);
    if (socketArr.length > 0) {
        return socketArr[0];
    } else {
        return false;
    }
}

function saveSocket(data, ws) {
    if (!clientHasSocket(data.userId)) {
        const socketData = {
            socket: ws,
            userId: data.userId
        }
        socketsStore.push(socketData);
    } else {
        console.log('client socket exists!')
    }
}