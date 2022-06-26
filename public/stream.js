const querystring = extractQuerystring();
let localStream;
let localShareScreen;
let disableMic = false;
let disableVideo = false;
let isExpand = false;
let chunks = [];
let mediaRecorder;
let socket;
let room = Room();
const recordScreen = document.querySelector("#btn-record-screen")
const stopRecordScreen = document.querySelector("#btn-stop-record-screen")

document.addEventListener("DOMContentLoaded", () => {
    socket = io();

    const shareScreenElement = document.querySelector("#btn-my-share-screen")
    shareScreenElement.addEventListener("click", shareScreen)

    if (!querystring.room) {
        querystring.room = prompt("Type identification the room before come in")
    }

    if (!querystring.username) {
        querystring.username = prompt("What's your username?")
    }

    getUsersCameraAndAudio();

    socket.on("connect", () => {
        socket.on("new-user", async (data) => {
            socket.emit("newUserStart", { ...data, username: querystring.username, to: data.from })
            await room.init(data.from, true, data)
        })

        socket.on("newUserStart", async (data) => {
            await room.init(data.from, false, data)
        })

        socket.on("made-offer", room.receiveOfferAndCreateAnswer)
        socket.on("made-answer", room.receiveAnswer)
        socket.on('ice-candidates', room.addCandidate);
        socket.on("share-screen", receiveShareScreenEvent)
        socket.on("stop-share-screen", receiveStopShareScreenEvent)

    })
})
