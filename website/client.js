// /****************************************************************
// 	*		 			  *  Website Server   *		 			   *
//  ****************************************************************/

let connection;			// connection with websocket server
let connectionOff = true;
let nickname;			//Our nick name
let connectedUser = null;		//the user we contacted
let loginStatus = false;
let selectedUser = null;	//user selected address for establishing communication
let mediaStatus = [false, false]; // [audio, video]
let configRTC;
connectToServerAndHandlingEvent(); //conect to our Signal server


const constraintsAudio = {
	video: false,
	audio: {
		echoCancellation: true,
		noiseSuppression: true,
		volume: 1.0

	}
};
const constraintsVideo = {
	video: {
		width: {
			min: 320,
			max: 1280
		},
		height: {
			min: 240,
			max: 720
		},
		//facingMode: "user", 	//fron camera
		facingMode:  "environment"  
	},
	audio: {
		echoCancellation: true,
		noiseSuppression: true,
		volume: 1.0

	}
}
let pageLogin = document.querySelector("#loginPage");
let pageCall = document.querySelector("#callPage");
//hide call page
pageCall.style.display = "none";
//User Nickname input
let inputUsername = document.querySelector('#loginInput');
let buttonLogin = document.querySelector('#connectToServerBtn');

//eventhandler for Login button
buttonLogin.addEventListener("click", function () {
	console.log("login attempt");
	let nicknameCandidate = inputUsername.value;
	if (nicknameCandidate.length > 0) {
		if (connection) {
			send({
				type: "login",
				name: nicknameCandidate
			});
		} else {
			console.log("disconnected from server, trying reconect");
			connectToServerAndHandlingEvent();
		}
	}
});


// /*______________________________________________________*
// 	*				  *  Signal Server  *		 		   *
//  *~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
function connectToServerAndHandlingEvent() {
	// connection = new WebSocket('wss://webrtctest.poczta.onet.pl/ws/');
	connection = new WebSocket('ws://localhost:7070');
	//Connection open event handler
	connection.onopen = function () {
		if (loginStatus && connectionOff) {
			console.log("asking for reconect for: ",nickname);
			send({
				type: "reconnect",
				name: nickname,
				otherName: connectedUser
			});
		}
		// /*_____________________________________________________*
		// 	*  * Event Handler to receive messages from server *  *
		//  *~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
		connection.onmessage = function (message) {
			//console.log('Client - received socket message: ' + message.data.toString());

			if (message.data === '__ping__') {
				console.log("ping");
				ws.send(JSON.stringify({ keepAlive: name }));
			} else {
				let data;
				try {
					data = JSON.parse(message.data);
				} catch{
					console.log("filed to parse msg froms erver ");
				}

				switch (data.type) {
					case "login":   					//done 
						onLogin(data);
						break;
					case "availableUsers":				//done 
						onAvailableUsers(data.availableUsers);
						break;
					case "callRequest":					//done,
						onCallRequest(data.callType, data.name);
						break;
					case "callAnswer":					//done,
						onCallAnswer(data.answer, data.name);
						break;
					case "readyState":					// done,
						onReadyState(data.readyState);
						break;
					case "error":						//done.
						onError(data.error,data.errorGrade);
						break;
					case "offer": 						//done,
						onRTCOffer(data.offer);
						break;
					case "answer": 						//done,
						onRTCAnswer(data.answer);
						break;
					case "candidate": 					//done,
						onRTCCandidate(data.candidate);
						break;

					case "hangUp":						//do zrobienia
						onHangUp(0);
						break;


					default:
						console.log("unexpected message from server: ", data);
						break;

				}

			}

		}
	}
	connection.onerror = function (msg) {
		onError(`socket error: ${msg.toString()}`)
	}

	//on connection close 
	connection.onclose = function () {
		connectionOff = true;
		if (loginStatus) {
			connectToServerAndHandlingEvent();
			//connection.trigger("onopen_RECONNECT")
		} else {
			console.log("disconnect from signal server");
		}
	}
	// end of  handler
}
// /*__________________________________________________________*
// 	*  * Event Handler function for establishing connection *  *
//  *__________________________________________________________*/

function onLogin(data) {
	//on message from server for our login request
	if (data.success === false) {
		alert("Nickname already taken, try with different one:)");
	} else {
		nickname = data.name;
		loginStatus = true;
		connectionOff = false
		configRTC = data.config
		//display the call page if login is succesful
		pageLogin.style.display = "none";
		pageCall.style.display = "block";
	}
}

function onAvailableUsers(usersList){
	let userButonList = `<h4>${nickname} - you :D</h4>`;
	console.log("recived user list",usersList);
	for (User of Object.keys(usersList)){
		if (User === nickname){
			// we dont nead to add us :D
		}else if(usersList[User] === nickname){
			userButonList += `<button type="button" class="btn btn-primary" onClick="selectUser(event)" >${User}</button>`;
		}else if(usersList[User] === null){
			userButonList += `<button type="button" class="btn btn-success" onClick="selectUser(event)" >${User}</button>`;
		}else{
			userButonList += `<button type="button" class="btn btn-danger" onClick="selectUser(event)" >${User}</button>`;
		}

	}
	document.getElementById("userListBtn").innerHTML = userButonList;
}

	// /*__________________________________*
	// 	*  * connecting to other user   *  *
	//  *__________________________________*/

	//What type of connect we want to do 
let mediaSelectAudio = document.querySelector('#callTypeAudio');	//just audio
let mediaSelectVideo = document.querySelector('#callTypeVideo');	// audio & video
let mediaSelectChat = document.querySelector('#callTypeChat');		//just chat

	//What do we want to do,
let buttonCall = document.querySelector('#ConnectToOtherUsernameBtn');		//cal to selected user
let buttonhangUp = document.querySelector('#hangUpBtn');					//hang up from user during call(stop RTC Peer conenction, and media stream)
let buttonRefreshUserList = document.querySelector('#refreshUserListBtn');	//refresh users list
let buttonLogOut = document.querySelector('#logOutBtn');					//log out from service

//chatbox comment box and send button
let boxVideos = document.querySelector("#VideoBoxShowingPart");
let chatBox = document.querySelector('#chatBox');
let boxChat = document.querySelector('#chatBoxAll');
let inputComment = document.querySelector('#comment');
let buttonSendMessage = document.querySelector('#sendMessage');
function boxOnChat(){
	boxChat.style.display = "block";
	boxVideos.style.display = "none";
}
function boxOnVideo(){
	boxChat.style.display = "none";
	boxVideos.style.display = "block";
}
boxOnVideo();

function buttonsMediaSelectOFF(){
	mediaSelectAudio.disabled = true;
	mediaSelectVideo.disabled = true;
	mediaSelectChat.disabled = true;
}
function buttonsMediaSelectON(){
	mediaSelectChat.disabled = false;
	mediaSelectAudio.disabled = false;
	mediaSelectVideo.disabled = false;
}
function buttonsStandardOnLogin(){
	buttonCall.disabled = true;
	buttonhangUp.disabled = true;
	buttonLogOut.disabled = false;
	buttonRefreshUserList.disabled = false;
	buttonSendMessage.disabled = true;
}
function buttonsOnCalling(){
	buttonCall.disabled = false;
	buttonhangUp.disabled = true;
	buttonLogOut.disabled = false;
	buttonRefreshUserList.disabled = false;
	buttonSendMessage.disabled = true;

}
function buttonsDuringCall(){
	buttonCall.disabled = true;
	buttonhangUp.disabled = false;
	buttonLogOut.disabled = false;
	buttonRefreshUserList.disabled = false;
	buttonSendMessage.disabled = false;
}

buttonsMediaSelectOFF();
buttonsStandardOnLogin();

function selectUser(e) {
	//select user that we want to call 
	console.log("select", e.target.innerText);
	e.target.class = {};
	e.target.class = "btn btn-primary";
	selectedUser = e.target.innerText;
	buttonsMediaSelectON();
};
mediaSelectAudio.addEventListener("click",function(){
	mediaStatus = [true,false];
	buttonsMediaSelectOFF();
	buttonsOnCalling();

});
mediaSelectVideo.addEventListener("click",function(){
	mediaStatus = [true,true];
	buttonsMediaSelectOFF();
	buttonsOnCalling();
});
mediaSelectChat.addEventListener("click",function(){
	buttonsMediaSelectOFF();
	buttonsOnCalling();
})
buttonRefreshUserList.addEventListener('click',function(){
	send({
		type: "availableUsers"
	},nickname);
});

//PLASE FOR EVENT HANDLER FOR CHAT

//Call
buttonCall.addEventListener("click",function(){
	if(selectedUser){
		if(mediaStatus[1]){
			//video call
			send({
				type: "callRequest",
				callType: "video"
			},selectedUser);
		}else if(mediaStatus[0]){
			//audio call
			send({
				type: "callRequest",
				callType: "audio"
			},selectedUser);
		}else{
			//chat call
			send({
				type: "callRequest",
				callType: "chat"
			},selectedUser);
		}
	}
})

//video object
let videoUser = document.querySelector('#localVideo');
let videoRemote = document.querySelector('#remoteVideo');
let myVideoTrack;

let myConnection;					//RTCPeerConnection object 
let remoteReadyState = false;		// If other user are ready to start negociation process 
let myReadyState = false;			// am I ready  to start negociation process 


	//Start_WebRTC

function onCallRequest(callType, otherUser) {
	//on message with call request from other user, call type can take "audio" or "video"
	if(connectedUser === null){
		let acceptOffer = confirm(`User: ${otherUser} request ${callType} call ,do you want accept call ? Call`);
		if (acceptOffer) {
			connectedUser = otherUser;
			if(callType == "audio"){
				mediaStatus = [true,false];
				send({
					type: "callAnswer",
					answer: true
				});
				getRTCPeerConnection();
				getStreamOfMedia(0);
			}else if(callType == "video"){
				mediaStatus = [true,true];
				send({
					type: "callAnswer",
					answer: true
				});
				getRTCPeerConnection();
				getStreamOfMedia(0);
			}else if(callType == "chat"){
				getRTCPeerConnection();
				onChatRequest();
				send({
					type: "callAnswer",
					answer: true
				});
			}else{
				console.log("Call type not supoerted");
			}


		} else {
			send({
				type: "callAnswer",
				answer: false
			}, otherUser)
		}
	}else{
		let acceptOffer = confirm(`You are in the middle of  call . Do you want stop yourcall and accept : ${otherUser} reuest for ${callType} call ?`);
		if (acceptOffer) {
			onHangUp();
			connectedUser = otherUser;
			if(callType == "audio"){
				mediaStatus = [true,false];
				send({
					type: "callAnswer",
					answer: true
				});
				getRTCPeerConnection();
				getStreamOfMedia(0);
			}else if(callType == "video"){
				mediaStatus = [true,true];
				send({
					type: "callAnswer",
					answer: true
				});
				getRTCPeerConnection();
				getStreamOfMedia(0);
			}else if(callType == "chat"){
				getRTCPeerConnection();
				onChatRequest();
				send({
					type: "callAnswer",
					answer: true
				});
			}else{
				console.log("Call type not supoerted");
			}

		}
	}
}

function onCallAnswer(answer, otherUser) {
	if (answer) {
		connectedUser = otherUser;
		console.log("Your call was accepeted")
		console.log("answer:",answer);
		getRTCPeerConnection();
		if(mediaStatus[1] || mediaStatus[0]){
			getStreamOfMedia(1);
		}else{
			onChatRequest();
			onRTCCreateOffer();
		}
		
	} else {
		alert("Your call was rejected");
	}
}
function onReadyState(readyState){
	remoteReadyState = readyState;
	if(myReadyState){ 
		onRTCCreateOffer();
	}
		
}


				// /*________________________________*
				// 	*        * Media Stream*        *
				//  *_______________________________*/

function getStreamOfMedia(momentOfCall){
	//media stream initialization
	//momentOfCall
	// 0 - during onCallRequest function
	// 1 - during onCallAnswer function
	boxOnVideo();
	let constraints;
	if(mediaStatus[1] && mediaStatus[0]){
		constraints = constraintsVideo;
	}else if(mediaStatus[0]){
		constraints = constraintsAudio;
	}else{
		console.log("mediaStatus[false,false]");
	}
	if(hasUserMedia() && constraints){
		navigator.mediaDevices.getUserMedia(constraints).then(myStream =>{
			videoUser.srcObject = myStream;
			myConnection.addStream(myStream);
			myVideoTrack = myStream.getTracks();

			onError("my video track",13);
			onError(myVideoTrack,13);
			if(momentOfCall === 0 ){
				send({
					type:"readyState",
                	readyState: true
				})
				myReadyState = true;
			}else if(momentOfCall === 1){
				if(remoteReadyState === true){
					onRTCCreateOffer();
				}
				myReadyState = true;
			}
			buttonsDuringCall();

		}).catch(error =>{
			onError(`Error with getUserMedia:${error}`,10);
		})

	}else{
		onError(`Media error, Not Supported for ${nickname}`,10);

	}
}


				// /*_________________________________________*
				// 	*  * Peer 2 Peer connect negotiation   *  *
				//  *_________________________________________*/

function getRTCPeerConnection(){
	//creating RTCPeerConnection object and event handler on ice candidate, and track 
	if(configRTC){
		myConnection = new RTCPeerConnection(configRTC);
		onError(`myConnection(new) :`,13);
		onError(myConnection,13);
		//when a remoteuser adds streamto peer connection , we display it
		myConnection.ontrack = function (event) {
			videoRemote.srcObject = event.streams[0];
			onError("onTrack",13);
			onError(event,13);
			}

		//set ice handling
		//when browser finde an ice candidate we send it to another peer
		myConnection.onicecandidate = function (event) {
		if (event.candidate) {
			onError(`onIceCandidate(event and event.candidate) :`,13) 
			onError(event,13);
			onError(event.candidate,14);
			send({
			type: "candidate",
			candidate: event.candidate
			});
		}
		};
		myConnection.ondatachannel = function(event){
			console.log("data chanel ready");
			onError(`onDataChanel  event and event.chanel :`,13);
			onError(event,13);
			onError(event.channel,13);
			dataChanelChat = event.channel;
			onChatRequest(false);

		}
	}else{
		onError(`NUll configuration for RTCPeerConnection`,10);
	}
}

function onRTCCreateOffer(){
	//createing Offert for Peer 2 Peer Connection
	myConnection.createOffer(function(offer){
		onError(`createOffer :`,13);
		onError(offer,13);
		send({
            type: "offer",
            offer: offer,
          });
		myConnection.setLocalDescription(offer);
	}, function (error) {
		onError(`Error cant create offert`,10);
		onError(error,10);

	});
}

function onRTCOffer(offer){
	//adding another pc ofert( SDP information about connection device etc.) to our RTC object
	myConnection.setRemoteDescription(new RTCSessionDescription(offer));
	onError(`setRemoteDescription(open when we recive offert) :`,13);
	onError(offer,13);
	onError(`myConnection(with remote Description onOffer) :`,13);
	onError(myConnection,13);
	//create answer 
	myConnection.createAnswer(function (answer) {
	myConnection.setLocalDescription(answer);
	onError(`createAnser answer : ${answer}`,13);
	onError(`myConnection(with local Description ) :`,13);
	onError(myConnection,13);
	send({
		type: "answer",
		answer: answer
	});
	}, function (error) {
	onError(`onRTCOffer error with creating answer`,10);
	onError(error,10);
	});
}

function onRTCAnswer(answer){
	try{
		myConnection.setRemoteDescription(new RTCSessionDescription(answer));
		onError(`myConnection(with remote Description onAnswer) :`,13);
		onError(myConnection,13);
	}catch(e){
		onError(`onRTCAnswer error`,10);
		onError(e,10);
	}
	
}

function onRTCCandidate(candidate) {
	//when we get icecandidate from another user
	try{
	  myConnection.addIceCandidate(new RTCIceCandidate(candidate));

	}catch(e){
		console.log(e);
	}
  }

  
		// /*____________________________*
		// 	*  		*  Chat	 *  		 *
		//  *____________________________*/


let dataChanelChat; 


//eventhandler for Login button
buttonSendMessage.addEventListener("click", function () {
	console.log("Send Message");
	let messagedata = inputComment.value;

	
	console.log(dataChanelChat.readyState );
	if (dataChanelChat.readyState == "open"){
		onError("dataChanel open",12);
		if (messagedata.length > 2) {
			if (dataChanelChat) {
				let message = {
					nickname: nickname,
					text: messagedata
				};
				chatBox.innerHTML += "<b><span>"+message.nickname + ": </span></b>" + message.text + "<br/>";
				dataChanelChat.send(JSON.stringify(message));
				inputComment.value = "";
	
			} else {
				onError("disconnected from datachanel",12);
				
			}
		}else{
			alert("Your message is to short ");
		}

		
	}else{
		onError("datachanel not open");
	}


});

function onChatRequest(CreateChanel = true){
	if(CreateChanel){
	dataChanelChat = myConnection.createDataChannel(`Chanel_1`,{});
	}
	boxOnChat();
	
	dataChanelChat.onopen = function(){
		buttonsDuringCall();
	}
	dataChanelChat.onmessage = function(dataRecaived){
		let data = JSON.parse(dataRecaived.data);
		console.log(data);
		chatBox.innerHTML += "<b>"+data.nickname + ": </b>" + data.text + "<br/>";
	}
	dataChanelChat.onerror = function(error){
		onError(error);
	}
	dataChanelChat.onclose = function(){
		onError("your conenction wa close ",12);
	}

}



		// /*____________________________*
		// 	*  *  onHangUp, onLeave   *  *
		//  *____________________________*/

function onHangUp(type = 1){
	//Hang Up conenction with other user, tunr off media and dissconect from P2P
	//type 1 normal usage only Hang up
	try{

	turnOfMedia();
	if(myConnection){
		myConnection.close();
	}
	if(type === 1){
		send({
			type: "hangUp"
		})
	}

	myConnection = null;
	remoteReadyState = false;
	myReadyState = false;
	connectedUser = null;	
	buttonsStandardOnLogin();
	console.log("Hang Up conversation");
	}catch(e){
		onError(`onHangUp error, ${e}`,11);
	}
}

function onLeave(){
	// on leaving server, hang Up + close connection with websocket
	try{
		onHangUp();		
		send({
		type: "leave"
		})
		connectionOff = true;
		nickname = null;		
		loginStatus = false;
		connection.close();
		connection = null;			
		
		pageCall.style.display = "none";
		pageLogin.style.display = "block";
	}catch(e){
		onError(`onLeave error, ${e}`,11);
	}
	
}

buttonhangUp.addEventListener('click',function(){
	onHangUp();
});
buttonLogOut.addEventListener('click',function(){
	onLeave();
});

function onError(error,errorGrade = 11)
{
	  //errorGrade:  
// 0   -  fatal server error, close app
// 1   -  fatal other user error, cant get acces to media close conenction , disconenct from other usser
// 2   -  undefine message send to server
// 10  -  fatal my error, cant make  connection send to other user info
// 11  -  local error
// 12  =  local logs 
// 13  =  info log 

	if(errorGrade === 10){
		console.log(error);
		send({
			type: "error",
			error: `User ${nickname} that you trying to connect receive error ${error}` ,
			errorGrade: 1 
		});
	}else if(errorGrade === 11){
		console.error(error);
	}else if(errorGrade ===12){
		console.log(error);
	}else if(errorGrade === 13){
		console.log(error);
	}else if(errorGrade === 14){
		console.log('%c ICe Candidate ','color: white; background-color: #2274A5',error);
	}else if(errorGrade === 2){
		console.log(error);
	}else if(errorGrade === 1){
		console.error(error);
		onHangUp();
	}else if(errorGrade === 0){
		console.error(error);
		onLeave();
	}else{
		console.error("unexpected error State");
	}

}

function send(message, name = null) {
	//attach the other peer username to our messages 
	try{
	
		if (connectedUser) {
			message.name = connectedUser;
		}
		if (name) {
			message.name = name;
		}
		
		//console.log("send",connection,message);
		//console.log("send", message);
		connection.send(JSON.stringify(message));
	}catch(e){
		onError(`Error with send ${e}`,11);
	}
	
};

function hasUserMedia() {
	return !!(navigator.mediaDevices.getUserMedia);
  };	

  function turnOfMedia(){
	if(mediaStatus[0] || mediaStatus[1]){
		if(myVideoTrack){
			try{		
				mediaStatus[0] = false;
				mediaStatus[1] = false;
				myVideoTrack.forEach(track => {
				track.stop();  
				console.log("turn off media");
				  });
				  videoUser.srcObject = null;
				  videoRemote.srcObject = null;
			}catch(e){
				onError(`Can not close media streaming ${e}`,11);
			}
		}

		
	  }
}
  

