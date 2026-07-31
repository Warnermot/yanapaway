import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCHfEQSvHsKO28GYhnTwFzdvontTKVNO-g",
  authDomain: "yanapaway-8c06f.firebaseapp.com",
  projectId: "yanapaway-8c06f",
  storageBucket: "yanapaway-8c06f.firebasestorage.app",
  messagingSenderId: "164565304705",
  appId: "1:164565304705:web:6fb4a0703a6675cff6d480",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
