// admin.js - full CRUD + edit + assign improvements
console.log("ADMIN JS RUNNING");

// UI shortcuts
const menuBtns = Array.from(document.querySelectorAll(".menu-btn"));
const panels = Array.from(document.querySelectorAll(".panel"));
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const modalClose = document.getElementById("modalClose");
const modalSave = document.getElementById("modalSave");

// panel navigation
menuBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    menuBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const panelName = btn.dataset.panel;
    panels.forEach(p => p.classList.toggle("active-panel", p.id === `panel-${panelName}`));
  });
});

// modal helpers
function openModal(title, bodyHtml, onSave){
  modalTitle.textContent = title;
  modalBody.innerHTML = bodyHtml;
  modal.classList.remove("hidden");
  modalSave.onclick = () => { onSave(); modal.classList.add("hidden"); };
}
modalClose.addEventListener("click", ()=> modal.classList.add("hidden"));

// protect route
auth.onAuthStateChanged(async user=>{
  if (!user) return window.location = "index.html";
  const role = (await db.ref("users/" + user.uid + "/role").once("value")).val();
  if (String(role).toLowerCase() !== "admin") { alert("Access denied"); auth.signOut(); return window.location="index.html"; }
  const info = (await db.ref("users/" + user.uid).once("value")).val() || {};
  document.getElementById("adminTitle").innerText = `Welcome, ${info.name || 'Admin'}`;
  document.getElementById("adminEmail").innerText = info.email || "";
  refreshAll();
});

// refresh
function refreshAll(){
  loadCounts();
  loadTeachers();
  loadParents();
  loadClasses();
  loadStudentsView();
  populateSelects();
}

// counts
async function loadCounts(){
  const usersSnap = await db.ref("users").once("value");
  let t=0,p=0; usersSnap.forEach(ch=>{ const r = ch.val().role; if(r==='teacher') t++; if(r==='parent') p++; });
  document.getElementById("totalTeachers").innerText = t;
  document.getElementById("totalParents").innerText = p;
  const clsSnap = await db.ref("classes").once("value");
  document.getElementById("totalClasses").innerText = clsSnap.numChildren();
  const studs = await db.ref("students").once("value");
  let total = 0; studs.forEach(c=> c.forEach(()=> total++));
  document.getElementById("totalStudents").innerText = total;
}

/* ---------------- TEACHERS ---------------- */
document.getElementById("openAddTeacher")?.addEventListener("click", ()=> {
  openModal("Add Teacher",
    `
      <div class="form-row">
        <input id="m_tName" class="input" placeholder="Name" />
        <input id="m_tEmail" class="input" placeholder="Email" />
        <input id="m_tPass" class="input" placeholder="Password" type="password" />
      </div>
    `,
    async ()=>{
      const name = document.getElementById("m_tName").value.trim();
      const email = document.getElementById("m_tEmail").value.trim();
      const pass = document.getElementById("m_tPass").value.trim();
      if(!name||!email||!pass) return alert("Fill all fields");
      try{
        const cred = await auth.createUserWithEmailAndPassword(email, pass);
        await db.ref("users/" + cred.user.uid).set({ name, email, role: "teacher", classes: [] });
        alert("Teacher added");
        refreshAll();
      } catch(e){ alert(e.message); }
    }
  );
});

async function loadTeachers(){
  const area = document.getElementById("teacherListArea");
  area.innerHTML = "<p class='muted'>Loading…</p>";
  const snap = await db.ref("users").orderByChild("role").equalTo("teacher").once("value");
  area.innerHTML = "";
  if(!snap.exists()){ area.innerHTML = "<p class='muted'>No teachers</p>"; return; }
  snap.forEach(ch=>{
    const d = ch.val(); const uid = ch.key;
    const div = document.createElement("div"); div.className="list-row";
    div.innerHTML = `<div><strong>${d.name}</strong><br><small class="muted">${d.email}</small><br><small class="muted">Classes: ${(d.classes||[]).join(", ")}</small></div>
    <div class="actions">
      <button class="btn small" onclick="editTeacher('${uid}')">Edit</button>
      <button class="btn ghost small" onclick="deleteUser('${uid}')">Delete</button>
    </div>`;
    area.appendChild(div);
  });
}

window.editTeacher = async (uid) => {
  const snap = await db.ref("users/" + uid).once("value"); const d = snap.val() || {};
  openModal("Edit Teacher",
    `<div class="form-row"><input id="e_tName" class="input" value="${d.name||''}" /><input id="e_tEmail" class="input" value="${d.email||''}" /></div>
     <div style="margin-top:8px"><label>Classes (comma separated)</label><input id="e_tClasses" class="input" value="${(d.classes||[]).join(", ")}" /></div>`,
    async ()=>{
      const name = document.getElementById("e_tName").value.trim();
      const email = document.getElementById("e_tEmail").value.trim();
      const classesStr = document.getElementById("e_tClasses").value.trim();
      const classesArr = classesStr ? classesStr.split(",").map(s=>s.trim()).filter(Boolean) : [];
      await db.ref("users/" + uid).update({ name, email, classes: classesArr });
      alert("Teacher updated");
      refreshAll();
    }
  );
};

/* ---------------- PARENTS ---------------- */
document.getElementById("openAddParent")?.addEventListener("click", ()=> {
  openModal("Add Parent",
    `<div class="form-row">
       <input id="m_pName" class="input" placeholder="Parent name" />
       <input id="m_pEmail" class="input" placeholder="Email" />
       <input id="m_pPhone" class="input" placeholder="WhatsApp (country+number e.g. 9198...)" />
       <input id="m_pPass" class="input" placeholder="Password" type="password" />
     </div>`,
    async ()=>{
      const name = document.getElementById("m_pName").value.trim();
      const email = document.getElementById("m_pEmail").value.trim();
      const phone = document.getElementById("m_pPhone").value.trim().replace(/\D/g,"");
      const pass = document.getElementById("m_pPass").value.trim();
      if(!name||!email||!phone||!pass) return alert("Fill all fields");
      try{
        const cred = await auth.createUserWithEmailAndPassword(email, pass);
        await db.ref("users/" + cred.user.uid).set({ name, email, phone, role: "parent" });
        alert("Parent added");
        refreshAll();
      } catch(e){ alert(e.message); }
    }
  );
});

async function loadParents(){
  const area = document.getElementById("parentListArea");
  area.innerHTML = "<p class='muted'>Loading…</p>";
  const snap = await db.ref("users").orderByChild("role").equalTo("parent").once("value");
  area.innerHTML = "";
  if(!snap.exists()){ area.innerHTML = "<p class='muted'>No parents</p>"; return; }
  snap.forEach(ch=>{
    const d = ch.val(); const uid = ch.key;
    const div = document.createElement("div"); div.className="list-row";
    div.innerHTML = `<div><strong>${d.name}</strong><br><small class="muted">${d.email}</small><br><small class="muted">Phone: ${d.phone||'—'}</small></div>
    <div class="actions">
      <button class="btn small" onclick="editParent('${uid}')">Edit</button>
      <button class="btn ghost small" onclick="deleteUser('${uid}')">Delete</button>
    </div>`;
    area.appendChild(div);
  });
}

window.editParent = async (uid) => {
  const snap = await db.ref("users/" + uid).once("value"); const d = snap.val() || {};
  openModal("Edit Parent",
    `<div class="form-row"><input id="e_pName" class="input" value="${d.name||''}" /><input id="e_pEmail" class="input" value="${d.email||''}" /></div>
     <div style="margin-top:8px"><input id="e_pPhone" class="input" value="${d.phone||''}" /></div>`,
    async ()=>{
      const name = document.getElementById("e_pName").value.trim();
      const email = document.getElementById("e_pEmail").value.trim();
      const phone = document.getElementById("e_pPhone").value.trim().replace(/\D/g,"");
      await db.ref("users/" + uid).update({ name, email, phone });
      alert("Parent updated");
      refreshAll();
    }
  );
};

/* ---------------- CLASSES ---------------- */
document.getElementById("createClassBtn")?.addEventListener("click", async ()=>{
  const name = document.getElementById("cName").value.trim();
  if(!name) return alert("Enter class name");
  await db.ref("classes/" + name).set(true);
  document.getElementById("cName").value = "";
  refreshAll();
});

async function loadClasses(){
  const out = document.getElementById("classListArea");
  out.innerHTML = "<p class='muted'>Loading…</p>";
  const snap = await db.ref("classes").once("value");
  out.innerHTML = "";
  if(!snap.exists()){ out.innerHTML = "<p class='muted'>No classes</p>"; return; }
  snap.forEach(ch=>{
    const div = document.createElement("div"); div.className="list-row";
    div.innerHTML = `<div>${ch.key}</div><div class="actions"><button class="btn ghost small" onclick="removeClass('${ch.key}')">Remove</button></div>`;
    out.appendChild(div);
  });
}
window.removeClass = async (name) => {
  if(!confirm(`Remove class ${name}?`)) return;
  await db.ref("classes/" + name).remove();
  // also remove students? we leave students in DB but admin can manually remove
  refreshAll();
};

/* ---------------- STUDENTS ---------------- */
document.getElementById("openAddStudent")?.addEventListener("click", ()=> {
  openModal("Add Student",
    `<div class="form-row">
       <input id="m_sName" class="input" placeholder="Student name" />
       <input id="m_sRoll" class="input" placeholder="Roll no (unique within class)" />
     </div>
     <div style="margin-top:8px" class="form-row">
       <select id="m_sClass" class="input"></select>
       <select id="m_sParent" class="input"></select>
     </div>`,
    async ()=>{
      const name = document.getElementById("m_sName").value.trim();
      const roll = document.getElementById("m_sRoll").value.trim();
      const cls = document.getElementById("m_sClass").value;
      const parentUID = document.getElementById("m_sParent").value;
      if(!name||!roll||!cls||!parentUID) return alert("Fill all fields");
      // write
      await db.ref(`students/${cls}/${roll}`).set({ name, roll, parentUID });
      await db.ref(`users/${parentUID}/child`).set({ name, class: cls, roll });
      alert("Student added");
      refreshAll();
    }
  );
  setTimeout(populateStudentModalSelects,120);
});

async function populateStudentModalSelects(){
  const classSel = document.getElementById("m_sClass");
  const parentSel = document.getElementById("m_sParent");
  classSel.innerHTML = ""; parentSel.innerHTML = "<option value=''>Select parent</option>";
  const clsSnap = await db.ref("classes").once("value");
  clsSnap.forEach(c => classSel.innerHTML += `<option value="${c.key}">${c.key}</option>`);
  const parentSnap = await db.ref("users").orderByChild("role").equalTo("parent").once("value");
  parentSnap.forEach(p => parentSel.innerHTML += `<option value="${p.key}">${p.val().name} (${p.val().phone||p.val().email||''})</option>`);
}

async function loadStudentsView(){
  const area = document.getElementById("studentsArea");
  area.innerHTML = "";
  const classesSnap = await db.ref("classes").once("value");
  if(!classesSnap.exists()){ area.innerHTML = "<p class='muted'>No classes</p>"; return; }
  classesSnap.forEach(async c=>{
    const clsName = c.key;
    let html = `<h4>${clsName}</h4><table class="table"><thead><tr><th>Roll</th><th>Name</th><th>Parent</th><th>Action</th></tr></thead><tbody>`;
    const sSnap = await db.ref(`students/${clsName}`).once("value");
    if(!sSnap.exists()) html += `<tr><td colspan="4" class="muted">No students</td></tr>`;
    sSnap.forEach(st=>{
      const s = st.val();
      html += `<tr><td>${st.key}</td><td>${s.name}</td><td>${s.parentUID || '—'}</td>
               <td><button class="btn small" onclick="editStudent('${clsName}','${st.key}')">Edit</button>
                   <button class="btn ghost small" onclick="removeStudent('${clsName}','${st.key}')">Delete</button></td></tr>`;
    });
    html += `</tbody></table>`;
    area.innerHTML += html;
  });
}

window.editStudent = async (cls, roll) => {
  const sSnap = await db.ref(`students/${cls}/${roll}`).once("value");
  const s = sSnap.val() || {};
  openModal("Edit Student",
    `<div class="form-row"><input id="e_sName" class="input" value="${s.name||''}" /><input id="e_sRoll" class="input" value="${roll}" disabled /></div>
     <div style="margin-top:8px"><select id="e_sParent" class="input"></select></div>`,
    async ()=>{
      const name = document.getElementById("e_sName").value.trim();
      const parentUID = document.getElementById("e_sParent").value;
      await db.ref(`students/${cls}/${roll}`).update({ name, parentUID });
      // update parent.child reference
      if(parentUID) await db.ref(`users/${parentUID}/child`).set({ name, class: cls, roll });
      alert("Student updated");
      refreshAll();
    }
  );
  // populate parent select
  setTimeout(async ()=>{
    const pSel = document.getElementById("e_sParent");
    pSel.innerHTML = "<option value=''>Select parent</option>";
    const pSnap = await db.ref("users").orderByChild("role").equalTo("parent").once("value");
    pSnap.forEach(p => pSel.innerHTML += `<option value="${p.key}" ${p.key===s.parentUID?'selected':''}>${p.val().name}</option>`);
  },50);
};

window.removeStudent = async (cls, roll) => {
  if(!confirm("Delete student?")) return;
  await db.ref(`students/${cls}/${roll}`).remove();
  refreshAll();
};

/* ---------------- ASSIGN ---------------- */
document.getElementById("assignBtn")?.addEventListener("click", async ()=>{
  const teacherUID = document.getElementById("selectTeacher").value;
  const className = document.getElementById("selectClass").value;
  if(!teacherUID || !className) return alert("Select both");
  const snap = await db.ref(`users/${teacherUID}/classes`).once("value");
  let arr = snap.exists() ? snap.val() : [];
  if(!Array.isArray(arr)) arr = [];
  if(!arr.includes(className)) arr.push(className);
  await db.ref(`users/${teacherUID}/classes`).set(arr);
  alert("Assigned");
  loadAssignedList();
});

document.getElementById("selectTeacher")?.addEventListener("change", loadAssignedList);
async function loadAssignedList(){
  const uid = document.getElementById("selectTeacher").value;
  const out = document.getElementById("assignedList");
  out.innerHTML = "";
  if(!uid){ out.innerHTML = "<li class='muted'>Select a teacher</li>"; return; }
  const snap = await db.ref(`users/${uid}/classes`).once("value");
  const arr = snap.exists() ? snap.val() : [];
  if(!arr.length) { out.innerHTML = "<li class='muted'>No classes assigned</li>"; return; }
  arr.forEach(c => out.innerHTML += `<li>${c} <button class="btn ghost small" onclick="unassign('${uid}','${c}')">Unassign</button></li>`);
}
window.unassign = async (uid, cls) => {
  if(!confirm(`Unassign ${cls}?`)) return;
  const snap = await db.ref(`users/${uid}/classes`).once("value");
  let arr = snap.exists() ? snap.val() : [];
  if(!Array.isArray(arr)) arr = [];
  arr = arr.filter(x=> x!==cls);
  await db.ref(`users/${uid}/classes`).set(arr);
  loadAssignedList();
};

/* ---------------- ATTENDANCE VIEW (admin viewer) ---------------- */
document.getElementById("viewAttendanceBtn")?.addEventListener("click", async ()=>{
  const cls = document.getElementById("attClassViewer").value;
  const date = document.getElementById("attDateViewer").value;
  if(!cls || !date) return alert("Select both");
  const snap = await db.ref(`attendance/${cls}/${date}`).once("value");
  const out = document.getElementById("attendanceViewerArea");
  if(!snap.exists()){ out.innerHTML = "<p class='muted'>No attendance recorded</p>"; return; }
  const rec = snap.val().records || {};
  let html = `<table class="table"><thead><tr><th>Roll</th><th>Name</th><th>Status</th></tr></thead><tbody>`;
  for(const roll in rec){
    const sSnap = await db.ref(`students/${cls}/${roll}`).once("value");
    const s = sSnap.val() || { name: roll };
    html += `<tr><td>${roll}</td><td>${s.name}</td><td>${rec[roll]}</td></tr>`;
  }
  html += `</tbody></table>`;
  out.innerHTML = html;
});

/* ---------------- HELPERS ---------------- */
async function populateSelects(){
  // teachers
  const selectTeacher = document.getElementById("selectTeacher");
  selectTeacher.innerHTML = "<option value=''>Select teacher</option>";
  const tSnap = await db.ref("users").orderByChild("role").equalTo("teacher").once("value");
  tSnap.forEach(ch => selectTeacher.innerHTML += `<option value="${ch.key}">${ch.val().name}</option>`);
  // classes
  const selectClass = document.getElementById("selectClass");
  selectClass.innerHTML = "<option value=''>Select class</option>";
  const classSnap = await db.ref("classes").once("value");
  classSnap.forEach(ch => selectClass.innerHTML += `<option value="${ch.key}">${ch.key}</option>`);
  // att viewer
  const attClassViewer = document.getElementById("attClassViewer");
  attClassViewer.innerHTML = "<option value=''>Select class</option>";
  classSnap.forEach(ch => attClassViewer.innerHTML += `<option value="${ch.key}">${ch.key}</option>`);
}

window.deleteUser = async (uid) => {
  if(!confirm("Delete user? This removes DB record but not Auth record.")) return;
  await db.ref("users/" + uid).remove();
  alert("User DB record removed. Remove from Authentication using Firebase Console if needed.");
  refreshAll();
};

// edit teacher/parent functions already implemented above

// initial: openCreateAdmin
document.getElementById("openCreateAdmin")?.addEventListener("click", ()=> {
  openModal("Create Admin", `<div class="form-row"><input id="m_aName" class="input" placeholder="Name"/><input id="m_aEmail" class="input" placeholder="Email"/><input id="m_aPass" class="input" placeholder="Password" type="password"/></div>`,
    async ()=>{
      const name = document.getElementById("m_aName").value.trim();
      const email = document.getElementById("m_aEmail").value.trim();
      const pass = document.getElementById("m_aPass").value.trim();
      if(!name||!email||!pass) return alert("Fill all fields");
      try{
        const cred = await auth.createUserWithEmailAndPassword(email, pass);
        await db.ref(`users/${cred.user.uid}`).set({ name, email, role: "admin" });
        alert("Admin created");
        refreshAll();
      } catch(e){ alert(e.message); }
    }
  );
});
