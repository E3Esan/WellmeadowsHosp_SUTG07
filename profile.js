function generatePasswordSuggestion(targetId) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  let out = '';
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
  if (targetId) {
    const el = document.getElementById(targetId);
    if (el) el.value = out;
    return out;
  }
  const modalNew = document.getElementById('change-new-pass');
  const panelNew = document.getElementById('profile-new-pass');
  if (modalNew) modalNew.value = out;
  if (panelNew) panelNew.value = out;
  return out;
}

// Add show/hide toggle buttons to all password inputs across the app
function enhancePasswordInputs() {
  const inputs = Array.from(document.querySelectorAll('input[type="password"]'));
  inputs.forEach(input => {
    if (input.dataset.pwEnhanced) return;
    input.dataset.pwEnhanced = '1';

    const parent = input.parentElement || input.parentNode;
    if (parent && getComputedStyle(parent).position === 'static') parent.style.position = 'relative';

    if (!parent.classList.contains('pw-wrap')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'pw-wrap';
      parent.replaceChild(wrapper, input);
      wrapper.appendChild(input);
    }

    input.classList.add('pw-input');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pw-toggle';
    btn.title = 'Show password';
    btn.innerText = '👁';
    const show = (e) => { if (e) e.preventDefault(); input.type = 'text'; btn.classList.add('showing'); btn.title = 'Hide password'; };
    const hide = (e) => { if (e) e && e.preventDefault && e.preventDefault(); input.type = 'password'; btn.classList.remove('showing'); btn.title = 'Show password'; };

    btn.addEventListener('mousedown', show);
    btn.addEventListener('touchstart', show, { passive: false });
    btn.addEventListener('mouseup', hide);
    btn.addEventListener('mouseleave', hide);
    btn.addEventListener('touchend', hide);
    btn.addEventListener('touchcancel', hide);

    btn.addEventListener('keydown', function (e) {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); show(); }
    });
    btn.addEventListener('keyup', function (e) {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); hide(); }
    });

    const wrap = input.parentElement;
    wrap.appendChild(btn);
  });
}

window.addEventListener('DOMContentLoaded', enhancePasswordInputs);
setTimeout(enhancePasswordInputs, 200);

async function persistProfileField(patch) {
  try {
    const res = await fetch(AUTH_API + '?action=update_profile', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not save.');
    setCurrentUser(data.user);
    return data.user;
  } catch (e) {
    showToast(e.message, 'error');
    return null;
  }
}

async function profileUploadImage(dataUrl) {
  if (!getCurrentUser()) { sessionStorage.setItem('profileAvatar', dataUrl); return; }
  const avatarEl = document.getElementById('profile-avatar-img');
  const settingsPreview = document.getElementById('profile-avatar-settings-img');
  if (avatarEl) avatarEl.src = dataUrl;
  if (settingsPreview) settingsPreview.src = dataUrl;

  const updated = await persistProfileField({ avatar: dataUrl });
  if (updated) {
    showToast('Profile image updated.');
    // Keep the header's round profile button in sync immediately, instead
    // of only picking up the new avatar on next login/reload.
    if (typeof updateAuthButton === 'function') updateAuthButton();
  }
}

async function removeProfileAvatar() {
  if (getCurrentUser()) {
    await persistProfileField({ avatar: '' });
  } else {
    sessionStorage.removeItem('profileAvatar');
  }
  const avatarEl = document.getElementById('profile-avatar-img');
  if (avatarEl) avatarEl.src = '';
  const settingsPreview = document.getElementById('profile-avatar-settings-img');
  if (settingsPreview) settingsPreview.src = '';
  if (typeof updateAuthButton === 'function') updateAuthButton();
}

function profileDownloadImage() {
  const avatarEl = document.getElementById('profile-avatar-img');
  if (!avatarEl || !avatarEl.src) { alert('No image to download'); return; }
  const a = document.createElement('a');
  a.href = avatarEl.src;
  a.download = (document.getElementById('profile-username') ? document.getElementById('profile-username').textContent : 'profile') + '.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function saveProfileInfo() {
  const infoEl = document.getElementById('profile-info');
  const info = infoEl ? infoEl.textContent.trim() : '';
  if (!getCurrentUser()) { sessionStorage.setItem('profileInfo', info); return; }
  const updated = await persistProfileField({ info });
  if (updated) showToast('Profile info saved.');
}

function openProfileImageOptions() {
  openProfileFileDialog();
}
