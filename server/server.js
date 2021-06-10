// /****************************************************************
// 	*		 			  *  Signal Server   *		 			   *
//  ****************************************************************/

const WebSocketServer = require('ws').Server;

const SOCKET_STATE = {
    "SOCKET_CONNECTING":0,
    "SOCKET_OPEN": 1,
    "SOCKET_CLOSING": 2,
    "SOCKET_CLOSED": 3
}

//server initialization on port 7070
const wss = new WebSocketServer({port:7070});

//all connected ussers
const users = {};
const usersConnected = {};


//configurations RTC connection parametrs
const configRTC = {
    bundlePolicy: "max-bundle",
    iceServers: [
        {url:"stun:stun1.l.google.com:19302"
        },
      {
        url: "stun:stun.services.mozilla.com",
        username: "louis@mozilla.com",
        credential: "webrtcdemo"
      },
      {
        url: 'turn:numb.viagenie.ca',
        credential: 'muazkh',
        username: 'webrtc@live.com'
    }
    ]
  };

wss.broadcast = function broadcast(data){
    this.clients.forEach(function(user){
        user.send(data);
    });

}

let keepAlive = null;
const keepAliveInterval = 3000; 


console.log("server on");
wss.on('connection',function(connection){

    function ping(client){
        if(wss.readyState === SOCKET_STATE["SOCKET_OPEN"]){
            wss.send("__ping__");
        }else{
            console.log('Server - connection has been closed for client ' + client);
            removeUser(client);
        }
    }
    function removeUser(client){
        
        let found = false;
        if(users[connection.name]){
            delete users[connection.name];
            found = true
            console.log('Server - removing user: ' + client)
        }else{
            console.log("Can't delete user with this nickname because doesn't exist")
        }

        //send out the updated users list
        if (found) {
            onOnlineUserList()

        };

        return found;
    }

    function pong(client){
        console.log('Server - ' + client + ' is still active');
        clearTimeout(keepAlive);
        setTimeout(function(){
            ping(client);
        },keepAliveInterval);
    }


    let data;
    //WebSocket message receive handler
    connection.on('message',function(message){
     //   console.log('Got message from a user',message);


        //onJSON
        try{
            data = JSON.parse(message);
        }catch(e){
            console.error("Invalid JSON");
            data = {};
        }

        if(data.keepAlive !== undefined){
            pong(data.keepAlive.toLowerCase());
        }
        if(data.action === 'join'){
            console.log('Server - joining', obj);

            //start pinging to keep alive
            ping(data.name.toLocaleLowerCase());
            
            if( !users[data.name].toLowerCase()){
                users[data.name].toLowerCase() = 0;
            }
            onOnlineUserList()
            //console.log('Server - broadcasting user list', Object.keys(users));

        }

        // data case
        switch(data.type){
  
            case "login":                           //done,
                onLogin(data,connection);   
                break;
            case "reconnect":
                onReconnect(data,connection)       //done,
                break;
            case "callRequest":                    //done,
                onCallRequest(data,connection);
                break;
            case "callAnswer":                     //done,
                onCallAnswer(data,connection);
                break;
            case "readyState":                     //done,
                onReadystatechange(data,connection);        
                break;
            case "error":
                onError(data,connection);          //done
                break;    

            case "offer":                          // done,
                onOffer(data,connection);
                break;
            case "answer":                         // done,
                onAnswer(data,connection);
                break; 
            case "candidate":                      // done,
                onCandidate(data);
                break;

            case "hangUp":                         // done,
                onHangUp(data,connection);
                break;

            case "leave":                          // done,
                onLeave(data,connection);            
                break;

            case "availableUsers":             // done,
                onAvailableUsers(data,connection);
                break;     


            default:
                sendTo(connection,{
                    type:"error",
                    errorGrade: 2,
                    error: `Message no found  ${data.type}`
                });
                break;
        } 

    });

    connection.on("close",function(){  //do obczajenia
        if(connection.name){
            try{
                onConnectionLeave(connection.name,connection.otherName);
            }catch(e){
                console.log(e);
            }
            
            onOnlineUserList();
            // if(connection.otherName){
            //     console.log("Disconnecting from: ",connection.otherName);
            //     onLeave(data,connection);
            // }
        }
        console.log("on close");
        console.log("all logged users:",Object.keys(users));
    });
//connection.send("Hello from server");
});


function sendTo(connection,message){
    connection.send(JSON.stringify(message))
}

        //**************************//
        //*   onMessage function   *// 
        //**************************//
            
        //send to all connected user list
function onOnlineUserList(){
    console.log("send online user list to all ussers")
    console.log("all logged users:",Object.keys(usersConnected));
    wss.broadcast(JSON.stringify({
        type: "availableUsers",
        availableUsers: usersConnected
    }));
}
        //send to one user connected user list
function onAvailableUsers(data, connection){
    let connectionOffer = users[data.name];
    console.log("Sending ussers list to ",data.name);
    if(connectionOffer != null){

        connection.otherName = data.name;

        sendTo(connectionOffer,{
            type:"availableUsers",
            availableUsers: usersConnected
        });
    }
}
        //login request, adding new user to server
function onLogin(data,connection){
    console.log('User logged:',data.name);
    //if user already exist
    if(users[data.name]){
        sendTo(connection,{
            type: "login",
            success: false
        });
    }else{
        //adding new user to users list
        users[data.name] = connection;
        usersConnected[data.name] = null;
        //console.log(connection)
        connection.name = data.name;
        sendTo(connection,{
            type: "login",
            success: true,
            name: connection.name,
            config: configRTC
        });
        onOnlineUserList()
    }

    console.log("all logged users:",Object.keys(users));
};
        //recconect to server
function onReconnect(data,connection){
    if(users[data.name]){
        if(!(users[data.name] === connection)){
                users[data.name] = connection
                connection.name = data.name;
                console.log("reconnecting ",data.name);
                onOnlineUserList();
        }
    }else{
        users[data.name] = connection;
        //console.log(connection)
        connection.name = data.name;
        connection.otherName = data.otherName;
        onConnectionNew(connection.name,connection.otherName);
        onOnlineUserList()
        console.log("reconnecting ",data.name);
    }
}
        //offer to contact, sending offert and type of contact
function onCallRequest(data,connection){
    console.log("Call request from ",connection.name," to ",data.name,"request for: ",data.callType);
    let connectionOffer = users[data.name];
    if(connectionOffer != null ){
        sendTo(connectionOffer,{
            type: "callRequest",
            callType: data.callType,
            name: connection.name
        })
    }else{
        console.log("cand finde ",data.name," in users table");
    }
}
        //answer to contract: acceptance or rejection(Boolean)
function onCallAnswer(data,connection){
    let connectionOffer = users[data.name];
    if(connectionOffer != null){
        console.log("Answer:",data.answer," from: ",connection.name," to: ",data.name);
        sendTo(connectionOffer,{
            type: "callAnswer",
            answer: data.answer,
            name: connection.name
        })

    }else{
        console.log("cand finde ",data.name," in users table");
    }
}

function onReadystatechange(data,connection){
        // on Ready state , send when user are ready to start establishing peer conenction
        let connectionOffer = users[data.name];
        if(connectionOffer != null){
            sendTo(connectionOffer,{
                type:"readyState",
                name: connection.name,
                readyState: data.readyState
            });
        }
}


function onOffer(data,connection){
    //RTCPeerConnection offert, and adding new conection to table
    console.log("Sending offer to: ",data.name);
    let connectionOffer = users[data.name];

    if(connectionOffer != null){
        connection.otherName = data.name;
        onConnectionNew(connection.name,connection.otherName);
        sendTo(connectionOffer,{
            type:"offer",
            offer: data.offer,
            name: connection.name
        });
    }
};

function onAnswer(data,connection){
    //sending answer to rtc offert
    console.log("Sending answer to",data.name);
    let connectionAnswer = users[data.name];
    if(connectionAnswer != null){
        connection.otherName = data.name;
        sendTo(connectionAnswer,{
            type: "answer", 
            answer: data.answer
        });
    }
};

function onCandidate(data){
    console.log("Sending candidate to: ",data.name);
    let connectionCandidate = users[data.name];
    if(connectionCandidate != null){
        sendTo(connectionCandidate,{
            type:"candidate",
            candidate: data.candidate
        });
    }
};

function onHangUp(data,connection){
    try{
        console.log("User: ",connection.name," stop  connection: ",connection.otherName);
        let connectionHangUp = users[data.name];
        //we send to other user information that he can disconect from us 
        if(connectionHangUp != null){
            sendTo(connectionHangUp,{
                type: "hangUp"
            });
            onConnectionClose(connection.name,connection.otherName);
            connection.otherName = null;
        }
        
        
    }catch(e){
        console.log("onHangUp error, ",e);
    }


}

function onLeave(data,connection){
    try{
        console.log(`user ${connection.name} has disconnected`);
        //tell another user to hang up from leaved user
        onHangUp(data,connection);
        //delateign user from list
        onConnectionLeave(connection.name,data.name);

        connection.close();
        connection = null
    }catch(e){
        console.log("onLeave Error, ",e);
    }


}
function onError(data,connection){
    //Error handling
    console.log("Error at user",connection.name);
    let connectionOffer = users[data.name];

    if(connectionOffer != null){
        sendTo(connectionOffer,{
            type:"error",
            name: connection.name,
            error: data.error,
            errorGrade:data.errorGrade
        });
    }
}

function onConnectionNew(user1,user2){
    //at start call, adding connection information to table
    console.error(user1,user2);
    if(user2 === null || user2 === undefined){
        usersConnected[user1] = null;

    }else{
        usersConnected[user1] = user2;
        usersConnected[user2] = user1;
    }
    
}
function onConnectionClose(user1,user2){
    //on close call, change connection table for closed connection user for null
    console.error(user1,user2);
    usersConnected[user1] = null;
    if(!(user2 === null || user2 === undefined)){
        usersConnected[user2] = null;
    }
}
function onConnectionLeave(user1,user2){
    // on leave delate user from user and connection list
    console.error(user1,user2);
    delete users[user1];
    delete usersConnected[user1];
    console.log(usersConnected);
    if(!(user2 === null || user2 === undefined)){
        usersConnected[user2] = null;
    }

}