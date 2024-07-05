const socket = io();

socket.on('connect', () => {
    console.log(socket.id);
});

const startButton = document.getElementById('startButton');
const callButton = document.getElementById('callButton');
const hangupButton = document.getElementById('hangupButton');
callButton.disabled = true;
hangupButton.disabled = true;


const localVideo = document.getElementById('localVideo');

let localStream;
let pc;
const offerOptions = {
    offerToReceiveAudio: 1,
    offerToReceiveVideo: 1
};
let isOffering;
socket.on('offerer_was_decided', function(data) {
    isOffering = data['is_offering'];
});
socket.emit('user_joined', {});

const start = async function() {
    console.log('Requesting local stream');
    startButton.disabled = true;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({audio: true, video: true});
        console.log('Received local stream');
        localVideo.srcObject = stream;
        localStream = stream;
        callButton.disabled = false;
    } catch (e) {
        alert(`getUserMedia() error: ${e}`);
    }
    console.log('is_offering: ' + isOffering);
    const configuration = {};
    console.log('RTCPeerConnection configuration:', configuration);
    pc = new RTCPeerConnection(configuration);
    pc.addEventListener('icecandidate', e => onIceCandidate(pc, e));
    console.log('Created remote peer connection object pc');
    pc.addEventListener('track', gotRemoteStream);

    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
};

const call = async function() {
    callButton.disabled = true;
    hangupButton.disabled = false;
    console.log('Starting call');
    const videoTracks = localStream.getVideoTracks();
    const audioTracks = localStream.getAudioTracks();
    if (videoTracks.length > 0) {
        console.log(`Using video device: ${videoTracks[0].label}`);
    }
    if (audioTracks.length > 0) {
        console.log(`Using audio device: ${audioTracks[0].label}`);
    }
    console.log('Added local stream to pc');
    if (isOffering) {
        try {
            console.log('pc createOffer start');
            const offer = await pc.createOffer(offerOptions);
            await onCreateOfferSuccess(offer);
        } catch (e) {
            onCreateSessionDescriptionError(e);
        }
    }
};

function onCreateSessionDescriptionError(error) {
    console.log(`Failed to create session description: ${error}`);
}

async function setRemoteDescription(data) {
    desc = data['offer'];
    console.log('pc setRemoteDescription start');
    try {
        console.log(pc);
        await pc.setRemoteDescription(desc);
        onSetRemoteSuccess(pc);
    } catch (e) {
        onSetSessionDescriptionError(e);
    }
    createAnswer();
}

async function setRemoteDescriptionAnswer(data) {
    desc = data['answer'];
    console.log('pc setRemoteDescriptionAnswer start');
    try {
        await pc.setRemoteDescription(desc);
        onSetRemoteSuccess(pc);
    } catch (e) {
        onSetSessionDescriptionError();
    }
}

async function createAnswer() {
    console.log('pc createAnswer start');
    try {
        const answer = await pc.createAnswer();
        await onCreateAnswerSuccess(answer);
    } catch (e) {
        onCreateSessionDescriptionError(e);
    }
}

async function onCreateOfferSuccess(desc) {
    console.log(`Offer from pc\n${desc.sdp}`);
    console.log('pc setLocalDescription start');
    try {
        await pc.setLocalDescription(desc);
        onSetLocalSuccess(pc);
    } catch (e) {
        onSetSessionDescriptionError();
    }
    socket.emit('on_create_offer_success', {'offer': desc});
}

function onSetLocalSuccess(pc) {
    console.log(`pc setLocalDescription complete`);
}
  
function onSetRemoteSuccess(pc) {
    console.log(`pc setRemoteDescription complete`);
}
  
function onSetSessionDescriptionError(error) {
    console.log(`Failed to set session description: ${error}`);
}
  
function gotRemoteStream(e) {
    if (remoteVideo.srcObject !== e.streams[0]) {
        remoteVideo.srcObject = e.streams[0];
        console.log('pc received remote stream');
    }
}

async function onCreateAnswerSuccess(desc) {
    console.log(`Answer from pc:\n${desc.sdp}`);
    console.log('pc setLocalDescription start');
    try {
        await pc.setLocalDescription(desc);
        onSetLocalSuccess(pc);
    } catch (e) {
        onSetSessionDescriptionError(e);
    }
    socket.emit('on_answer_create_success', {'answer': desc})
}

async function sendIceCandidate(event) {
    console.log('sending ice candidate');
    socket.emit('on_ice_candidate', {'ice': event.candidate});
}

async function onRecievedIceCandidate(data) {
    console.log('recieved ice candidate');
    ice = data['ice'];
    await (pc.addIceCandidate(ice));
}

async function onIceCandidate(pc, event) {
    try {
        await (pc.addIceCandidate(event.candidate));
        onAddIceCandidateSuccess(pc);
    } catch (e) {
        onAddIceCandidateError(pc, e);
    }
    console.log(`pc ICE candidate:\n${event.candidate ? event.candidate.candidate : '(null)'}`);
    sendIceCandidate(event);
}
  
function onAddIceCandidateSuccess(pc) {
    console.log(`pc addIceCandidate success`);
}
  
function onAddIceCandidateError(pc, error) {
    console.log(`pc failed to add ICE Candidate: ${error}`);
}
  
function onIceStateChange(pc, event) {
    if (pc) {
        console.log(`pc ICE state: ${pc.iceConnectionState}`);
        console.log('ICE state change event: ', event);
    }
}

const hangup = async function() {
    console.log('Ending call');
    pc.close();
    pc = null;
    hangupButton.disabled = true;
    callButton.disabled = false;
};

socket.on('offer_recieved', function(data) {
    console.log('offer recieved');
    setRemoteDescription(data);
});
socket.on('answer_recieved', function(data) {
    console.log('answer recieved');
    setRemoteDescriptionAnswer(data);
});
socket.on('ice_candidate_recieved', function(data) {
    onRecievedIceCandidate(data);
});

startButton.addEventListener('click', start);
callButton.addEventListener('click', call);
hangupButton.addEventListener('click', hangup);