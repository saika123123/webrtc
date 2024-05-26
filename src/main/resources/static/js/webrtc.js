const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const callButton = document.getElementById('callButton');

const localStreamPromise = navigator.mediaDevices.getUserMedia({ video: true, audio: true });

localStreamPromise.then(localStream => {
    localVideo.srcObject = localStream;

    const peerConnection = new RTCPeerConnection();

    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = event => {
        remoteVideo.srcObject = event.streams[0];
    };

    const socket = new WebSocket('ws://localhost:8080/signal');

    socket.onmessage = async (message) => {
        const data = JSON.parse(message.data);

        if (data.type === 'offer') {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            socket.send(JSON.stringify({ type: 'answer', answer: answer }));
        } else if (data.type === 'answer') {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
        } else if (data.type === 'candidate') {
            const candidate = new RTCIceCandidate(data.candidate);
            await peerConnection.addIceCandidate(candidate);
        }
    };

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
        }
    };

    callButton.addEventListener('click', async () => {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.send(JSON.stringify({ type: 'offer', offer: offer }));
    });
});
