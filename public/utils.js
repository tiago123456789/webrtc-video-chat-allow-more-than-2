function extractQuerystring() {
    const params = {}
    location.search
        .replace("?", "")
        .split("&")
        .forEach(item => {
            const keyValue = item.split("=");
            params[keyValue[0]] = decodeURIComponent(keyValue[1])
        });
    return params;
}

function removeElement(selector) {
    const element = document.querySelector(selector);
    if (element) {
        element.remove();
    }
}

function ifVideoNotExistCreateVideo(socketId) {
    const videoElement = document.getElementById(`${socketId}`);
    if (videoElement) {
        return;
    }

    let container = document.querySelector("#container-participants");
    const newVideo = document.createElement("div")
    newVideo.setAttribute("class", "card")
    newVideo.setAttribute("id", `${socketId}-video`)
    newVideo.setAttribute("style", `width: 25rem;`)
    newVideo.innerHTML = `
        <div class="card-body">
            <h3 class="text-center text-capitalize" id="${socketId}-username"></h3>
            <video autoplay id="${socketId}" 
            class="flip" style="width: 100%;"></video>
            <div>
                    <button id="${socketId}-expand" class="btn btn-sm btn-primary" 
                        style="padding: 10px 15px">
                        <i class="fa-solid fa-expand"></i>
                    </button>
            </div>
        </div>
    `;

    container.appendChild(newVideo)
    document.querySelector(`#${socketId}-expand`)
        .addEventListener("click", () => {
            const cardParticipant = document.querySelector(`#${socketId}-video`)
            const width = isExpand == true ? "25rem" : "75rem"
            cardParticipant.setAttribute("style", `width: ${width};`)
            isExpand = !isExpand;
        })
}

function setLocalUsername() {
    document.querySelector("#local-username").textContent = querystring.username
}

function receiveShareScreenEvent(data) {
    document.querySelector(`#${data.from}`).setAttribute("class", "")
}

function receiveStopShareScreenEvent(data) {
    document.querySelector(`#${data.from}`).setAttribute("class", "flip")
}

function loadLocalStream(stream) {
    const localVideo = document.querySelector("#other-video-stream")
    localVideo.setAttribute("class", "flip")
    localVideo.srcObject = stream
    localVideo.autoplay = true
}

function getUsersCameraAndAudio() {
    navigator.mediaDevices.getUserMedia({
        audio: true, video: true
    })
        .then(stream => {
            localStream = stream;
            loadLocalStream(stream)
            setLocalUsername()
            socket.emit("subscribe", {
                room: querystring.room,
                username: querystring.username
            })
        })
}

function shareScreen() {
    return navigator.mediaDevices.getDisplayMedia({
        video: {
            mediaSource: "screen",
            cursor: "always",
            width: { ideal: 1920, max: 1920 },
            height: { ideal: 1080, max: 1080 }
        },
        audio: true
    })
        .then(stream => {
            localShareScreen = stream
            const localVideo = document.querySelector("#other-video-stream")
            localVideo.setAttribute("class", "")
            localVideo.srcObject = stream
            localVideo.autoplay = true

            let videoTrack = localShareScreen.getVideoTracks()[0];
            const peers = room.getPeers();
            for (let p in peers) {
                let pc = peers[p];
                let sender = pc.getSenders ? pc.getSenders().find(s => s.track && s.track.kind === "video") : false;
                sender.replaceTrack(videoTrack);
            }

            videoTrack.addEventListener('ended', () => {
                stopSharingScreen();
            });
            socket.emit("share-screen", { room: querystring.room })
            return stream;
        })
}

function stopSharingScreen() {
    if (localShareScreen.getTracks().length) {
        localShareScreen.getTracks().forEach(track => track.stop())
        getUsersCameraAndAudio()
        socket.emit("stop-share-screen", { room: querystring.room })
    }
}

function startRecord(event) {
    event.preventDefault();
    recorder.start()
    mediaRecorder.ondataavailable = recorder.captureChunks
    mediaRecorder.onstop = recorder.stop
}

function stopRecord(event) {
    event.preventDefault();
    mediaRecorder.stop();
    stopRecordScreen.setAttribute("style", "display: none; padding: 10px 15px")
    recordScreen.setAttribute("style", "padding: 10px 15px;")
}