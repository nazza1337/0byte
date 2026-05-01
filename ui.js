function $(a){let b=document.getElementById(a);if(!b)console.warn(`Element with id="${a}" not found`);return b}
function getEl(a){return document.getElementById(a)}
async function showMasterPasswordPrompt(a=false){return new Promise(async(b)=>{let c=document.querySelector('.master-password-modal');if(c)c.remove();let d=document.createElement('div');d.className='master-password-modal';d.innerHTML=`<div class="master-password-content"><h2>🔐 ${a?'Create master password':'Enter master password'}</h2><p>${a?'Protects your keys and chat history. Do not lose it!':'Required to decrypt data.'}</p><input type="password" id="master-password-input" placeholder="Master password" autocomplete="off" />${a?'<input type="password" id="master-password-confirm" placeholder="Confirm password" autocomplete="off" />':''}<button class="btn-primary" id="master-password-submit">${a?'Create':'Login'}</button><div class="master-error" id="master-error"></div>${!a?'<p style="margin-top:12px;font-size:0.8rem;color:var(--text-secondary);">If you forget your password, data is lost.</p>':''}</div>`;document.body.appendChild(d);let e=document.getElementById('master-password-submit'),f=document.getElementById('master-error'),g=document.getElementById('master-password-input');e.onclick=async()=>{let h=g.value.trim();if(!h||h.length<6){f.textContent='Password must be at least 6 characters';return}if(a){let i=document.getElementById('master-password-confirm');if(h!==i.value.trim()){f.textContent='Passwords do not match';return}}try{if(a){let j=await CryptoSystem.encryptWithMaster('test',h);if(!j){f.textContent='Key creation error';return}}else{let k=localStorage.getItem('contacts_encrypted');if(k){let l=await CryptoSystem.decryptWithMaster(k,h);if(l===null){f.textContent='Incorrect password';return}}else{let m=localStorage.getItem('contacts');if(m){let n=await CryptoSystem.encryptWithMaster(m,h);localStorage.setItem('contacts_encrypted',n);localStorage.removeItem('contacts');let o=Object.keys(localStorage).filter(p=>p.startsWith('history_'));for(let q of o){let r=localStorage.getItem(q);if(r){let s=await CryptoSystem.encryptWithMaster(r,h);localStorage.setItem(q+'_enc',s);localStorage.removeItem(q)}}}}}masterPassword=h;d.remove();b()}catch(t){f.textContent='Error: '+t.message}};g.onkeydown=(h)=>{if(h.key==='Enter')e.click()};g.focus()})}
async function loadSettings(){myName=localStorage.getItem('myName')||'You';myAvatar=localStorage.getItem('myAvatar')||'';currentUser=localStorage.getItem('uid');if(!currentUser){currentUser=CryptoSystem.generateKey().slice(0,16);localStorage.setItem('uid',currentUser)}let a=getEl('name-input');if(a)a.value=myName;let b=getEl('avatar-input');if(b)b.value=myAvatar;if(masterPassword){let c=localStorage.getItem('contacts_encrypted');if(c){let d=await CryptoSystem.decryptWithMaster(c,masterPassword);contacts=d?JSON.parse(d):{}}else{let e=localStorage.getItem('contacts');if(e){contacts=JSON.parse(e);await CryptoSystem.saveEncryptedContacts(contacts,masterPassword);localStorage.removeItem('contacts')}else contacts={}}}else contacts=JSON.parse(localStorage.getItem('contacts')||'{}');renderContactList();let f=localStorage.getItem('activePeer');if(f&&contacts[f]){activePeer=f;openChat(f)}else{let g=$('main-chat'),h=$('sidebar');if(g)g.classList.add('hidden');if(h)h.classList.remove('hidden')}}
function renderContactList(){let a=getEl('contact-list');if(!a)return;a.innerHTML='';Object.entries(contacts).forEach(([b,c])=>{let d=document.createElement('div');d.className='contact-item'+(b===activePeer?' active':'');d.innerHTML=`<span class="contact-avatar">${c.avatar||'👤'}</span><span class="contact-name">${c.name||b.slice(0,8)}</span><button class="delete-btn" onclick="event.stopPropagation(); deleteChat('${b}')">✕</button>`;d.onclick=()=>{activePeer=b;localStorage.setItem('activePeer',b);openChat(b)};a.appendChild(d)})}
async function deleteChat(a){if(!confirm('Delete chat and history with '+(contacts[a]?.name||a)+'?'))return;let b=`history_${[currentUser,a].sort().join('_')}`,c=`pinned_${a}`;if(masterPassword)localStorage.removeItem(`hist_${b}`);else localStorage.removeItem(b);localStorage.removeItem(c);localStorage.removeItem(`role_${a}`);delete contacts[a];await saveContacts();if(activePeer===a){activePeer=null;localStorage.removeItem('activePeer');let d=$('main-chat'),e=$('sidebar');if(d)d.classList.add('hidden');if(e)e.classList.remove('hidden')}renderContactList()}
async function saveContacts(){if(masterPassword)await CryptoSystem.saveEncryptedContacts(contacts,masterPassword);else localStorage.setItem('contacts',JSON.stringify(contacts))}
function openChat(a){if(!contacts[a]){contacts[a]={name:a.slice(0,8),avatar:''};saveContacts();renderContactList()}if(dataChannel&&dataChannel.readyState==='open'&&connectedPeerId===a){updateUIForPeer(a);return}if(contacts[a].localSessionKey){pendingLocalKey=contacts[a].localSessionKey;connectedPeerId=a;setupPeerConnection(a);updateUIForPeer(a);setTimeout(()=>{if(!dataChannel||dataChannel.readyState!=='open'){let b=$('restore-panel');if(b)b.classList.add('visible')}},5000)}else{pendingLocalKey=CryptoSystem.generateKey();contacts[a].localSessionKey=pendingLocalKey;saveContacts();connectedPeerId=a;setupPeerConnection(a);updateUIForPeer(a)}}
function restoreChat(){let a=activePeer||connectedPeerId;if(!a)return;restoreSession(a)}
function updateUIForPeer(a){console.log('updateUIForPeer called for:',a);activePeer=a;localStorage.setItem('activePeer',a);let b=$('main-chat'),c=$('sidebar');if(b){b.classList.remove('hidden');b.style.display='flex'}if(c&&window.innerWidth<=700){c.classList.remove('visible');c.classList.add('hidden')}let d=contacts[a]||{},e=$('chat-name');if(e)e.textContent=d.name||a.slice(0,8);let f=$('chat-avatar');if(f)f.textContent=d.avatar||'👤';let g=$('chat-status');if(g){let h=dataChannel&&dataChannel.readyState==='open';g.textContent=h?'online':'connecting...'}updateKeyDisplay();loadMessages(a);renderContactList();if(dataChannel&&dataChannel.readyState==='open'){let i=$('restore-panel');if(i)i.classList.remove('visible')}}
async function loadMessages(a){let b=$('messages');if(!b)return;let c=await loadMessageHistory(a);b.innerHTML='';let d=contacts[a]?.localSessionKey,e=contacts[a]?.remoteKey;for(let f of c){let g=f.from===currentUser,h='';if(f.type==='image'){let i=g?e:d;if(i&&f.ciphertext){try{let j=await CryptoSystem.decryptData(f.ciphertext,i);if(j){let k=new Blob([j],{type:f.mimeType||'image/jpeg'}),l=URL.createObjectURL(k);h=`<img src="${l}" alt="image" loading="lazy" class="chat-image" onclick="openLightbox('${l}')" />`}else h='🔒 Encrypted image'}catch(m){h='🔒 Encrypted image'}}else h='🔒 Encrypted image'}else{let i=g?e:d;if(i&&f.ciphertext){let j=await CryptoSystem.decrypt(f.ciphertext,i);h=j!==null?j:'🔒 Encrypted'}else h='🔒 Encrypted'}let n=document.createElement('div');n.className=`message ${g?'my-message':'other-message'}`;n.innerHTML=`<div class="message-content">${h}</div><div class="message-time">${new Date(f.timestamp).toLocaleTimeString()}</div>`;b.appendChild(n)}setTimeout(()=>{b.scrollTop=b.scrollHeight},100)}
function updateOnlineStatus(){let a=$('online-status');if(a){let b=(dataChannel&&dataChannel.readyState==='open')?'🟢 Online':'⚪ Offline';a.innerText=b}let c=$('chat-status');if(c&&activePeer){c.textContent=(dataChannel&&dataChannel.readyState==='open')?'online':'offline'}let d=$('restore-panel');if(d&&activePeer){if(dataChannel&&dataChannel.readyState==='open')d.classList.remove('visible')}}
function updateKeyDisplay(){if(!activePeer)return;let a=$('my-key-display'),b=$('partner-key-display'),c=contacts[activePeer]?.localSessionKey,d=contacts[activePeer]?.remoteKey;if(a)a.innerText=c?c.slice(0,8)+'...':'none';if(b)b.innerText=d?d.slice(0,8)+'...':'(waiting...)'}
function handleImageUpload(a){let b=a.target.files[0];if(b){sendImage(b);a.target.value=''}}
function showNewChat(){resetToRoleSelect();let a=$('new-chat-modal');if(a)a.classList.remove('hidden')}
function closeNewChat(){let a=$('new-chat-modal');if(a)a.classList.add('hidden')}
function resetToRoleSelect(){showSection('role-select-section');document.querySelectorAll('.step-content').forEach(a=>a.classList.remove('visible'))}
function showSection(a){['role-select-section','host-flow','join-flow'].forEach(b=>{let c=getEl(b);if(c)c.classList.add('hidden')});let d=getEl(a);if(d)d.classList.remove('hidden');document.querySelectorAll('.step-content').forEach(e=>e.classList.remove('visible'))}
function showSettings(){let a=$('settings-modal');if(a)a.classList.remove('hidden')}
function closeSettings(){let a=$('settings-modal');if(a)a.classList.add('hidden')}
async function saveSettings(){let a=$('name-input'),b=$('avatar-input');myName=a?a.value.trim()||'You':'You';myAvatar=b?b.value.trim()||'':'';localStorage.setItem('myName',myName);localStorage.setItem('myAvatar',myAvatar);closeSettings();renderContactList()}
function toggleTheme(){let a=$('theme-toggle');if(a){document.body.classList.toggle('light',!a.checked);localStorage.setItem('theme',a.checked?'dark':'light')}}
function loadTheme(){let a=$('theme-toggle'),b=localStorage.getItem('theme');if(b==='light'){document.body.classList.add('light');if(a)a.checked=false}else{document.body.classList.remove('light');if(a)a.checked=true}}
function toggleSidebar(){let a=$('sidebar'),b=$('main-chat');if(a)a.classList.toggle('visible');if(b)b.classList.toggle('shifted')}
async function deleteAllChats(){let a=Object.keys(contacts).length;if(a===0){alert('No chats to delete.');return}let b=confirm(`⚠️ Are you sure you want to delete ALL chats?\n\nChats to delete: ${a}\nAll message history and keys will be lost forever.\n\nThis action cannot be undone!`);if(!b)return;let c=confirm(`Are you absolutely sure? Enter the number of chats (${a}) to confirm:`);if(!c)return;try{if(dataChannel){dataChannel.close();dataChannel=null}if(peerConnection){peerConnection.close();peerConnection=null}if(keySendInterval){clearInterval(keySendInterval);keySendInterval=null}for(let d of Object.keys(contacts)){let e=`history_${[currentUser,d].sort().join('_')}`,f=`pinned_${d}`;if(masterPassword)localStorage.removeItem(`hist_${e}`);else localStorage.removeItem(e);localStorage.removeItem(f);localStorage.removeItem(`role_${d}`);localStorage.removeItem(f+'_enc')}contacts={};if(masterPassword)await CryptoSystem.saveEncryptedContacts(contacts,masterPassword);else localStorage.setItem('contacts',JSON.stringify(contacts));activePeer=null;connectedPeerId=null;verifiedFingerprints={};localStorage.removeItem('activePeer');renderContactList();let g=$('main-chat'),h=$('sidebar');if(g)g.classList.add('hidden');if(h){h.classList.remove('hidden');if(window.innerWidth<=700)h.classList.add('visible')}let i=$('messages');if(i){i.innerHTML=`<div class="empty-state"><div class="empty-icon">💬</div><p>Select or create a new chat</p></div>`}let j=$('restore-panel');if(j)j.classList.remove('visible');let k=$('my-key-display'),l=$('partner-key-display');if(k)k.innerText='none';if(l)l.innerText='(waiting...)';updateOnlineStatus();closeSettings();alert(`✅ All chats successfully deleted (${a} items)`)}catch(m){console.error('Error deleting chats:',m);alert('❌ An error occurred while deleting chats.')}}

function openLightbox(imageSrc) {
    let existing = document.querySelector('.lightbox-overlay');
    if (existing) existing.remove();

    let overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';

    let img = document.createElement('img');
    img.src = imageSrc;
    img.className = 'lightbox-image';

    let closeBtn = document.createElement('button');
    closeBtn.className = 'lightbox-close';
    closeBtn.innerHTML = '✕';
    closeBtn.title = 'Close (Esc)';

    overlay.appendChild(img);
    overlay.appendChild(closeBtn);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            overlay.remove();
        }
    });

    closeBtn.addEventListener('click', function() {
        overlay.remove();
    });

    function escHandler(e) {
        if (e.key === 'Escape') {
            overlay.remove();
            document.removeEventListener('keydown', escHandler);
        }
    }
    document.addEventListener('keydown', escHandler);
}