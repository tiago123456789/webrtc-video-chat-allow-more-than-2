const express = require("express")
const path = require("path")
const app = express()
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin: '*',
    }
});

app.use(express.static(path.resolve(__dirname, "..", "public")))

io.on('connection', socket => {
    socket.on("subscribe", async (data) => {
        await socket.join(data.room)
        console.log(data.username + " subscribe in " + data.room + "" )
        socket.to(data.room).emit("new-user", { ...data, from: socket.id })
    })

    socket.on("newUserStart", (data) => {
        socket.to(data.to).emit("newUserStart", { 
            ...data,
            from: socket.id 
        })
    })

    socket.on("create-offer", (data) => {
        socket.to(data.to).emit("made-offer", { 
            ...data,
            offer: data.offer, 
            to: data.to, 
            from: socket.id 
        })
    })

    socket.on("create-answer", (data) => {
        socket.to(data.to).emit("made-answer", { 
            ...data,
            answer: data.answer, 
            to: data.to, 
            from: socket.id  
        })
    })

    socket.on('ice-candidates', async ( data ) => {
        socket.to(data.to).emit("ice-candidates", data)
    });

    socket.on("share-screen", (data) => {
        socket.to(data.room).emit("share-screen", { from: socket.id })
    })

    socket.on("stop-share-screen", data => {
        socket.to(data.room).emit("stop-share-screen", { from: socket.id })
    })


});

server.listen(3000, () => console.log("Server is running at address: http://localhost:3000"));