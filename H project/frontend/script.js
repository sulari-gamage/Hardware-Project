const apiBase = "http://localhost:5000";

let isLogin = true;

const authBtn = document.getElementById("auth-btn");
const toggleAuth = document.getElementById("toggle-auth");
const authTitle = document.getElementById("auth-title");
const authMessage = document.getElementById("auth-message");
const toggleLink = document.getElementById("toggle-link");
window.location.href = "dashboard.html";


function setMessage(msg, error = true) {
  authMessage.textContent = msg;
  authMessage.style.color = error ? "red" : "green";
}

function updateAuthUI() {
  authTitle.textContent = isLogin ? "Login" : "Register";
  authBtn.textContent = isLogin ? "Login" : "Register";
  toggleLink.innerHTML = isLogin
    ? `Don't have an account? <a href="#" id="toggle-auth">Register here</a>`
    : `Already have an account? <a href="#" id="toggle-auth">Login here</a>`;

  // Re-attach event listener to new link
  document.getElementById("toggle-auth").addEventListener("click", (e) => {
    e.preventDefault();
    isLogin = !isLogin;
    updateAuthUI();
  });
}

// Initial setup
updateAuthUI();

// Button click: Login or Register
authBtn.addEventListener("click", () => {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!username || !password) {
    setMessage("Please enter both username and password.");
    return;
  }

  const endpoint = isLogin ? "login" : "register";

  fetch(`${apiBase}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  })
    .then((res) => {
      if (!res.ok) return res.json().then((d) => Promise.reject(d.message));
      return res.json();
    })
    .then((data) => {
      setMessage(data.message || "Success", false);
      if (isLogin) {
        sessionStorage.setItem("username", username);
        window.location.href = "dashboard.html";
      } else {
        // Switch to login after registering
        isLogin = true;
        updateAuthUI();
      }
    })
    .catch((err) => {
      setMessage(err || "Something went wrong.");
    });
});
