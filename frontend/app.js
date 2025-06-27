import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot } from "firebase/firestore";

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
const socket = io();

const questionInput = document.getElementById("question-input");
const questionsContainer = document.getElementById("questions-container");

function sendQuestion() {
    const questionText = questionInput.value.trim();
    if (questionText !== "") {
        socket.emit("newQuestion", { text: questionText });
        questionInput.value = "";
    }
}

socket.on("questionsUpdated", (questions) => {
    questionsContainer.innerHTML = "";
    questions.forEach((q) => {
        const questionElement = document.createElement("p");
        questionElement.textContent = q.text;
        questionsContainer.appendChild(questionElement);
    });
});
