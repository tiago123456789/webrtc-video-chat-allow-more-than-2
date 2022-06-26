document.addEventListener("DOMContentLoaded", () => {
    const socket = io();
    const querystring = extractQuerystring();

    let localStream;
    let localShareScreen;
    let peers = [];
    let disableMic = false;
    let disableVideo = false;
    let isExpand = false;
    let chunks = [];
    let mediaRecorder;

    if (!querystring.room) {
        querystring.room = prompt("Type identification the room before come in")
    }

    if (!querystring.username) {
        querystring.username = prompt("What's your username?")
    }

    getUsersCameraAndAudio();

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

    function setLocalUsername() {
        document.querySelector("#local-username").textContent = querystring.username
    }

    function loadLocalStream(stream) {
        const localVideo = document.querySelector("#other-video-stream")
        localVideo.setAttribute("class", "flip")
        localVideo.srcObject = stream
        localVideo.autoplay = true
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

    async function startPeer(socketId, isCreateOffer, data) {
        peers[socketId] = new RTCPeerConnection({
            iceServers: [
                {
                    urls: ["stun:eu-turn4.xirsys.com"]
                },
                {
                    username: "ml0jh0qMKZKd9P_9C0UIBY2G0nSQMCFBUXGlk6IXDJf8G2uiCymg9WwbEJTMwVeiAAAAAF2__hNSaW5vbGVl",
                    credential: "4dd454a6-feee-11e9-b185-6adcafebbb45",
                    urls: [
                        "turn:eu-turn4.xirsys.com:80?transport=udp",
                        "turn:eu-turn4.xirsys.com:3478?transport=tcp"
                    ]
                }
            ]
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

    function removeElement(selector) {
        const element = document.querySelector(selector);
        if (element) {
            element.remove();
        }
    }

    const micElement = document.querySelector("#btn-my-mic");
    micElement.addEventListener("click", () => {
        if (!disableMic) {
            micElement.innerHTML = `<i class="fa-solid fa-microphone-slash"></i>`
            localStream.getAudioTracks()[0].enabled = false
            disableMic = true
        } else {
            micElement.innerHTML = `<i class="fa-solid fa-microphone"></i>`
            localStream.getAudioTracks()[0].enabled = true
            disableMic = false
        }
    })

    const videoElement = document.querySelector("#btn-my-video")
    videoElement.addEventListener("click", () => {
        if (!disableVideo) {
            videoElement.innerHTML = `<i class="fa-solid fa-video-slash"></i>`
            localStream.getVideoTracks()[0].enabled = false
            disableVideo = true
        } else {
            videoElement.innerHTML = `<i class="fa-solid fa-video"></i>`
            localStream.getVideoTracks()[0].enabled = true
            disableVideo = false
        }
    })

    function stopSharingScreen() {
        if (localShareScreen.getTracks().length) {
            localShareScreen.getTracks().forEach(track => track.stop())
            getUsersCameraAndAudio()
            socket.emit("stop-share-screen", { room: querystring.room })
        }
    }

    const shareScreenElement = document.querySelector("#btn-my-share-screen")
    shareScreenElement.addEventListener("click", async () => {
        await shareScreen();
    })

    const closeCallElement = document.querySelector("#btn-my-close-call")
    closeCallElement.addEventListener("click", () => {
        location.href = "https://www.google.com.br"
    })

    const shareLinkRoom = document.querySelector("#share-link-room")
    shareLinkRoom.addEventListener("click", (event) => {
        event.preventDefault();
        confirm(`Copy this link: ${location.origin}/index.html?room=${querystring.room}`)
    })

    const recordScreen = document.querySelector("#btn-record-screen")
    const stopRecordScreen = document.querySelector("#btn-stop-record-screen")
    recordScreen.addEventListener("click", (event) => {
        event.preventDefault();
        stopRecordScreen.setAttribute("style", "padding: 10px 15px;")
        recordScreen.setAttribute("style", "display: none; padding: 10px 15px;")

        if (localShareScreen) {
            stream = new MediaStream([
                localShareScreen.getVideoTracks()[0],
                localStream.getAudioTracks()[0]
            ]);
            mediaRecorder = new MediaRecorder(stream);
        } else {
            mediaRecorder = new MediaRecorder(localStream);
        }

        mediaRecorder.start();
        console.log("start media recorder")

        mediaRecorder.ondataavailable = function (e) {
            console.log("get chuncks")
            chunks.push(e.data);
        }

        mediaRecorder.onstop = function (e) {
            const blob = new Blob(chunks, { 'type': 'video/mp4; codecs=opus' });
            chunks = [];
            const recordURL = URL.createObjectURL(blob);
            console.log(recordURL)
            const downloadElement = document.createElement("a")
            downloadElement.href = recordURL;
            downloadElement.target = "_blank"
            downloadElement.click();
        }
    })

    stopRecordScreen.addEventListener("click", (event) => {
        event.preventDefault();
        console.log("stop media recorder")
        mediaRecorder.stop();
        stopRecordScreen.setAttribute("style", "display: none; padding: 10px 15px")
        recordScreen.setAttribute("style", "padding: 10px 15px;")
    })

    socket.on("connect", () => {
        socket.on("new-user", async (data) => {
            socket.emit("newUserStart", { ...data, username: querystring.username, to: data.from })
            await startPeer(data.from, true, data)
        })

        socket.on("newUserStart", async (data) => {
            await startPeer(data.from, false, data)
        })

        socket.on("made-offer", async (data) => {
            if (data.offer) {
                await peers[data.from].setRemoteDescription(data.offer);
                const answer = await peers[data.from].createAnswer()
                await peers[data.from].setLocalDescription(answer)
                socket.emit("create-answer", { username: querystring.username, answer, to: data.from, from: socket.id })
            }
        })

        socket.on("made-answer", async (data) => {
            if (data.answer) {
                await peers[data.from].setRemoteDescription(data.answer);
            }
        })

        socket.on('ice-candidates', async (data) => {
            data.candidate ? await peers[data.sender].addIceCandidate(new RTCIceCandidate(data.candidate)) : '';
        });

        socket.on("share-screen", data => {
            document.querySelector(`#${data.from}`).setAttribute("class", "")
        })

        socket.on("stop-share-screen", data => {
            document.querySelector(`#${data.from}`).setAttribute("class", "flip")
        })

    })


})