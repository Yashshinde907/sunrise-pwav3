// ================================================================
// SUNRISE REALTY — Google Apps Script Backend v5.0 FINAL
// ================================================================
// EXACT SHEET SCHEMA (match column order precisely):
//
// Users (col): UserID(A)|Username(B)|Password(C)|Role(D)|Designation(E)|FullName(F)|Phone(G)|Email(H)|Status(I)|Team(J)
// Sheet1 (col): Timestamp(A)|EmployeeName(B)|UserID(C)|Username(D)|Designation(E)|TotalCalls(F)|ConnectedCalls(G)|Visits(H)|Bookings(I)|CreatedPosts(J)|PostCounts(K)|PostUploads(L)|TargetsCompleted(M)|Email(N)|PositiveClients(O)
// Sheet2 (col): Timestamp(A)|EmployeeName(B)|UserID(C)|Username(D)|ClientName(E)|ContactNo(F)|Feedback(G)|Email(H)|ScheduledDate(I)|ScheduledTime(J)|FollowUpCount(K)|FeedbackHistory(L)|Status(M)
// Settings (col): Key(A)|Value(B)
// Teams (col): TeamName(A)|Members(JSON)(B)|Description(C)|CreatedAt(D)
// AuditLogs (col): Timestamp(A)|Actor(B)|Action(C)|Detail(D)
// Sessions (col): Username(A)|Status(B)|UpdatedAt(C)
// Backups (col): BackupID(A)|Timestamp(B)|DataType(C)|Data(JSON)(D)
// ================================================================

var S = {
  users:'Users', daily:'Sheet1', leads:'Sheet2',
  settings:'Settings', teams:'Teams', audit:'AuditLogs',
  sessions:'Sessions', backups:'Backups'
};

function resp(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
function now_() { return new Date().toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}); }
function t_(v)  { return (v||'').toString().trim(); }

// ── GET ──
function doGet(e) {
  var ss=SpreadsheetApp.getActiveSpreadsheet();
  var a=t_(e.parameter.action||'');
  if(a==='login')     return handleLogin(ss,e);
  if(a==='audit')     return handleGetAudit(ss,e);
  if(a==='heartbeat') return handleHeartbeatGet(ss,e);
  if(a==='backup')    return handleGetBackups(ss);
  return handleFetchData(ss);
}

// ── POST ──
function doPost(e) {
  var ss=SpreadsheetApp.getActiveSpreadsheet();
  var body;
  try{ body=JSON.parse(e.postData.contents); } catch(err){ return resp({success:false,message:'Invalid JSON'}); }
  var a=t_(body.action||'');
  if(a==='submitDaily')      return handleSubmitDaily(ss,body);
  if(a==='submitLead')       return handleSubmitLead(ss,body);
  if(a==='updateFeedback')   return handleUpdateFeedback(ss,body);
  if(a==='addFollowUp')      return handleAddFollowUp(ss,body);
  if(a==='updateLeadStatus') return handleUpdateLeadStatus(ss,body);
  if(a==='updateSettings')   return handleUpdateSettings(ss,body);
  if(a==='addUser')          return handleAddUser(ss,body);
  if(a==='updateUser')       return handleUpdateUser(ss,body);
  if(a==='lockUser')         return handleLockUser(ss,body);
  if(a==='removeUser')       return handleRemoveUser(ss,body);
  if(a==='forceLogout')      return handleForceLogout(ss,body);
  if(a==='saveTeam')         return handleSaveTeam(ss,body);
  if(a==='deleteTeam')       return handleDeleteTeam(ss,body);
  if(a==='heartbeat')        return handleHeartbeatPost(ss,body);
  if(a==='createBackup')     return handleCreateBackup(ss,body);
  if(a==='restoreBackup')    return handleRestoreBackup(ss,body);
  return resp({success:false,message:'Unknown action: '+a});
}

// ── LOGIN ──
// Users: UserID(A)|Username(B)|Password(C)|Role(D)|Designation(E)|FullName(F)|Phone(G)|Email(H)|Status(I)|Team(J)
function handleLogin(ss,e) {
  var sheet=ss.getSheetByName(S.users);
  if(!sheet) return resp({success:false,message:'Users sheet missing'});
  var rows=sheet.getDataRange().getValues();
  var username=t_(e.parameter.user||'').toLowerCase();
  var password=t_(e.parameter.pass||'');
  for(var i=1;i<rows.length;i++){
    var r=rows[i]; if(!r[1]) continue;
    if(t_(r[1]).toLowerCase()!==username) continue; // col B = Username
    if(t_(r[2])!==password) continue;               // col C = Password
    var status=t_(r[8]||'active').toLowerCase();     // col I = Status
    if(status==='locked'){
      audit_(ss,username,'LOGIN_BLOCKED','Account locked');
      return resp({success:false,locked:true,message:'Account locked by admin.'});
    }
    var sess=getOrCreate_(ss,S.sessions);
    upsertRow_(sess,0,username,[username,'active',now_()]);
    audit_(ss,username,'LOGIN_SUCCESS','Login from web');
    return resp({
      success:true,
      userID:      t_(r[0]||''),  // col A = UserID
      role:        t_(r[3]||''),  // col D = Role
      designation: t_(r[4]||''),  // col E = Designation
      fullName:    t_(r[5]||r[1]||''), // col F = FullName
      phone:       t_(r[6]||''),  // col G = Phone
      email:       t_(r[7]||''),  // col H = Email
      team:        t_(r[9]||'')   // col J = Team
    });
  }
  audit_(ss,username||'unknown','LOGIN_FAILED','Wrong credentials');
  return resp({success:false,message:'Invalid credentials.'});
}

// ── HEARTBEAT ──
function handleHeartbeatGet(ss,e){ return checkSession_(ss,t_(e.parameter.user||'').toLowerCase()); }
function handleHeartbeatPost(ss,body){ return checkSession_(ss,t_(body.username||'').toLowerCase()); }
function checkSession_(ss,uname){
  var sess=ss.getSheetByName(S.sessions); if(!sess) return resp({forceLogout:false});
  var rows=sess.getDataRange().getValues();
  for(var i=1;i<rows.length;i++){
    if(t_(rows[i][0]).toLowerCase()===uname){
      if(t_(rows[i][1])==='force_logout'){
        upsertRow_(sess,0,uname,[uname,'logged_out',now_()]);
        return resp({forceLogout:true});
      }
      return resp({forceLogout:false});
    }
  }
  return resp({forceLogout:false});
}

// ── FETCH DATA ──
function handleFetchData(ss){
  return resp({
    success:true,
    dailyTracking: getSheetData_(ss,S.daily),
    positiveLeads: getSheetData_(ss,S.leads),
    settings:      getSettings_(ss),
    users:         getSafeUsers_(ss),
    teams:         getTeams_(ss),
    lastSync:      now_()
  });
}

// ── SUBMIT DAILY TRACKING ──
// Sheet1: Timestamp(A)|EmployeeName(B)|UserID(C)|Username(D)|Designation(E)|TotalCalls(F)|ConnectedCalls(G)|Visits(H)|Bookings(I)|CreatedPosts(J)|PostCounts(K)|PostUploads(L)|TargetsCompleted(M)|Email(N)|PositiveClients(O)
function handleSubmitDaily(ss,body){
  var sheet=ss.getSheetByName(S.daily);
  if(!sheet) return resp({success:false,message:'Sheet1 not found'});
  var ts=body.scheduledDate||now_();
  var desig=t_(body.designation||'');
  var uname=t_(body.username||'').toLowerCase();
  var uid  =t_(body.userID||'');
  if(desig==='Digital'){
    sheet.appendRow([ts,t_(body.employeeName||''),uid,uname,desig,
      '','','','',
      t_(body.createdPosts||''),t_(body.postCounts||''),Number(body.postUploads)||0,
      t_(body.targetsCompleted||'No'),t_(body.email||''),'']);
  } else {
    sheet.appendRow([ts,t_(body.employeeName||''),uid,uname,desig,
      Number(body.totalCalls)||0,Number(body.connectedCalls)||0,
      Number(body.visits)||0,Number(body.bookings)||0,
      '','','',
      t_(body.targetsCompleted||'No'),t_(body.email||''),
      Number(body.positiveClients)||0]);
  }
  audit_(ss,uname,'DAILY_SUBMIT',desig+' report submitted');
  return resp({success:true,message:'Daily report submitted!'});
}

// ── SUBMIT LEADS ──
// Sheet2: Timestamp(A)|EmployeeName(B)|UserID(C)|Username(D)|ClientName(E)|ContactNo(F)|Feedback(G)|Email(H)|ScheduledDate(I)|ScheduledTime(J)|FollowUpCount(K)|FeedbackHistory(L)|Status(M)
function handleSubmitLead(ss,body){
  var sheet=ss.getSheetByName(S.leads);
  if(!sheet) return resp({success:false,message:'Sheet2 not found'});
  var ts=now_();
  var uname=t_(body.username||'').toLowerCase();
  var uid  =t_(body.userID||'');
  var clients=body.clients||[];
  if(!clients.length) return resp({success:false,message:'No clients provided'});
  clients.forEach(function(c){
    var initFb=t_(c.feedback||'');
    var hist=initFb?JSON.stringify([{ts:ts,text:initFb}]):'[]';
    sheet.appendRow([ts,t_(body.employeeName||''),uid,uname,
      t_(c.clientName||''),t_(c.contactNo||''),initFb,
      t_(body.email||''),t_(c.scheduledDate||''),t_(c.scheduledTime||''),
      0,hist,'positive']);
  });
  audit_(ss,uname,'LEAD_SUBMIT',clients.length+' client(s) added');
  return resp({success:true,message:'Lead(s) submitted!'});
}

// ── UPDATE FEEDBACK ──
// Sheet2 col G (index 6+1=7) = Feedback; col L (index 11+1=12) = FeedbackHistory
function handleUpdateFeedback(ss,body){
  var sheet=ss.getSheetByName(S.leads);
  if(!sheet) return resp({success:false,message:'Sheet2 not found'});
  var rowIdx=parseInt(body.rowIndex)||0; if(rowIdx<2) return resp({success:false,message:'Invalid row'});
  var text=t_(body.feedback||''); if(!text) return resp({success:false,message:'Feedback required'});
  sheet.getRange(rowIdx,7).setValue(text); // col G = Feedback
  var raw=sheet.getRange(rowIdx,12).getValue()||'[]'; // col L = FeedbackHistory
  var hist=[]; try{hist=JSON.parse(raw);}catch(e){}
  hist.push({ts:now_(),text:text});
  sheet.getRange(rowIdx,12).setValue(JSON.stringify(hist));
  audit_(ss,t_(body.username||''),'FEEDBACK_UPDATED','Row '+rowIdx);
  return resp({success:true,message:'Feedback updated!'});
}

// ── ADD FOLLOW-UP ──
// Sheet2 col K (index 10+1=11) = FollowUpCount
function handleAddFollowUp(ss,body){
  var sheet=ss.getSheetByName(S.leads);
  if(!sheet) return resp({success:false,message:'Sheet2 not found'});
  var rowIdx=parseInt(body.rowIndex)||0; if(rowIdx<2) return resp({success:false,message:'Invalid row'});
  var cur=parseInt(sheet.getRange(rowIdx,11).getValue())||0; // col K
  var next=cur+1;
  sheet.getRange(rowIdx,11).setValue(next);
  audit_(ss,t_(body.username||''),'FOLLOW_UP_ADDED','Row '+rowIdx+' count='+next);
  return resp({success:true,followUpCount:next,message:'Follow-up added!'});
}

// ── UPDATE LEAD STATUS (positive/negative) ──
// Sheet2 col M (index 12+1=13) = Status
function handleUpdateLeadStatus(ss,body){
  var sheet=ss.getSheetByName(S.leads);
  if(!sheet) return resp({success:false,message:'Sheet2 not found'});
  var rowIdx=parseInt(body.rowIndex)||0; if(rowIdx<2) return resp({success:false,message:'Invalid row'});
  var newStatus=t_(body.status||'positive').toLowerCase();
  if(newStatus!=='positive'&&newStatus!=='negative') return resp({success:false,message:'Status must be positive or negative'});
  sheet.getRange(rowIdx,13).setValue(newStatus); // col M
  audit_(ss,t_(body.username||''),'LEAD_STATUS_CHANGED','Row '+rowIdx+' -> '+newStatus);
  return resp({success:true,message:'Status updated to '+newStatus});
}

// ── USER MANAGEMENT ──
// Users: UserID(A)|Username(B)|Password(C)|Role(D)|Designation(E)|FullName(F)|Phone(G)|Email(H)|Status(I)|Team(J)
function handleAddUser(ss,body){
  var sheet=getOrCreate_(ss,S.users);
  var rows=sheet.getDataRange().getValues();
  var uname=t_(body.username||'').toLowerCase();
  if(!uname) return resp({success:false,message:'Username required'});
  for(var i=1;i<rows.length;i++){
    if(t_(rows[i][1]).toLowerCase()===uname) return resp({success:false,message:'Username already exists'});
  }
  var uid=t_(body.userID||'')||generateUID_();
  sheet.appendRow([uid,uname,t_(body.password||'1234'),t_(body.role||'Agent'),
    t_(body.designation||''),t_(body.fullName||''),t_(body.phone||''),
    t_(body.email||''),'active',t_(body.team||'')]);
  audit_(ss,t_(body.adminUser||'admin'),'USER_ADDED',uname+' ('+uid+')');
  return resp({success:true,message:'User added!',userID:uid});
}
function handleUpdateUser(ss,body){
  var sheet=ss.getSheetByName(S.users); if(!sheet) return resp({success:false});
  var rows=sheet.getDataRange().getValues();
  var uname=t_(body.username||'').toLowerCase();
  for(var i=1;i<rows.length;i++){
    if(t_(rows[i][1]).toLowerCase()===uname){
      if(body.password!==undefined&&body.password!=='') sheet.getRange(i+1,3).setValue(t_(body.password));
      if(body.role!==undefined)        sheet.getRange(i+1,4).setValue(t_(body.role));
      if(body.designation!==undefined) sheet.getRange(i+1,5).setValue(t_(body.designation));
      if(body.fullName!==undefined)    sheet.getRange(i+1,6).setValue(t_(body.fullName));
      if(body.phone!==undefined)       sheet.getRange(i+1,7).setValue(t_(body.phone));
      if(body.email!==undefined)       sheet.getRange(i+1,8).setValue(t_(body.email));
      if(body.team!==undefined)        sheet.getRange(i+1,10).setValue(t_(body.team));
      audit_(ss,t_(body.adminUser||'admin'),'USER_UPDATED',uname);
      return resp({success:true,message:'User updated!'});
    }
  }
  return resp({success:false,message:'User not found'});
}
function handleLockUser(ss,body){
  var sheet=ss.getSheetByName(S.users); if(!sheet) return resp({success:false});
  var rows=sheet.getDataRange().getValues();
  var uname=t_(body.username||'').toLowerCase();
  for(var i=1;i<rows.length;i++){
    if(t_(rows[i][1]).toLowerCase()===uname){
      var ns=body.lock?'locked':'active';
      sheet.getRange(i+1,9).setValue(ns); // col I = Status
      audit_(ss,t_(body.adminUser||'admin'),body.lock?'USER_LOCKED':'USER_UNLOCKED',uname);
      return resp({success:true,message:'User '+ns});
    }
  }
  return resp({success:false,message:'User not found'});
}
function handleRemoveUser(ss,body){
  var sheet=ss.getSheetByName(S.users); if(!sheet) return resp({success:false});
  var rows=sheet.getDataRange().getValues();
  var uname=t_(body.username||'').toLowerCase();
  for(var i=1;i<rows.length;i++){
    if(t_(rows[i][1]).toLowerCase()===uname){
      sheet.deleteRow(i+1);
      audit_(ss,t_(body.adminUser||'admin'),'USER_REMOVED',uname);
      return resp({success:true,message:'User removed!'});
    }
  }
  return resp({success:false,message:'User not found'});
}
function handleForceLogout(ss,body){
  var sess=getOrCreate_(ss,S.sessions);
  var uname=t_(body.username||'').toLowerCase();
  upsertRow_(sess,0,uname,[uname,'force_logout',now_()]);
  audit_(ss,t_(body.adminUser||'admin'),'FORCE_LOGOUT',uname);
  return resp({success:true,message:'User force-logged out.'});
}

// ── TEAMS ──
function handleSaveTeam(ss,body){
  var sheet=getOrCreate_(ss,S.teams);
  var rows=sheet.getDataRange().getValues();
  var tname=t_(body.teamName||''); if(!tname) return resp({success:false,message:'Team name required'});
  var members=JSON.stringify(body.members||[]);
  for(var i=1;i<rows.length;i++){
    if(t_(rows[i][0])===tname){
      sheet.getRange(i+1,2).setValue(members);
      sheet.getRange(i+1,3).setValue(t_(body.description||''));
      audit_(ss,t_(body.adminUser||'admin'),'TEAM_UPDATED',tname);
      return resp({success:true,message:'Team updated!'});
    }
  }
  sheet.appendRow([tname,members,t_(body.description||''),now_()]);
  audit_(ss,t_(body.adminUser||'admin'),'TEAM_CREATED',tname);
  return resp({success:true,message:'Team created!'});
}
function handleDeleteTeam(ss,body){
  var sheet=ss.getSheetByName(S.teams); if(!sheet) return resp({success:false});
  var rows=sheet.getDataRange().getValues();
  var tname=t_(body.teamName||'');
  for(var i=1;i<rows.length;i++){
    if(t_(rows[i][0])===tname){ sheet.deleteRow(i+1); audit_(ss,t_(body.adminUser||'admin'),'TEAM_DELETED',tname); return resp({success:true}); }
  }
  return resp({success:false,message:'Team not found'});
}

// ── SETTINGS ──
function handleUpdateSettings(ss,body){
  var sheet=getOrCreate_(ss,S.settings);
  var data=sheet.getDataRange().getValues();
  var map={}; data.forEach(function(r,i){if(r[0])map[t_(r[0])]=i+1;});
  function set_(k,v){ if(v===undefined||v===null)return; if(map[k])sheet.getRange(map[k],2).setValue(v); else{sheet.appendRow([k,v]);map[k]=sheet.getLastRow();} }
  set_('Call_Target',    body.callTarget    !==undefined?Number(body.callTarget)   :undefined);
  set_('Booking_Target', body.bookingTarget !==undefined?Number(body.bookingTarget):undefined);
  set_('WA_Template',    body.waTemplate);
  set_('SMS_Template',   body.smsTemplate);
  set_('Email_Template', body.emailTemplate);
  set_('Email_Subject',  body.emailSubject);
  audit_(ss,t_(body.adminUser||'admin'),'SETTINGS_UPDATED','Settings changed');
  return resp({success:true,message:'Settings saved!'});
}

// ── AUDIT LOG ──
function handleGetAudit(ss,e){
  var sheet=ss.getSheetByName(S.audit); if(!sheet) return resp({success:true,logs:[]});
  var data=sheet.getDataRange().getDisplayValues();
  if(data.length<2) return resp({success:true,logs:[]});
  var limit=parseInt((e&&e.parameter&&e.parameter.limit)||'300')||300;
  return resp({success:true,logs:data.slice(1).reverse().slice(0,limit)});
}

// ── BACKUP ──
function handleCreateBackup(ss,body){
  var sheet=getOrCreate_(ss,S.backups);
  var bid='BK'+Date.now().toString(36).toUpperCase();
  var snap={
    Users:  getRaw_(ss,S.users), Sheet1: getRaw_(ss,S.daily),
    Sheet2: getRaw_(ss,S.leads), Settings:getRaw_(ss,S.settings), Teams:getRaw_(ss,S.teams)
  };
  sheet.appendRow([bid,now_(),'FULL',JSON.stringify(snap)]);
  audit_(ss,t_(body.adminUser||'admin'),'BACKUP_CREATED',bid);
  return resp({success:true,message:'Backup created!',backupID:bid});
}
function handleGetBackups(ss){
  var sheet=ss.getSheetByName(S.backups); if(!sheet) return resp({success:true,backups:[]});
  var data=sheet.getDataRange().getValues(); if(data.length<2) return resp({success:true,backups:[]});
  var backups=data.slice(1).reverse().slice(0,20).map(function(r){return{id:r[0],timestamp:r[1],type:r[2]};});
  return resp({success:true,backups:backups});
}
function handleRestoreBackup(ss,body){
  var sheet=ss.getSheetByName(S.backups); if(!sheet) return resp({success:false,message:'No backups'});
  var rows=sheet.getDataRange().getValues();
  var bid=t_(body.backupID||''),found=null;
  for(var i=1;i<rows.length;i++){if(t_(rows[i][0])===bid){found=rows[i];break;}}
  if(!found) return resp({success:false,message:'Backup not found'});
  var snap; try{snap=JSON.parse(found[3]||'{}');}catch(e){return resp({success:false,message:'Corrupt backup'});}
  // Restore Settings
  if(snap.Settings&&snap.Settings.length>1){
    var ss2=getOrCreate_(ss,S.settings),sd=ss2.getDataRange().getValues(),sm={};
    sd.forEach(function(r,i){if(r[0])sm[t_(r[0])]=i+1;});
    snap.Settings.slice(1).forEach(function(r){if(!r[0])return;var k=t_(r[0]);if(sm[k])ss2.getRange(sm[k],2).setValue(r[1]);else ss2.appendRow(r);});
  }
  // Restore Teams
  if(snap.Teams&&snap.Teams.length>1){
    var ts2=getOrCreate_(ss,S.teams),lr=ts2.getLastRow();
    if(lr>1)ts2.deleteRows(2,lr-1);
    snap.Teams.slice(1).forEach(function(r){if(r[0])ts2.appendRow(r);});
  }
  audit_(ss,t_(body.adminUser||'admin'),'BACKUP_RESTORED',bid);
  return resp({success:true,message:'Backup '+bid+' restored!'});
}

// ── HELPERS ──
function getSheetData_(ss,name){
  var sheet=ss.getSheetByName(name); if(!sheet) return [];
  var data=sheet.getDataRange().getDisplayValues(); if(data.length<2) return [];
  var hdrs=data[0].map(function(h){return t_(h).replace(/[^a-zA-Z0-9]/g,'_').replace(/_+/g,'_').replace(/_$/,'');});
  return data.slice(1).filter(function(r){return r[0]&&t_(r[0]);}).map(function(row,ri){
    var obj={_rowIndex:ri+2};
    hdrs.forEach(function(h,i){obj[h]=t_(row[i]);});
    return obj;
  });
}
function getSafeUsers_(ss){
  var sheet=ss.getSheetByName(S.users); if(!sheet) return [];
  var data=sheet.getDataRange().getValues(); if(data.length<2) return [];
  // Users: UserID(A=0)|Username(B=1)|Password(C=2)|Role(D=3)|Designation(E=4)|FullName(F=5)|Phone(G=6)|Email(H=7)|Status(I=8)|Team(J=9)
  return data.slice(1).filter(function(r){return r[1];}).map(function(r){
    return {userID:t_(r[0]),username:t_(r[1]).toLowerCase(),role:t_(r[3]),designation:t_(r[4]),fullName:t_(r[5]||r[1]),phone:t_(r[6]),email:t_(r[7]),status:t_(r[8]||'active'),team:t_(r[9])};
  });
}
function getSettings_(ss){
  var sheet=ss.getSheetByName(S.settings);
  var def={Call_Target:50,Booking_Target:2,WA_Template:'',SMS_Template:'',Email_Template:'',Email_Subject:''};
  if(!sheet) return def;
  var data=sheet.getDataRange().getValues();
  var s=Object.assign({},def);
  data.slice(1).forEach(function(r){if(r[0])s[t_(r[0])]=r[1];});
  return s;
}
function getTeams_(ss){
  var sheet=ss.getSheetByName(S.teams); if(!sheet) return [];
  var data=sheet.getDataRange().getValues(); if(data.length<2) return [];
  return data.slice(1).filter(function(r){return r[0];}).map(function(r){
    var m=[]; try{m=JSON.parse(t_(r[1])||'[]');}catch(e){}
    return {teamName:t_(r[0]),members:m,description:t_(r[2]),created:r[3]};
  });
}
function upsertRow_(sheet,keyCol,keyVal,rowData){
  var rows; try{rows=sheet.getDataRange().getValues();}catch(e){rows=[];}
  var kv=keyVal.toString().toLowerCase();
  for(var i=1;i<rows.length;i++){if(t_(rows[i][keyCol]).toLowerCase()===kv){sheet.getRange(i+1,1,1,rowData.length).setValues([rowData]);return;}}
  sheet.appendRow(rowData);
}
function audit_(ss,actor,action,detail){getOrCreate_(ss,S.audit).appendRow([now_(),actor||'',action||'',detail||'']);}
function getOrCreate_(ss,name){return ss.getSheetByName(name)||ss.insertSheet(name);}
function getRaw_(ss,name){var sh=ss.getSheetByName(name);return sh?sh.getDataRange().getValues():[];}
function generateUID_(){
  var chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',id='SR';
  for(var i=0;i<8;i++)id+=chars[Math.floor(Math.random()*chars.length)];
  return id;
}
