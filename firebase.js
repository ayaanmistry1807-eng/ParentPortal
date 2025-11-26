// firebase.js
// Use your project's config (I included databaseURL for asia-southeast1)
const firebaseConfig = {
  apiKey: "AIzaSyCWucjDzkhmcyn2ZJP-OWWdJUU5z06oXiE",
  authDomain: "parentportal-7e43c.firebaseapp.com",
  databaseURL: "https://parentportal-7e43c-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "parentportal-7e43c",
  storageBucket: "parentportal-7e43c.firebasedestorage.app",
  messagingSenderId: "1065657680902",
  appId: "1:1065657680902:web:13fc8eda02207446a6ef87"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();
