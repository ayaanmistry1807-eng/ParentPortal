// parent.js - robust parent view
console.log("PARENT JS RUNNING");
let parentUID = null;
auth.onAuthStateChanged(async user=>{
  if(!user) return window.location="index.html";
  parentUID = user.uid;
  const data = (await db.ref("users/" + parentUID).once("value")).val() || {};
  if((data.role||'').toLowerCase() !== "parent"){ alert("Access denied"); auth.signOut(); return window.location="index.html"; }
  document.getElementById("pName").innerText = data.name || "Parent";
  document.getElementById("pEmail").innerText = data.email || "";
  let child = data.child || null;
  if(!child){
    // try to find by parentUID in students
    const sSnap = await db.ref("students").once("value"); let found = null;
    sSnap.forEach(clsSnap => { const cls = clsSnap.key; clsSnap.forEach(stSnap => {
      const st = stSnap.val();
      if(st && (st.parentUID === parentUID)) found = { class: cls, roll: stSnap.key, name: st.name };
    }); });
    if(found) child = found;
  }
  if(!child){ document.getElementById("childInfo").innerHTML = "<p class='muted'>No student linked. Contact admin.</p>"; return; }
  const cls = child.class; const roll = child.roll;
  document.getElementById("childInfo").innerHTML = `<strong>${child.name}</strong> — Class: ${cls} — Roll: ${roll}`;
  loadAttendanceForChild(cls, roll);
  loadMarksForChild(cls, roll);
  loadNoticesForClass(cls);
});

async function loadAttendanceForChild(cls, roll){
  const snap = await db.ref("attendance/" + cls).once("value");
  if(!snap.exists()) { document.getElementById("attendanceView").innerHTML = "<p class='muted'>No attendance records yet.</p>"; return; }
  const rows = [];
  snap.forEach(dsnap => rows.push({ date: dsnap.key, rec: dsnap.child("records").val() || {} }));
  rows.sort((a,b)=> b.date.localeCompare(a.date));
  const last = rows.slice(0,60);
  let html = `<table class="table"><thead><tr><th>Date</th><th>Status</th></tr></thead><tbody>`;
  last.forEach(r => { const status = (r.rec && (roll in r.rec)) ? r.rec[roll] : 'N/A'; html += `<tr><td>${r.date}</td><td>${status}</td></tr>`; });
  html += `</tbody></table>`;
  document.getElementById("attendanceView").innerHTML = html;
}

async function loadMarksForChild(cls, roll){
  const snap = await db.ref("marks/" + cls).once("value");
  if(!snap.exists()){ document.getElementById("marksView").innerHTML = "<p class='muted'>No marks yet.</p>"; return; }
  let html = "";
  snap.forEach(exam => { const ex = exam.val()||{}; const mark = (ex.marks && (roll in ex.marks)) ? ex.marks[roll] : 'N/A'; html += `<div style="margin-bottom:8px"><strong>${exam.key}</strong> — ${mark} / ${ex.max || 'N/A'}</div>`; });
  document.getElementById("marksView").innerHTML = html;
}

async function loadNoticesForClass(cls){
  const snap = await db.ref("notices/" + cls).orderByChild("time").limitToLast(50).once("value");
  if(!snap.exists()) { document.getElementById("noticeView").innerHTML = "<p class='muted'>No notices yet.</p>"; return; }
  let html = "<ul>";
  snap.forEach(n => html += `<li>${n.val().text} <small class="muted">(${new Date(n.val().time).toLocaleString()})</small></li>`);
  html += "</ul>"; document.getElementById("noticeView").innerHTML = html;
}
