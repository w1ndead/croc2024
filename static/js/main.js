const socket = io();

socket.on('connect', () => {
    console.log('socket.id: ' + socket.id);
});

const startButton = document.getElementById('startButton');
const callButton = document.getElementById('callButton');
const hangupButton = document.getElementById('hangupButton');
callButton.disabled = true;
hangupButton.disabled = true;


const localVideo = document.getElementById('localVideo');

let iceCandidatesSent = {};
let iceCandidatesRecieved = {};
let localStream;
let pcs = [];
let iceCandidatesWaiting = {};
const offerOptions = {
    offerToReceiveAudio: 1,
    offerToReceiveVideo: 1
};
socket.emit('user_joined', {});

const start = async function() {
    console.log('Requesting local stream');
    startButton.disabled = true;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({audio: false, video: true});
        // const stream = await navigator.mediaDevices.getUserMedia({audio: true, video: true});
        console.log('Received local stream');
        localVideo.srcObject = stream;
        localStream = stream;
        callButton.disabled = false;
    } catch (e) {
        alert(`getUserMedia() error: ${e}`);
    }
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
    let remoteVideos = document.getElementsByClassName('remoteVideo');
    for (let el of remoteVideos) {
        if (socket.id < el.getAttribute('sid')) { continue; }
        try {
            let pc = pcs[el.getAttribute('pc_index').toString()];
            console.log('pc createOffer start for ' + el.getAttribute('sid'));
            const offer = await pc.createOffer(offerOptions);
            await onCreateOfferSuccess(offer, el.getAttribute('sid'));
        } catch (e) {
            onCreateSessionDescriptionError(e);
        }
    }
};

function onCreateSessionDescriptionError(error) {
    console.log(`Failed to create session description: ${error}`);
}

async function setRemoteDescription(data) {
    let desc = data['offer'];
    let sender_sid = data['sender_sid'];
    console.log('pc setRemoteDescription start');
    let sender_video = document.querySelector(`[class="remoteVideo"][sid="${sender_sid}"]`)
    let pc = pcs[parseInt(sender_video.getAttribute('pc_index'))];
    try {
        await pc.setRemoteDescription(desc);
        onSetRemoteSuccess();
    } catch (e) {
        onSetSessionDescriptionError(e);
    }
    createAnswer(sender_sid);
    sendWaitingIceCandidates(pc, sender_sid);
}

async function setRemoteDescriptionAnswer(data) {
    let desc = data['answer'];
    let sender_sid = data['sender_sid'];
    console.log('pc setRemoteDescriptionAnswer start');
    let sender_video = document.querySelector(`[class="remoteVideo"][sid="${sender_sid}"]`)
    let pc = pcs[parseInt(sender_video.getAttribute('pc_index'))];
    try {
        await pc.setRemoteDescription(desc);
        onSetRemoteSuccessAnswer(pc);
    } catch (e) {
        onSetSessionDescriptionError();
    }
    sendWaitingIceCandidates(pc, sender_sid);
}

async function createAnswer(sender_sid) {
    console.log('pc createAnswer start');
    let el = document.querySelector(`[class="remoteVideo"][sid="${sender_sid}"]`);
    let pc = pcs[el.getAttribute('pc_index').toString()];
    try {
        const answer = await pc.createAnswer();
        await onCreateAnswerSuccess(answer, sender_sid);
    } catch (e) {
        onCreateSessionDescriptionError(e);
    }
}

async function onCreateOfferSuccess(desc, recipient_sid) {
    console.log(`Offer from pc\n${desc.sdp}`);
    console.log('pc setLocalDescription start');
    console.log(recipient_sid);
    let el = document.querySelector(`[class="remoteVideo"][sid="${recipient_sid}"]`);
    let pc = pcs[el.getAttribute('pc_index').toString()];
    try {
        await pc.setLocalDescription(desc);
        onSetLocalSuccess();
    } catch (e) {
        onSetSessionDescriptionError();
    }
    console.log('sending offer');
    socket.emit('on_create_offer_success', {'offer': desc, 'recipient_sid': recipient_sid});
}

function onSetLocalSuccess() {
    console.log(`pc setLocalDescription complete`);
}
  
function onSetRemoteSuccess() {
    console.log(`pc setRemoteDescription complete`);
}

function onSetRemoteSuccessAnswer() {
    console.log(`pc setRemoteDescriptionAnswer complete`);
}

function onSetSessionDescriptionError(error) {
    console.log(`Failed to set session description: ${error}`);
}
  
function gotRemoteStream(e, remoteVideo) {
    if (remoteVideo.srcObject !== e.streams[0]) {
        remoteVideo.srcObject = e.streams[0];
        console.log('pc received remote stream');
    }
}

async function onCreateAnswerSuccess(desc, sender_sid) {
    console.log(`Answer from pc:\n${desc.sdp}`);
    console.log('pc setLocalDescription start');
    let sender_video = document.querySelector(`[class="remoteVideo"][sid="${sender_sid}"]`)
    let pc = pcs[parseInt(sender_video.getAttribute('pc_index'))];
    try {
        await pc.setLocalDescription(desc);
        onSetLocalSuccess(pc);
    } catch (e) {
        onSetSessionDescriptionError(e);
    }
    console.log('sending answer');
    socket.emit('on_answer_create_success', {'answer': desc, 'recipient_sid': sender_sid})
}

async function sendIceCandidate(event, sid) {
    console.log('sending ice candidate');
    iceCandidatesSent[sid]++;
    socket.emit('on_ice_candidate', {'ice': event.candidate, 'recipient_sid': sid});
}

async function onRecievedIceCandidate(data) {
    console.log('recieved ice candidate');
    let ice = data['ice'];
    let sender_sid = data['sender_sid'];
    iceCandidatesRecieved[sender_sid]++;
    let sender_video = document.querySelector(`[class="remoteVideo"][sid="${sender_sid}"]`)
    let pc = pcs[parseInt(sender_video.getAttribute('pc_index'))];
    await (pc.addIceCandidate(ice));
}

async function onIceCandidate(pc, event, sid) {
    if (pc.remoteDescription == null) {
        console.log('pc.remoteDescrition is not set, adding ice candidate to waiting list');
        console.log(sid);
        console.log(iceCandidatesWaiting);
        iceCandidatesWaiting[sid].push(event);
        return;
    }
    try {
        await (pc.addIceCandidate(event.candidate));
        onAddIceCandidateSuccess(pc);
    } catch (e) {
        onAddIceCandidateError(pc, e);
    }
    console.log(`pc ICE candidate:\n${event.candidate ? event.candidate.candidate : '(null)'}`);
    sendIceCandidate(event, sid);
}
  
async function sendWaitingIceCandidates(pc, sid) {
    console.log('sending waiting ice candidate');
    for (let ice_event of iceCandidatesWaiting[sid]) {
        onIceCandidate(pc, ice_event, sid);
    }
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

socket.on('offer_recieved', async function(data) {
    console.log('offer recieved');
    setRemoteDescription(data);
});
socket.on('answer_recieved', async function(data) {
    console.log('answer recieved');
    setRemoteDescriptionAnswer(data);
});
socket.on('ice_candidate_recieved', async function(data) {
    onRecievedIceCandidate(data);
});
socket.on('call_started', async function(data) {
    let sids = data['sids'];
    for (let sid of sids) {
        iceCandidatesWaiting[sid] = [];
        iceCandidatesRecieved[sid] = 0;
        iceCandidatesSent[sid] = 0;
    }
    sids = sids.filter(function(sid) {
        return sid != socket.id;
    });
    let remoteVideos = document.getElementsByClassName('remoteVideo');
    for (let el of remoteVideos) {
        let sid = sids[sids.length - 1]
        el.setAttribute('sid', sid);
        const configuration = {
            iceServers: [
                {
                    urls: 'stun:stun1.l.google.com:19302',
                    username: 'optional-username',
                    credentials: 'auth-token'
                }
            ]
        };
        console.log('RTCPeerConnection configuration:', configuration);
        let pc = new RTCPeerConnection(configuration);
        pc.addEventListener('icecandidate', e => onIceCandidate(pc, e, sid));
        console.log('Created remote peer connection object pc');
        pc.addEventListener('track', e => { gotRemoteStream(e, el) });

        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
        
        pcs.push(pc);
        el.setAttribute('pc_index', (pcs.length - 1).toString());
        sids.pop();
    }
    call();
});

startButton.addEventListener('click', start);
callButton.addEventListener('click', () => {
    socket.emit('start_call_request', {});
});
hangupButton.addEventListener('click', hangup);