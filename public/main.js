// Initialize the variable to be used for the WebSocket. It gets declared here because it
// needs to be global rather than local to allow any existing connection to be closed if
// the user logs in again.
var ws;

// Reference elements of `index.html` that need to be accessed throughout this file.
var messageDiv = document.querySelector("#messages");
var errorMessageSpan = document.querySelector("#errorMessage");
var jToken = '';

// Take the entered username and password and attempt to authenticate them. If the
// response indicates an error, provide the error message.
const getJwtAuth = () => {
    var username = document.querySelector("#username").value;
    var password = document.querySelector("#password").value;

    fetch("http://localhost:3000/auth?username=" + username + "&password=" + password)
        .then(response => response.text())
        .then((response) => {
            const jResponse = JSON.parse(response);
            console.log('getJwtAuth()/response:', response);
            if (response.includes("Error")) {
                console.log('getJwtAuth()/response include Error');
                errorMessageSpan.innerHTML = response;
            } else {
                console.log('getJwtAuth()/response is OK');
                errorMessageSpan.innerHTML = "";
                openWsConnection(jResponse.token);
            }
        })
        .catch(err => console.log(err));
}

// Send the message entered by the user. First, however, ensure that the user is logged
// in and that the message field is not empty.
const sendWsMessage = () => {
    var messageContent = document.querySelector("#messageContent").value;
    var userId = document.querySelector("#userId").value;
    var destinationId = document.querySelector("#destinationId").value;
    var env = {
        msg: messageContent,
        userId: userId,
        destination: destinationId,
        jwtToken: jToken
    }

    if (ws) {
        if (messageContent != "") {
            ws.send(JSON.stringify(env));
        } else {
            errorMessageSpan.innerHTML = "Error: Message content cannot be empty."
        }
    } else {
        errorMessageSpan.innerHTML = "Error: You must log in to send a message."
    }
}

// Open the WebSocket connection using the JWT.
const openWsConnection = (jwtAuth) => {
    console.log("openWsConnection()/01");
    console.log("openWsConnection()/jwtAuth:", jwtAuth);
    jToken = jwtAuth;
    var userId = document.querySelector("#userId").value;
    var destinationId = document.querySelector("#destinationId").value;

    if (ws) {
        ws.close();
    }

    ws = new WebSocket("ws://localhost:3000/ws?token=" + jwtAuth);

    ws.onopen = (event) => {
        console.log("WebSocket connection established.");
        // onopen(), the destination is self (any message will be sent to the initiator)
        var env = {
            msg: "Welcome! user:" + userId,
            userId: userId,
            destination: userId,
            jwtToken: jToken
        }
        ws.send(JSON.stringify(env));
    }

    ws.onmessage = (event) => {
        console.log("WebSocket message received: ", event.data);
        if (event.data.includes("Error")) {
            console.log("Error received: ", event.data);
            errorMessageSpan.innerHTML = event.data;
        } else {
            console.log("Success: received: ", event.data);
            const data = JSON.parse(event.data);
            newMessageDiv = document.createElement("div");
            newMessageDiv.textContent = data.msg;
            messageDiv.appendChild(newMessageDiv);
        }
    }

    ws.onerror = (event) => {
        console.log("WebSocket error received: ", event);
    }

    ws.onclose = (event) => {
        console.log("WebSocket connection closed.");
    }
}
