const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

const storageKeys = {
  users: "regasUsers",
  session: "regasSession",
  sessionTemp: "regasSessionTemp",
};

const readJson = (storage, key) => {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
};

const writeJson = (storage, key, value) => {
  storage.setItem(key, JSON.stringify(value));
};

const normalizeEmail = (value) => value.trim().toLowerCase();

const getUsers = () => readJson(localStorage, storageKeys.users) || [];
const setUsers = (users) => writeJson(localStorage, storageKeys.users, users);

const getSession = () => {
  return (
    readJson(localStorage, storageKeys.session) ||
    readJson(sessionStorage, storageKeys.sessionTemp)
  );
};

const setSession = (user, remember) => {
  if (remember) {
    writeJson(localStorage, storageKeys.session, user);
    sessionStorage.removeItem(storageKeys.sessionTemp);
  } else {
    writeJson(sessionStorage, storageKeys.sessionTemp, user);
    localStorage.removeItem(storageKeys.session);
  }
};

const clearSession = () => {
  localStorage.removeItem(storageKeys.session);
  sessionStorage.removeItem(storageKeys.sessionTemp);
};

const setMessage = (scope, message, type = "info") => {
  const target = document.querySelector(`[data-auth-message="${scope}"]`);
  if (!target) return;
  target.textContent = message;
  target.classList.remove("error", "success");
  if (type === "error") target.classList.add("error");
  if (type === "success") target.classList.add("success");
};

const updateNavForAuth = (session) => {
  if (!navLinks) return;

  const loginLink = navLinks.querySelector('a[href="auth.html"]');
  const signupLink = navLinks.querySelector('a[href="auth.html#signup"]');
  const existingProfile = navLinks.querySelector(".nav-auth-profile");
  const existingLogout = navLinks.querySelector(".nav-auth-logout");

  if (session) {
    if (loginLink) loginLink.style.display = "none";
    if (signupLink) signupLink.style.display = "none";

    if (!existingProfile) {
      const profileLink = document.createElement("a");
      profileLink.className = "nav-link nav-auth-profile";
      profileLink.href = "profile.html";
      profileLink.textContent = "Profile";
      navLinks.appendChild(profileLink);
    }

    if (!existingLogout) {
      const logoutButton = document.createElement("button");
      logoutButton.type = "button";
      logoutButton.className = "nav-link nav-auth-logout";
      logoutButton.textContent = "Logout";
      logoutButton.addEventListener("click", () => {
        clearSession();
        window.location.href = "index.html";
      });
      navLinks.appendChild(logoutButton);
    }
  } else {
    if (loginLink) loginLink.style.display = "";
    if (signupLink) signupLink.style.display = "";
    if (existingProfile) existingProfile.remove();
    if (existingLogout) existingLogout.remove();
  }
};

const authForms = document.querySelectorAll("[data-auth-form]");

if (authForms.length > 0) {
  const loginForm = document.querySelector('[data-auth-form="login"]');
  const signupForm = document.querySelector('[data-auth-form="signup"]');

  if (loginForm) {
    loginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(loginForm);
      const email = normalizeEmail(formData.get("email") || "");
      const password = String(formData.get("password") || "");
      const remember = Boolean(formData.get("remember"));

      if (!email || !password) {
        setMessage("login", "Enter your email and password to continue.", "error");
        return;
      }

      const users = getUsers();
      const user = users.find((item) => item.email === email);

      if (!user || user.password !== password) {
        setMessage("login", "We could not match those credentials.", "error");
        return;
      }

      setSession(
        {
          name: user.name,
          handle: user.handle,
          email: user.email,
          joinedAt: user.joinedAt,
        },
        remember
      );
      setMessage("login", "Welcome back. Redirecting to your profile...", "success");
      setTimeout(() => {
        window.location.href = "profile.html";
      }, 700);
    });
  }

  if (signupForm) {
    signupForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(signupForm);
      const name = String(formData.get("name") || "").trim();
      const handleRaw = String(formData.get("handle") || "").trim();
      const email = normalizeEmail(formData.get("email") || "");
      const password = String(formData.get("password") || "");
      const confirm = String(formData.get("confirm") || "");

      const handle = handleRaw.startsWith("@") ? handleRaw : `@${handleRaw}`;
      const handleValid = /^@[a-z0-9_]{3,18}$/i.test(handle);

      if (!name || name.length < 2) {
        setMessage("signup", "Add a display name so people recognize you.", "error");
        return;
      }

      if (!handleValid) {
        setMessage("signup", "Choose a gamer tag like @player_01 (3-18 letters/numbers).", "error");
        return;
      }

      if (!email || !email.includes("@")) {
        setMessage("signup", "Use a valid email address to create your account.", "error");
        return;
      }

      if (password.length < 6) {
        setMessage("signup", "Passwords need at least 6 characters.", "error");
        return;
      }

      if (password !== confirm) {
        setMessage("signup", "Passwords do not match yet. Try again.", "error");
        return;
      }

      const users = getUsers();
      const emailExists = users.some((item) => item.email === email);
      const handleExists = users.some((item) => item.handle.toLowerCase() === handle.toLowerCase());

      if (emailExists) {
        setMessage("signup", "That email is already registered. Try logging in.", "error");
        return;
      }

      if (handleExists) {
        setMessage("signup", "That gamer tag is taken. Try a different one.", "error");
        return;
      }

      const newUser = {
        id: `user_${Date.now()}`,
        name,
        handle,
        email,
        password,
        joinedAt: new Date().toISOString(),
      };

      users.push(newUser);
      setUsers(users);
      setSession(
        {
          name: newUser.name,
          handle: newUser.handle,
          email: newUser.email,
          joinedAt: newUser.joinedAt,
        },
        true
      );
      setMessage("signup", "Account created. Taking you to your profile...", "success");
      setTimeout(() => {
        window.location.href = "profile.html";
      }, 700);
    });
  }

  document.querySelectorAll("[data-auth-action]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      const action = button.getAttribute("data-auth-action");
      if (action === "discord") {
        setMessage("login", "Discord login is coming soon. Use email for now.", "error");
      }
      if (action === "reset") {
        setMessage("login", "Password resets are coming soon. Create a new account for now.", "error");
      }
    });
  });
}

const hydrateProfile = (session) => {
  if (!session) return;
  const avatar = document.querySelector("[data-profile-avatar]");
  const handle = document.querySelector("[data-profile-handle]");
  const tagline = document.querySelector("[data-profile-tagline]");
  const joined = document.querySelector("[data-profile-joined]");

  if (avatar) {
    const initials = session.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("");
    avatar.textContent = initials || session.handle.replace("@", "").slice(0, 2).toUpperCase();
  }
  if (handle) handle.textContent = session.handle;
  if (tagline) tagline.textContent = `${session.name} is ready to upload their next highlight.`;
  if (joined) {
    const date = new Date(session.joinedAt);
    if (!Number.isNaN(date.getTime())) {
      const label = date.toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      });
      joined.textContent = `Joined ${label}`;
    }
  }
};

const session = getSession();
updateNavForAuth(session);

if (document.body && document.body.dataset.requiresAuth === "true" && !session) {
  window.location.href = "auth.html";
} else if (document.body && document.body.dataset.page === "profile") {
  hydrateProfile(session);
}

const reels = Array.from(document.querySelectorAll(".reel-full"));

if (reels.length > 0) {
  let isSnapping = false;
  window.addEventListener(
    "wheel",
    (event) => {
      if (isSnapping) return;
      if (Math.abs(event.deltaY) < 4) return;

      const currentIndex = reels.findIndex((reel) => {
        const rect = reel.getBoundingClientRect();
        return rect.top >= -10 && rect.top < window.innerHeight * 0.5;
      });

      const direction = event.deltaY > 0 ? 1 : -1;
      const nextIndex = currentIndex === -1
        ? 0
        : Math.max(0, Math.min(reels.length - 1, currentIndex + direction));

      if (nextIndex === currentIndex) return;

      isSnapping = true;
      reels[nextIndex].scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => {
        isSnapping = false;
      }, 650);
    },
    { passive: true }
  );
}
