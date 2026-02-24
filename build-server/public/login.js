const REMEMBER_PREF_KEY = "facturance_login_remember";

function getEls() {
  return {
    username: document.getElementById("u"),
    password: document.getElementById("p"),
    remember: document.getElementById("rememberMe"),
    errBox: document.getElementById("err"),
    btn: document.getElementById("btn"),
  };
}

function getRememberPreference() {
  try {
    return localStorage.getItem(REMEMBER_PREF_KEY) === "1";
  } catch {
    return false;
  }
}

function setRememberPreference(remember) {
  try {
    localStorage.setItem(REMEMBER_PREF_KEY, remember ? "1" : "0");
  } catch {}
}

function canUseCredentialApi() {
  return Boolean(window.PasswordCredential && navigator.credentials?.get && navigator.credentials?.store);
}

async function prefillFromCredentialStore() {
  if (!canUseCredentialApi()) return;

  const { username, password } = getEls();
  if (!username || !password) return;

  try {
    const credential = await navigator.credentials.get({
      password: true,
      mediation: "optional",
    });

    if (!credential) return;
    if (credential.id) username.value = credential.id;
    if (typeof credential.password === "string") password.value = credential.password;
  } catch (err) {
    console.warn("Credential prefill unavailable:", err?.message || err);
  }
}

async function storeCredential(username, password) {
  if (!canUseCredentialApi()) return;

  try {
    const credential = new PasswordCredential({
      id: username,
      password,
      name: username,
    });
    await navigator.credentials.store(credential);
  } catch (err) {
    console.warn("Credential store unavailable:", err?.message || err);
  }
}

async function login() {
  const { username, password, remember, errBox } = getEls();
  if (!username || !password || !remember || !errBox) return;

  errBox.textContent = "";

  const inputUsername = username.value.trim();
  const inputPassword = password.value;
  const rememberMe = Boolean(remember.checked);

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: inputUsername, password: inputPassword, remember: rememberMe }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      errBox.textContent = data.error || "Login failed";
      return;
    }

    setRememberPreference(rememberMe);
    if (rememberMe) {
      await storeCredential(inputUsername, inputPassword);
    } else if (navigator.credentials?.preventSilentAccess) {
      await navigator.credentials.preventSilentAccess().catch(() => {});
    }

    window.location.href = "/app";
  } catch (e) {
    errBox.textContent = "Cannot reach server (is node server.js running?)";
    console.error(e);
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  const { username, password, remember, btn } = getEls();
  if (!username || !password || !remember || !btn) return;

  remember.checked = getRememberPreference();

  if (remember.checked) {
    await prefillFromCredentialStore();
  }

  btn.addEventListener("click", login);
  username.addEventListener("keydown", (e) => {
    if (e.key === "Enter") login();
  });
  password.addEventListener("keydown", (e) => {
    if (e.key === "Enter") login();
  });
});
