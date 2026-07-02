import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

// Firebase 설정 값 (자동 생성된 firebase-applet-config.json 기준)
const firebaseConfig = {
  apiKey: "AIzaSyCgjbdxUnbkJpMxslcHOfiKmUUrKQHAk5E",
  authDomain: "gen-lang-client-0329408103.firebaseapp.com",
  projectId: "gen-lang-client-0329408103",
  storageBucket: "gen-lang-client-0329408103.firebasestorage.app",
  messagingSenderId: "647232614801",
  appId: "1:647232614801:web:d6c6ceaa5b844e9c396a30"
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// Firestore 인스턴스 초기화
// firestoreDatabaseId가 지정된 경우, 해당 데이터베이스 ID를 전달하여 생성합니다.
const db = getFirestore(app, "ai-studio-8e64fb2d-2116-4afe-9e18-8f463ba5e88a");

export { db, doc, getDoc, setDoc, onSnapshot };
