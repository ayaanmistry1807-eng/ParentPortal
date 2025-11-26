// teacher.js - attendance (option 2), simple marks, notices, WA
console.log("TEACHER JS RUNNING");
let teacherUID = null;

auth.onAuthStateChanged(async user=>{
  if(!user) return window.location="index.html";
  teacherUID = user.uid;
  const info = (await db.ref("users/" + teacherUID).once("value")).val() || {};
  if((info.role||'').toLowerCase() !== "teacher"){ alert("Access denied"); auth.signOut(); return window.location="index.html"; }
  document.getElementById("tName").innerText = `Teacher — ${info.name || ''}`;
  document.getElementById("tEmail").innerText = info.email || '';
  const classes = info.classes || [];
  populateTeacherClasses(classes);
  populateSelects(classes);
  loadRecentNotices(classes);
});

// helper populate classes in various selects
function populateTeacherClasses(classes){
  ["attClass","marksClass","noticeClass"].forEach(id=>{
    const sel = document.getElementById(id); sel.innerHTML = "";
    (classes.length?classes:[]).forEach(c=> sel.innerHTML += `<option value="${c}">${c}</option>`);
  });
  const ul = document.getElementById("teacherClasses"); ul.innerHTML = "";
  (classes||[]).forEach(c=> ul.innerHTML += `<li class="list-row"><div>${c}</div></li>`);
}
async function populateSelects(classes){
  // if teacher has no classes fetch all classes as fallback
  if(!classes || !classes.length){
    const snap = await db.ref("classes").once("value"); classes = []; snap.forEach(ch=>classes.push(ch.key));
    populateTeacherClasses(classes);
  }
}

// ATTENDANCE - option 2: load existing date or new
document.getElementById("loadAttBtn")?.addEventListener("click", async ()=>{
  const cls = document.getElementById("attClass").value;
  const date = document.getElementById("attDate").value;
  if(!cls || !date) return alert("Select class + date");
  const area = document.getElementById("attendanceArea"); area.innerHTML = "Loading…";
  const sSnap = await db.ref(`students/${cls}`).once("value");
  if(!sSnap.exists()){ area.innerHTML = "<p class='muted'>No students</p>"; return; }
  // check if attendance already exists
  const aSnap = await db.ref(`attendance/${cls}/${date}`).once("value");
  const existing = aSnap.exists() ? (aSnap.val().records || {}) : {};
  let html = `<h4>${cls} — ${date}</h4><table class="table"><thead><tr><th>Roll</th><th>Name</th><th>Status</th></tr></thead><tbody>`;
  sSnap.forEach(st=>{
    const r = st.key; const s = st.val(); const name = s.name || r;
    const val = existing[r] || "Present";
    html += `<tr><td>${r}</td><td>${name}</td><td>
      <label><input type="radio" name="r_${r}" value="Present" ${val==="Present"?'checked':''}> P</label>
      <label><input type="radio" name="r_${r}" value="Absent" ${val==="Absent"?'checked':''}> A</label>
    </td></tr>`;
  });
  html += `</tbody></table><div style="margin-top:12px" class="actions"><button class="btn success" onclick="submitAttendance('${cls}','${date}')">Save Attendance</button><button class="btn ghost" onclick="editAttendance('${cls}','${date}')">Edit</button></div>`;
  area.innerHTML = html;
});

async function submitAttendance(cls, date){
  const area = document.getElementById("attendanceArea");
  const checked = area.querySelectorAll("input[type=radio]:checked");
  const records = {};
  checked.forEach(r=> records[r.name.replace('r_','')] = r.value);
  await db.ref(`attendance/${cls}/${date}`).set({ by: teacherUID, at: Date.now(), records });
  alert("Attendance saved");
  // show WA modal for absentees
  showAbsentModalFromRecords(cls, date, records);
}

// editAttendance just re-opens area (attendance already loaded with radios)
window.editAttendance = (cls,date) => { document.getElementById("loadAttBtn").click(); };

// show absent modal
async function showAbsentModalFromRecords(cls, date, records){
  const absents = [];
  for(const roll in records){
    if(records[roll] === "Absent"){
      const sSnap = await db.ref(`students/${cls}/${roll}`).once("value");
      const student = sSnap.exists() ? sSnap.val() : { name: roll };
      let phone = null; let parentUID = student.parentUID || null;
      if(parentUID){
        const pSnap = await db.ref(`users/${parentUID}`).once("value");
        if(pSnap.exists()) phone = pSnap.val().phone || null;
      } else {
        phone = student.parent || student.parentPhone || null;
      }
      absents.push({ roll, name: student.name || roll, phone, parentUID });
    }
  }
  if(!absents.length){ alert("No absentees"); return; }
  const waBody = document.getElementById("waModalBody"); waBody.innerHTML = "";
  absents.forEach(a=>{
    const phoneDisplay = a.phone ? a.phone : "<span style='color:#d00'>No phone</span>";
    const node = document.createElement("div"); node.style.padding="8px 6px"; node.style.borderBottom="1px solid #eef4ff";
    node.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center">
      <div><strong>${a.name}</strong><br><small class="muted">Roll ${a.roll}</small><br>Parent: ${phoneDisplay}</div>
      <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
        ${a.phone?`<button class="btn small" onclick="sendWhatsApp('${escapeQuotes(a.phone)}','${escapeQuotes(a.name)}','${date}')">Send WA</button>`:`<button class="btn small" disabled>Send WA</button>`}
        <button class="btn ghost small" onclick="copyText('${escapeQuotes(a.name)} — ${escapeQuotes(a.roll)}')">Copy</button>
      </div></div>`;
    waBody.appendChild(node);
  });
  document.getElementById("waMessageTemplate").value = document.getElementById("waMessageTemplate").value || `Dear Parent, your child {student} was absent on {date}. - ${document.getElementById("tName").innerText.replace('Teacher — ','')}`;
  document.getElementById("waModal").classList.remove("hidden");
}

// WA helpers
function escapeQuotes(s){ return String(s||'').replace(/'/g,"\\'"); }
window.sendWhatsApp = (phone, studentName, date) => {
  const digits = String(phone).replace(/\D/g,"");
  if(!digits) return alert("Phone missing");
  const tpl = document.getElementById("waMessageTemplate").value || "";
  const teacher = document.getElementById("tName").innerText.replace('Teacher — ','');
  const msg = tpl.replace(/{student}/g, studentName).replace(/{date}/g, date).replace(/{teacher}/g, teacher);
  window.open(`https://wa.me/${digits}?text=${encodeURIComponent(msg)}`,"_blank");
};
window.copyText = (txt) => navigator.clipboard?.writeText(txt).then(()=>alert("Copied"));

// bulk send
document.getElementById("waSendAll")?.addEventListener("click", ()=> {
  const waBody = document.getElementById("waModalBody"); const date = document.getElementById("attDate").value || new Date().toISOString().split("T")[0];
  const tpl = document.getElementById("waMessageTemplate").value || ""; const teacher = document.getElementById("tName").innerText.replace('Teacher — ','');
  const rows = Array.from(waBody.children);
  let opened = 0;
  rows.forEach(row => {
    const sendBtn = Array.from(row.querySelectorAll("button")).find(b=> b.textContent.toLowerCase().includes('send wa'));
    if(!sendBtn) return;
    const onclick = sendBtn.getAttribute("onclick");
    const match = onclick && onclick.match(/sendWhatsApp\('([^']+)'/);
    if(match){
      const phone = match[1]; const strong = row.querySelector("strong"); const name = strong ? strong.innerText : '';
      const digits = phone.replace(/\D/g,"");
      if(!digits) return;
      const msg = tpl.replace(/{student}/g, name).replace(/{date}/g, date).replace(/{teacher}/g, teacher);
      window.open(`https://wa.me/${digits}?text=${encodeURIComponent(msg)}`,"_blank");
      opened++;
    }
  });
  if(opened === 0) alert("No phone numbers available to open WhatsApp.");
});
document.getElementById("waModalClose")?.addEventListener("click", ()=> document.getElementById("waModal").classList.add("hidden"));

/* ---------------- MARKS (simple) ---------------- */
document.getElementById("loadMarksBtn")?.addEventListener("click", async ()=>{
  const cls = document.getElementById("marksClass").value; if(!cls) return alert("Select class");
  const snap = await db.ref(`students/${cls}`).once("value");
  const out = document.getElementById("marksStudents"); out.innerHTML = "";
  if(!snap.exists()){ out.innerHTML = "<p class='muted'>No students</p>"; return; }
  let html = "";
  snap.forEach(st => html += `<div style="margin-bottom:8px;"><strong>${st.val().name} (Roll ${st.key})</strong><input class="input mark" data-roll="${st.key}" placeholder="Marks" style="width:120px;margin-left:8px;"></div>`);
  out.innerHTML = html;
});

document.getElementById("submitMarksBtn")?.addEventListener("click", async ()=>{
  const cls = document.getElementById("marksClass").value; const exam = document.getElementById("examName").value.trim(); const max = Number(document.getElementById("maxMarks").value) || 0;
  if(!cls || !exam) return alert("Select class and exam name");
  const marks = {}; document.querySelectorAll(".mark").forEach(inp => marks[inp.dataset.roll] = inp.value.trim()===""?null:Number(inp.value.trim()));
  await db.ref(`marks/${cls}/${exam}`).set({ by: teacherUID, max, marks, time: Date.now() });
  alert("Marks saved");
});

/* ---------------- NOTICES ---------------- */
document.getElementById("sendNoticeBtn")?.addEventListener("click", async ()=>{
  const cls = document.getElementById("noticeClass").value; const text = document.getElementById("noticeText").value.trim();
  if(!cls || !text) return alert("Select class and enter notice");
  const id = db.ref().push().key;
  await db.ref(`notices/${cls}/${id}`).set({ by: teacherUID, text, time: Date.now() });
  alert("Notice sent"); document.getElementById("noticeText").value="";
  loadRecentNotices([cls]);
});

async function loadRecentNotices(classes){
  const out = document.getElementById("noticeList"); out.innerHTML = "<p class='muted'>Loading…</p>";
  let combined = "";
  for(const c of (classes||[])){
    const snap = await db.ref(`notices/${c}`).orderByChild("time").limitToLast(10).once("value");
    if(!snap.exists()) continue;
    combined += `<h5>${c}</h5><ul>`;
    snap.forEach(n => combined += `<li>${n.val().text} <small class="muted">(${new Date(n.val().time).toLocaleString()})</small></li>`);
    combined += `</ul>`;
  }
  out.innerHTML = combined || "<p class='muted'>No notices</p>";
}
