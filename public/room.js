
function Room() {
    const peers = {};

    async function init(socketId, isCreateOffer, data) {
        peers[socketId] = new RTCPeerConnection({
            iceServers: [
                {
                    urls: "stun:openrelay.metered.ca:80",
                },
                {
                    urls: "turn:openrelay.metered.ca:80",
                    username: "openrelayproject",
                    credential: "openrelayproject",
                },
                {
                    urls: "turn:openrelay.metered.ca:443",
                    username: "openrelayproject",
                    credential: "openrelayproject",
                },
                {
                    urls: "turn:openrelay.metered.ca:443?transport=tcp",
                    username: "openrelayproject",
                    credential: "openrelayproject",
                },
            ],
        })

        if (localStream) {
            localStream.getTracks().forEach(track => {
                peers[socketId].addTrack(track, localStream);
            })
        }

        if (localShareScreen) {
            localShareScreen.getTracks().forEach(track => {
                peers[socketId].addTrack(track, localShareScreen);
            })
        }

        peers[socketId].ontrack = function (event) {
            ifVideoNotExistCreateVideo(socketId)
            const usernameElement = document.querySelector(`#${socketId}-username`);
            if (usernameElement) {
                usernameElement.textContent = data.username
            }
            const videoElement = document.getElementById(`${socketId}`)
            videoElement.srcObject = event.streams[0];
            videoElement.autoplay = true
        }

        peers[socketId].onicecandidate = ({ candidate }) => {
            socket.emit('ice-candidates', { username: querystring.username, candidate: candidate, to: socketId, sender: socket.id });
        };

        peers[socketId].onconnectionstatechange = ev => {
            switch (peers[socketId].connectionState) {
                case "disconnected":
                case "closed":
                case "failed":
                    removeElement(`#${socketId}-video`)
                    break;
            }
        }

        peers[socketId].onsignalingstatechange = () => {
            switch (peers[socketId].signalingState) {
                case 'closed':
                    removeElement(`#${socketId}-video`)
                    break;
            }
        };

        if (isCreateOffer) {
            const offer = await peers[socketId].createOffer()
            await peers[socketId].setLocalDescription(offer);
            socket.emit("create-offer", { ...data, username: querystring.username, offer, to: socketId, from: socket.id })
        }
    }

    async function receiveOfferAndCreateAnswer(data) {
        if (data.offer) {
            await peers[data.from].setRemoteDescription(data.offer);
            const answer = await peers[data.from].createAnswer()
            await peers[data.from].setLocalDescription(answer)
            socket.emit("create-answer", { username: querystring.username, answer, to: data.from, from: socket.id })
        }
    }

    async function receiveAnswer(data) {
        if (data.answer) {
            await peers[data.from].setRemoteDescription(data.answer);
        }
    }

    async function addCandidate(data) {
        data.candidate ? await peers[data.sender].addIceCandidate(new RTCIceCandidate(data.candidate)) : '';
    }

    function getPeers() {
        return peers;
    }

    return {
        init,
        addCandidate,
        receiveAnswer,
        receiveOfferAndCreateAnswer,
        getPeers
    }
}
