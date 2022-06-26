document.addEventListener("DOMContentLoaded", () => {
    const closeCallElement = document.querySelector("#btn-my-close-call")
    closeCallElement.addEventListener("click", () => {
        location.href = "https://www.google.com.br"
    })

    const shareLinkRoom = document.querySelector("#share-link-room")
    shareLinkRoom.addEventListener("click", (event) => {
        event.preventDefault();
        confirm(`Copy this link: ${location.origin}/room?room=${querystring.room}`)
    })
})

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

recordScreen.addEventListener("click", startRecord)
stopRecordScreen.addEventListener("click", stopRecord)