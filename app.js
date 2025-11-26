// app.js - handles login and role-based redirect + logout
console.log("APP JS LOADED");

async function loginUser(event, roleExpected){
  event.preventDefault();
  console.log("LOGIN FUNCTION CALLED FOR ROLE:", roleExpected);
  const email = document.getElementById(roleExpected + "Email").value.trim();
  const pass  = document.getElementById(roleExpected + "Pass").value.trim();
  try {
    const cred = await auth.signInWithEmailAndPassword(email, pass);
    const uid = cred.user.uid;
    // read role from DB
    const snap = await db.ref("users/" + uid + "/role").once("value");
    const role = (snap.val() || "").toLowerCase();
    if (!role) {
      alert("Your account is not configured yet. Contact admin.");
      auth.signOut();
      return;
    }
    // allow case-insensitive match
    if (role !== roleExpected.toLowerCase()) {
      alert("Access denied for this portal. You are logged in as: " + role);
      auth.signOut();
      return;
    }
    // redirect
    if (role === "admin") window.location = "admin.html";
    if (role === "teacher") window.location = "teacher.html";
    if (role === "parent") window.location = "parent.html";
  } catch (e){
    console.error(e);
    alert(e.message || "Login failed");
  }
}

// logout helper used across pages
function doLogout(){
  auth.signOut().then(()=> window.location = "index.html");
}

// guard to redirect already-authenticated users away from index
auth.onAuthStateChanged(user=>{
  // no automatic redirect here; each page's script checks role on load
});
