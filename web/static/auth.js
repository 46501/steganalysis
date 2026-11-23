/**
 * web/static/auth.js — Client-side authentication helpers, password strength, and modals.
 */

// Toast notification helper
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconSvg = type === 'success' 
    ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#10b981" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
    : type === 'error'
    ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
    : '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#06b6d4" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';

  toast.innerHTML = `${iconSvg}<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Password visibility toggle
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.auth-toggle-password');
  if (!btn) return;

  const inputId = btn.dataset.target;
  const input = inputId ? document.getElementById(inputId) : btn.previousElementSibling;
  if (!input) return;

  if (input.type === 'password') {
    input.type = 'text';
    btn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </svg>`;
    btn.setAttribute('aria-label', 'Hide password');
  } else {
    input.type = 'password';
    btn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>`;
    btn.setAttribute('aria-label', 'Show password');
  }
});

// Live password strength calculation
function initPasswordStrength(inputId, barId) {
  const input = document.getElementById(inputId);
  const bar = document.getElementById(barId);
  if (!input || !bar) return;

  input.addEventListener('input', () => {
    const pwd = input.value;
    let score = 0;

    const lengthOk = pwd.length >= 8;
    const upperOk = /[A-Z]/.test(pwd);
    const lowerOk = /[a-z]/.test(pwd);
    const numOk = /[0-9]/.test(pwd);
    const symOk = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?/~`]/.test(pwd);

    if (lengthOk) score++;
    if (upperOk && lowerOk) score++;
    if (numOk) score++;
    if (symOk) score++;

    // Update UI criteria checkmarks if present
    updateCriterion('crit-length', lengthOk);
    updateCriterion('crit-upper', upperOk);
    updateCriterion('crit-lower', lowerOk);
    updateCriterion('crit-number', numOk);
    updateCriterion('crit-symbol', symOk);

    bar.className = 'pwd-strength-fill';
    if (pwd.length > 0) {
      bar.classList.add(`strength-${score || 1}`);
    }
  });
}

function updateCriterion(id, isValid) {
  const el = document.getElementById(id);
  if (!el) return;
  if (isValid) {
    el.classList.add('valid');
  } else {
    el.classList.remove('valid');
  }
}

// Resend email verification
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('#resend-verification-btn');
  if (!btn) return;

  btn.disabled = true;
  const originalText = btn.innerHTML;
  btn.innerText = 'Sending…';

  try {
    const res = await fetch('/api/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
    });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message || 'Verification link sent!', 'success');
    } else {
      showToast(data.error || 'Failed to resend verification.', 'error');
    }
  } catch (err) {
    showToast('Network error while resending verification.', 'error');
  } finally {
    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }, 5000);
  }
});

// Modal helpers
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'flex';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
  }
}

// Enhanced AJAX form handling for smooth auth submissions and instant inline feedback
document.addEventListener('submit', async (e) => {
  const form = e.target.closest('.auth-form');
  if (!form) return;

  // Let multipart file upload forms handle natively
  if (form.enctype && form.enctype.includes('multipart')) return;

  e.preventDefault();

  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerText = 'Processing…';
  }

  // Remove existing inline alerts
  const existingAlert = form.parentElement.querySelector('.auth-alert');
  if (existingAlert) existingAlert.remove();

  try {
    const formData = new FormData(form);
    const payload = {};
    for (const [key, value] of formData.entries()) {
      payload[key] = value;
    }
    // Checkbox support
    form.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      payload[cb.name] = cb.checked;
    });

    const res = await fetch(form.action || window.location.href, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'same-origin',
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      if (data.redirect_url) {
        window.location.href = data.redirect_url;
      } else {
        window.location.reload();
      }
    } else {
      const errMsg = data.error || 'An error occurred. Please try again.';
      const alertDiv = document.createElement('div');
      alertDiv.className = 'auth-alert auth-alert-error';
      alertDiv.setAttribute('role', 'alert');
      alertDiv.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>${errMsg}</span>
      `;
      form.parentElement.insertBefore(alertDiv, form);

      if (data.field) {
        const fieldInput = form.querySelector(`[name="${data.field}"]`);
        if (fieldInput) fieldInput.focus();
      }
      showToast(errMsg, 'error');

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    }
  } catch (err) {
    // If fetch failed completely, fall back to standard browser form submission
    form.submit();
  }
});

