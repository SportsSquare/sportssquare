const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, addDoc, onSnapshot } = require("firebase/firestore");

const firebaseConfig = {
    apiKey: "AIzaSyC-p_D5KgLbpMm_5REwdDaaq-YBrE3pwkk",
    authDomain: "sportssquare-b96ed.firebaseapp.com",
    projectId: "sportssquare-b96ed",
    storageBucket: "sportssquare-b96ed.appspot.com",
    messagingSenderId: "844736978057",
    appId: "1:844736978057:web:76c8db520d3c27bdeb7a58"
  };

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.static("public"));

io.on("connection", (socket) => {
    console.log("New user connected");

    socket.on("newQuestion", async (data) => {
        try {
            await addDoc(collection(db, "ama"), { text: data.text, timestamp: new Date() });
            io.emit("updateQuestions", data);
        } catch (error) {
            console.error("Error adding question:", error);
        }
    });

    onSnapshot(collection(db, "ama"), (snapshot) => {
        const questions = [];
        snapshot.forEach((doc) => {
            questions.push(doc.data());
        });
        io.emit("questionsUpdated", questions);
    });
});

server.listen(3000, () => console.log("Server running on http://localhost:3000"));