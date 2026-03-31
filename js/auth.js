/**
 * auth.js – Authentication UI and API integration.
 */
const Auth = (() => {
  let isLoginMode = true;

  function init() {
    const authForm = document.getElementById('auth-form');
    const switchBtn = document.getElementById('auth-switch-btn');
    const logoutBtn = document.getElementById('logout-btn');

    switchBtn.addEventListener('click', toggleMode);
    authForm.addEventListener('submit', handleAuth);
    logoutBtn.addEventListener('click', logout);

    checkAuth();
  }

  function toggleMode() {
    isLoginMode = !isLoginMode;
    const registerFields = document.getElementById('register-fields');
    const nameInput = document.getElementById('auth-name');
    const submitText = document.getElementById('auth-submit-text');
    const switchText = document.getElementById('auth-switch-text');
    const switchBtn = document.getElementById('auth-switch-btn');

    if (isLoginMode) {
      registerFields.classList.add('hidden');
      nameInput.removeAttribute('required');
      submitText.textContent = 'Sign In';
      switchText.textContent = "Don't have an account?";
      switchBtn.textContent = 'Create Account';
    } else {
      registerFields.classList.remove('hidden');
      nameInput.setAttribute('required', 'true');
      submitText.textContent = 'Sign Up';
      switchText.textContent = "Already have an account?";
      switchBtn.textContent = 'Sign In';
    }
  }

  async function handleAuth(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const name = document.getElementById('auth-name').value.trim();

    try {
      const endpoint = isLoginMode ? '/auth/login' : '/auth/register';
      const body = isLoginMode ? { email, password } : { name, email, password };

      const data = await API.request(endpoint, {
        method: 'POST',
        body: JSON.stringify(body)
      });

      API.setToken(data.token);
      localStorage.setItem('smp_user', JSON.stringify(data.user)); // Cache user
      showToast('Welcome to SapaSaver!', 'success');
      
      // Sync registration name into the encrypted vault
      if (data.user && data.user.name) {
        App.updateState({
          allowance: 0,
          userProfile: { 
            username: data.user.name, 
            avatar: data.user.name.charAt(0).toUpperCase() 
          }
        });
      }

      // Initialize main app
      App.loginInit();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function checkAuth() {
    const token = API.getToken();
    if (token) {
      App.loginInit();
    } else {
      App.logoutInit();
    }
  }

  function logout() {
    API.setToken(null);
    localStorage.removeItem('smp_user');
    App.logoutInit();
    showToast('Logged out successfully', 'info');
  }

  return { init, checkAuth, logout };
})();
