/*
 *   HROS_JS.js
 *
 *   Author: Daniel Alner
 *
 */

var socket;
var connectionStatus = null;
var IsWalking = false;
var currentActionStatus;
var BatteryLevel;

/**********************************************************
*****               Constructor
**********************************************************/

var HROS_JS = function (opts) {
    opts = opts || {};
    this._addActionList = opts.actionList !== undefined ? opts.actionList : null;
    // set connection status to disconnected
    connectionStatus = HROS_JS.prototype.ConnectedStates.DISCONNECTED;
};

/**********************************************************
*****               "Global" Vars
**********************************************************/
// connection status
HROS_JS.prototype.ConnectionStatus = function() { return connectionStatus; };
// what the robot is doing now (currently only checks what status)
HROS_JS.prototype.CurrentActionStatus = function() { return currentActionStatus; };
// battery level
HROS_JS.prototype.BatteryLevel = function() { return BatteryLevel; };

HROS_JS.prototype.ActionStates = {
    ACTION  : 0, 
    WALKING : 1,
    NOTHING : 2
};
HROS_JS.prototype.ConnectedStates = {
    CONNECTED    : 0, 
    DISCONNECTED : 1, 
    CONNECTING   : 2,
    FAILED       : 3
};

/**********************************************************
*****               General/Options
**********************************************************/

// Throws No IP Address supplied, Could not connect
HROS_JS.prototype.Connect = function (ipAddress) {
    //need to check if jquery is loaded here. 
    connectionStatus = HROS_JS.prototype.ConnectedStates.CONNECTING;
    var socketConnection = document.createElement('script');
    var fullIP = "http://" + ipAddress + ":2114";
    // if fullIp is null, then assume local connection and connect directly to router
    // assuming base router ip address (this might need to be changed)
    if (fullIP === null)
        //fullIP = "http://192.168.42.1";
        throw "No IP Address supplied";
    socketConnection.type = 'text/javascript';
    socketConnection.src = fullIP + "/socket.io/socket.io.js";
    socketConnection.id = 'socketScript';
    socketConnection.async='async';

    // need to set this to another "thread" so we can wait for the connection to
    // server before triggering the io function
    var appendServer = setInterval(function(){
        if(!$("#socketScript").length)
            document.getElementsByTagName('head')[0].appendChild(socketConnection);
        clearInterval(appendServer);
    },100);
    // need to wait for the socket script to connect
    // but dont want to hold up main thread or UI
    // will attempt 10 times to connect with half a second
    // in between before cancelling attempt and stopping.
    var connectionAttempt = 0;
    var connectTh = setInterval(function(){
        sleep(500);
        try {
            socket = io(fullIP);
            clearInterval(connectTh);
            initSocket();
            connectionStatus = HROS_JS.prototype.ConnectedStates.CONNECTED;
            currentActionStatus = HROS_JS.prototype.ActionStates.NOTHING;
        }
        catch(Exception){
            console.log("Error connecting");
            connectionAttempt++;
            if(connectionAttempt > 10){
                clearInterval(connectTh);
                console.log("could not connect, max attempts attained");
                connectionStatus = HROS_JS.prototype.ConnectedStates.FAILED;
            }
            return;
        }
    },200);
};
HROS_JS.prototype.Initialize = function() {
    socket.emit('initialize');    
};
/**********************************************************
*****                   Actions
**********************************************************/
HROS_JS.prototype.PlayAction = function(actionName) {
    if (connectionStatus === HROS_JS.prototype.ConnectedStates.CONNECTED)
        socket.emit('action', actionName);
    // need to get feedback from when action is completed playing to update
    // action status properly
    // currentActionStatus = HROS_JS.prototype.currentActionStatus.ACTION;
};
/**********************************************************
*****                      Walk
**********************************************************/
HROS_JS.prototype.ToggleWalk = function () {
    // toggle walk 
    IsWalking = (!IsWalking);
    socket.emit('walktoggle', IsWalking);
    currentActionStatus = IsWalking ? HROS_JS.prototype.ActionStates.WALKING : HROS_JS.prototype.ActionStates.NOTHING;
};
HROS_JS.prototype.WalkPosition = function (x,y) {
    if(IsWalking){
        var walkCoords = {
                'x' : x,
                'y' : y
            };
        socket.emit('walking', walkCoords);
    }
};
/**********************************************************
*****                   Diagnostics
**********************************************************/
function initSocket(){
    socket.on('servovalues', function (servoValues) {
        // update UI
        console.log(servoValues );
    });
    socket.on('batterylevel', function (batteryLevel){
        // update UI
        // this needs to be a public var for retrevial.
        BatteryLevel = batteryLevel;
        console.log(batteryLevel);
    });
    HROS_JS.prototype.SayString("I'm awake, connected and ready to go");
}
/**********************************************************
*****           Heartbeat functions
**********************************************************/
// constantly check if connection has been lost or not
setInterval(function() {
    var connectivity;
    // dont want to overwrite a connecting or failed status
    if(connectionStatus === HROS_JS.prototype.ConnectedStates.CONNECTING ||
        connectionStatus === HROS_JS.prototype.ConnectedStates.FAILED)
        return;
    if(socket === undefined)
        connectionStatus = HROS_JS.prototype.ConnectedStates.DISCONNECTED;
    else if(socket.connected === false){
        connectionStatus = HROS_JS.prototype.ConnectedStates.DISCONNECTED;
        IsWalking = false;
        currentActionStatus = HROS_JS.prototype.ActionStates.NOTHING;
    }
    else if(socket.connected === true)
        connectionStatus = HROS_JS.prototype.ConnectedStates.CONNECTED;
}, 500);  // check the heartbeat every second (up for change), 
                // if no connection after sec then diconnect


/**********************************************************
*****               JS Functions
**********************************************************/
//disconnect on unload of page
window.onbeforeunload = function() {
    if(connectionStatus === HROS_JS.prototype.ConnectedStates.CONNECTED)
        socket.io.disconnect();
};
HROS_JS.prototype.destroy = function () {

};


/**************************************************
*****                 Speech                *******
/**************************************************/
HROS_JS.prototype.SayString = function(string) {
    socket.emit('speech', string);
};

/**************************************************
*****        Natural Language Processor     *******
/**************************************************/
HROS_JS.prototype.NaturalLangProc = function(string) {
    socket.emit('naturallangproc', string);
};

/**************************************************
*****                 Supporting functions *******
/**************************************************/
function sleep(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds){
      break;
    }
  }
}