const recorder = {
    start() {
        const recordScreen = document.querySelector("#btn-record-screen")
        const stopRecordScreen = document.querySelector("#btn-stop-record-screen")
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
    },
    captureChunks(e) {
        chunks.push(e.data);
    },
    stop() {
        const blob = new Blob(chunks, { 'type': 'video/mp4; codecs=opus' });
        chunks = [];
        const recordURL = URL.createObjectURL(blob);
        const downloadElement = document.createElement("a")
        downloadElement.href = recordURL;
        downloadElement.target = "_blank"
        downloadElement.click();
    }
}