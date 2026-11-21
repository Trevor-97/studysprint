import {
  configured,
  registerWithEmail,
  auth,
  isFirebaseConfigured,
  initFirebaseServices,
  signInWithGooglePopup,
  signOutUser,
  watchAuthState,
  fetchCloudClasses,
  addCloudClass,
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from "./firebase.js";

const RESOURCES = [
  {
    id: "res-1",
    title: "Atomic Structure & Orbitals",
    topic: "General",
    type: "Notes",
    description: "Quantum numbers, electron configurations, and subshell energy diagrams.",
    url: "#replace-with-authorized-link"
  },
  {
    id: "res-2",
    title: "Mole & Stoichiometry Practice Set",
    topic: "General",
    type: "Practice problems",
    description: "Step-by-step limiting reagent, percent yield, and empirical formula problems.",
    url: "#replace-with-authorized-link"
  },
  {
    id: "res-3",
    title: "Functional Groups & Reaction Map",
    topic: "Organic",
    type: "Study guides",
    description: "Visual summary of substitution, elimination, and addition pathways.",
    url: "#replace-with-authorized-link"
  },
  {
    id: "res-4",
    title: "Stereochemistry & Chirality Workbook",
    topic: "Organic",
    type: "Practice problems",
    description: "R/S configuration drills, enantiomers, diastereomers, and meso compounds.",
    url: "#replace-with-authorized-link"
  },
  {
    id: "res-5",
    title: "Thermodynamics & Enthalpy Summary",
    topic: "Physical",
    type: "Notes",
    description: "Hess's law, calorimetry, entropy, and Gibbs free energy spontaneity rules.",
    url: "#replace-with-authorized-link"
  },
  {
    id: "res-6",
    title: "Acid-Base Titrations & Buffers Past Paper",
    topic: "Analytical",
    type: "Past papers",
    description: "Practice exam questions covering Henderson-Hasselbalch and equivalence points.",
    url: "#replace-with-authorized-link"
  }
];

const BLOG_POSTS = [
  {
    topic: "General Chemistry",
    title: "How to Balance Redox Reactions in Acidic vs. Basic Solutions",
    readTime: "4 min read",
    summary: "Split the equation into oxidation and reduction half-reactions, balance atoms using H2O and H+, equalize electrons, and neutralize with OH- if basic."
  },
  {
    topic: "General Chemistry",
    title: "VSEPR Shapes Without Memorizing Every Table",
    readTime: "3 min read",
    summary: "Count total electron domains around the central atom first, then see how lone pairs push bonding pairs slightly closer together."
  },
  {
    topic: "Organic Chemistry",
    title: "SN1 vs. SN2 vs. E1 vs. E2: A 4-Step Decision Checklist",
    readTime: "5 min read",
    summary: "Evaluate substrate hindrance, nucleophile/base strength, solvent polarity, and heat to predict the major organic product reliably."
  },
  {
    topic: "Physical Chemistry",
    title: "Intuitive Guide to Rate Laws and Reaction Order",
    readTime: "4 min read",
    summary: "Why zero-, first-, and second-order reactions produce straight lines on different concentration-vs-time plots."
  }
];

const DEFAULT_CLASSES = [
  {
    id: "cls-1",
    title: "Stoichiometry & Limiting Reagents Q&A",
    topic: "General",
    dateTime: "2026-11-25T17:00",
    host: "Peer Study Lead",
    meetUrl: "https://meet.google.com/"
  },
  {
    id: "cls-2",
    title: "Organic Mechanisms Walkthrough",
    topic: "Organic",
    dateTime: "2026-11-28T15:00",
    host: "Chemistry Mentor",
    meetUrl: "https://meet.google.com/"
  }
];

const STORAGE_KEYS = {
  profileName: "studysprint_display_name",
  localUserEmail: "studysprint_user_email",
  classes: "studysprint_classes",
  notifications: "studysprint_notifications"
};

function getDisplayName() {
  return localStorage.getItem(STORAGE_KEYS.profileName) || "";
}

function setDisplayName(name) {
  localStorage.setItem(STORAGE_KEYS.profileName, name.trim());
  updateHeaderState();
}

function getNotifications() {
  const raw = localStorage.getItem(STORAGE_KEYS.notifications);
  if (raw) return JSON.parse(raw);

  const starter = [
    {
      id: "notif-welcome",
      text: "Welcome to StudySprint Chemistry! Set your display name in Profile Settings.",
      time: "Just now",
      read: false
    }
  ];
  localStorage.setItem(STORAGE_KEYS.notifications, JSON.stringify(starter));
  return starter;
}

function saveNotifications(list) {
  localStorage.setItem(STORAGE_KEYS.notifications, JSON.stringify(list));
  updateHeaderState();
}

function pushNotification(text) {
  const list = getNotifications();
  list.unshift({
    id: "notif-" + Date.now(),
    text,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    read: false
  });
  saveNotifications(list);
}

function updateHeaderState() {
  const badge = document.getElementById("nav-notif-count");
  if (badge) {
    const unread = getNotifications().filter((n) => !n.read).length;
    badge.textContent = unread;
  }

  const profileLink = document.getElementById("nav-profile-link");
  const savedName = getDisplayName();
  if (profileLink && savedName) {
    profileLink.textContent = savedName;
  }

  const signinLink = document.getElementById("nav-signin-link");
  const savedEmail = localStorage.getItem(STORAGE_KEYS.localUserEmail);
  if (signinLink && savedEmail) {
    signinLink.textContent = "Signed In";
  }
}

function escapeHTML(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function initLibraryPage() {
  const grid = document.getElementById("resource-grid");
  const searchInput = document.getElementById("search");
  const countEl = document.getElementById("result-count");
  const emptyEl = document.getElementById("empty-state");
  if (!grid || !searchInput) return;

  let selectedTopic = "all";
  let selectedType = "all";

  function render() {
    const q = searchInput.value.trim().toLowerCase();
    const filtered = RESOURCES.filter((item) => {
      const topicMatch = selectedTopic === "all" || item.topic === selectedTopic;
      const typeMatch = selectedType === "all" || item.type === selectedType;
      const textMatch =
        !q ||
        `${item.title} ${item.topic} ${item.type} ${item.description}`
          .toLowerCase()
          .includes(q);
      return topicMatch && typeMatch && textMatch;
    });

    grid.innerHTML = filtered
      .map(
        (item) => `
        <article class="card">
          <div class="card-top">
            <span class="pill">${escapeHTML(item.topic)}</span>
            <span class="type">${escapeHTML(item.type)}</span>
          </div>
          <h3>${escapeHTML(item.title)}</h3>
          <p>${escapeHTML(item.description)}</p>
          <a class="card-link" href="${escapeHTML(item.url)}">Open resource →</a>
        </article>
      `
      )
      .join("");

    if (countEl) countEl.textContent = `${filtered.length} ${filtered.length === 1 ? "resource" : "resources"}`;
    if (emptyEl) emptyEl.style.display = filtered.length ? "none" : "block";
  }

  document.querySelectorAll(".chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      const row = btn.closest(".chip-row");
      row?.querySelectorAll(".chip").forEach((c) => {
        c.classList.remove("active");
        c.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");

      if (btn.dataset.filter === "topic") selectedTopic = btn.dataset.value;
      if (btn.dataset.filter === "type") selectedType = btn.dataset.value;
      render();
    });
  });

  searchInput.addEventListener("input", render);
  render();
}

function initBlogPage() {
  const container = document.getElementById("blog-container");
  if (!container) return;
  let activeTopic = "all";

  function render() {
    const visible =
      activeTopic === "all"
        ? BLOG_POSTS
        : BLOG_POSTS.filter((p) => p.topic === activeTopic);

    const grouped = visible.reduce((acc, post) => {
      acc[post.topic] = acc[post.topic] || [];
      acc[post.topic].push(post);
      return acc;
    }, {});

    container.innerHTML = Object.entries(grouped)
      .map(
        ([topic, posts]) => `
        <section class="topic-group">
          <h2 class="topic-group-title">${escapeHTML(topic)}</h2>
          ${posts
            .map(
              (post) => `
              <article class="blog-post">
                <div class="card-top">
                  <span class="pill lavender">${escapeHTML(post.topic)}</span>
                  <span class="type">${escapeHTML(post.readTime)}</span>
                </div>
                <h3>${escapeHTML(post.title)}</h3>
                <p>${escapeHTML(post.summary)}</p>
              </article>
            `
            )
            .join("")}
        </section>
      `
      )
      .join("");
  }

  document.querySelectorAll("#blog-topic-filters .chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll("#blog-topic-filters .chip")
        .forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      activeTopic = btn.dataset.topic;
      render();
    });
  });

  render();
}

async function initClassesPage() {
  const listEl = document.getElementById("classes-list");
  const form = document.getElementById("class-form");
  const modeEl = document.getElementById("classes-storage-mode");
  const feedbackEl = document.getElementById("class-feedback");
  const hostInput = document.getElementById("class-host");
  if (!listEl || !form) return;

  if (hostInput && getDisplayName()) hostInput.value = getDisplayName();

  function getLocalClasses() {
    const raw = localStorage.getItem(STORAGE_KEYS.classes);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(STORAGE_KEYS.classes, JSON.stringify(DEFAULT_CLASSES));
    return DEFAULT_CLASSES;
  }

  function renderClasses(sessions) {
    if (!sessions.length) {
      listEl.innerHTML = `<div class="empty" style="display:block;">No live sessions scheduled yet.</div>`;
      return;
    }

    listEl.innerHTML = sessions
      .map((s) => {
        const formattedDate = s.dateTime
          ? new Date(s.dateTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
          : "Upcoming";
        return `
          <article class="panel">
            <div class="card-top">
              <span class="pill peach">${escapeHTML(s.topic)}</span>
              <span class="type">${escapeHTML(formattedDate)}</span>
            </div>
            <h3 style="margin-top:12px;">${escapeHTML(s.title)}</h3>
            <p class="muted">Hosted by ${escapeHTML(s.host)}</p>
            <div class="btn-row">
              <a class="btn btn-primary" href="${escapeHTML(s.meetUrl)}" target="_blank" rel="noopener noreferrer">
                Join Google Meet ↗
              </a>
            </div>
          </article>
        `;
      })
      .join("");
  }

  let useCloud = false;
  if (isFirebaseConfigured()) {
    const services = await initFirebaseServices();
    if (services) {
      useCloud = true;
      if (modeEl) modeEl.textContent = "Synced with Firestore";
      const cloudSessions = await fetchCloudClasses();
      renderClasses(cloudSessions.length ? cloudSessions : getLocalClasses());
    }
  }

  if (!useCloud) {
    renderClasses(getLocalClasses());
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("class-title").value.trim();
    const topic = document.getElementById("class-topic").value;
    const dateTime = document.getElementById("class-time").value;
    const host = document.getElementById("class-host").value.trim();
    const meetUrl = document.getElementById("class-meet").value.trim();

    if (!meetUrl.startsWith("https://meet.google.com/")) {
      if (feedbackEl) feedbackEl.textContent = "Please enter a valid https://meet.google.com/ link.";
      return;
    }

    const newSession = {
      id: "cls-" + Date.now(),
      title,
      topic,
      dateTime,
      host,
      meetUrl
    };

    if (useCloud) {
      try {
        await addCloudClass(newSession);
        const updated = await fetchCloudClasses();
        renderClasses(updated);
      } catch (err) {
        if (feedbackEl) feedbackEl.textContent = "Sign in on the Profile page to publish to Firestore, or check Firestore rules.";
        return;
      }
    } else {
      const updated = [newSession, ...getLocalClasses()];
      localStorage.setItem(STORAGE_KEYS.classes, JSON.stringify(updated));
      renderClasses(updated);
    }

    pushNotification(`New live session added: "${title}" (${topic}).`);
    form.reset();
    if (feedbackEl) feedbackEl.textContent = "Session published!";
  });
}

async function initProfilePage() {
  const form = document.getElementById("profile-form");
  const input = document.getElementById("display-name-input");
  const feedback = document.getElementById("profile-feedback");
  const authStatus = document.getElementById("auth-status");
  const signInBtn = document.getElementById("google-signin-btn");
  const signOutBtn = document.getElementById("google-signout-btn");
  const userCard = document.getElementById("auth-user-card");
  const userAvatar = document.getElementById("auth-avatar");
  const userName = document.getElementById("auth-user-name");
  const userEmail = document.getElementById("auth-user-email");
  if (!form || !input) return;

  input.value = getDisplayName();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const val = input.value.trim();
    if (!val) return;
    setDisplayName(val);
    pushNotification(`Display name updated to "${val}".`);
    if (feedback) feedback.textContent = "Display name saved in browser.";
  });

  if (!isFirebaseConfigured()) {
    if (authStatus) authStatus.textContent =
      "Firebase is not configured yet. Add your Firebase web config in firebase.js to enable Google Sign-In.";
    return;
  }

  const services = await initFirebaseServices();
  if (!services) {
    if (authStatus) authStatus.textContent = "Could not load Firebase SDK. Check your internet connection or config.";
    return;
  }

  if (authStatus) authStatus.textContent = "Firebase connected. Sign in with Google to sync your identity.";
  if (signInBtn) signInBtn.disabled = false;

  watchAuthState((user) => {
    if (user) {
      if (userCard) userCard.hidden = false;
      if (userAvatar) userAvatar.src = user.photoURL || "";
      if (userName) userName.textContent = user.displayName || "Student";
      if (userEmail) userEmail.textContent = user.email || "";
      if (signInBtn) signInBtn.hidden = true;
      if (signOutBtn) signOutBtn.hidden = false;

      if (!getDisplayName() && user.displayName) {
        setDisplayName(user.displayName);
        input.value = user.displayName;
      }
    } else {
      if (userCard) userCard.hidden = true;
      if (signInBtn) signInBtn.hidden = false;
      if (signOutBtn) signOutBtn.hidden = true;
    }
  });

  signInBtn?.addEventListener("click", async () => {
    try {
      await signInWithGooglePopup();
      pushNotification("Signed in with Google.");
    } catch (err) {
      if (authStatus) authStatus.textContent = `Sign-in failed: ${err.message}`;
    }
  });

  signOutBtn?.addEventListener("click", async () => {
    await signOutUser();
    pushNotification("Signed out of Google.");
  });
}

function initNotificationsPage() {
  const listEl = document.getElementById("notifications-list");
  const emptyEl = document.getElementById("notif-empty");
  const markAllBtn = document.getElementById("mark-all-read");
  const clearBtn = document.getElementById("clear-notifs");
  if (!listEl) return;

  function render() {
    const items = getNotifications();
    if (!items.length) {
      listEl.innerHTML = "";
      if (emptyEl) emptyEl.style.display = "block";
      return;
    }

    if (emptyEl) emptyEl.style.display = "none";
    listEl.innerHTML = items
      .map(
        (n) => `
        <div class="notif-item ${n.read ? "" : "unread"}">
          <div>
            <div>${escapeHTML(n.text)}</div>
            <small class="muted">${escapeHTML(n.time)}</small>
          </div>
          ${n.read ? `<span class="type">Read</span>` : `<span class="pill">New</span>`}
        </div>
      `
      )
      .join("");
  }

  markAllBtn?.addEventListener("click", () => {
    const updated = getNotifications().map((n) => ({ ...n, read: true }));
    saveNotifications(updated);
    render();
  });

  clearBtn?.addEventListener("click", () => {
    saveNotifications([]);
    render();
  });

  render();
}

function initSignInPage() {
  const form = document.querySelector("#signin-form");
  if (!form) return;

  const status = document.querySelector("#signin-status");
  const submit = document.querySelector("#signin-submit");
  const password = document.querySelector("#signin-password");
  const toggle = document.querySelector("#toggle-password");

  toggle?.addEventListener("click", () => {
    const isHidden = password.type === "password";
    password.type = isHidden ? "text" : "password";
    toggle.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!configured || !auth) {
      status.textContent = "Sign-in is not configured yet. Add Firebase settings and enable Email/Password sign-in.";
      return;
    }

    const email = document.querySelector("#signin-email").value.trim();
    const passwordValue = password.value;
    const remember = document.querySelector("#remember-me").checked;

    submit.disabled = true;
    status.textContent = "Signing in…";

    try {
      await setPersistence(
        auth,
        remember ? browserLocalPersistence : browserSessionPersistence
      );
      await signInWithEmailAndPassword(auth, email, passwordValue);
      status.textContent = "Signed in. Taking you to your profile…";
      window.location.href = "profile.html";
    } catch (error) {
      console.error("Email sign-in failed:", error);
      status.textContent =
        error.code === "auth/invalid-credential" || error.code === "auth/wrong-password"
          ? "Email or password is incorrect."
          : error.code === "auth/user-not-found"
            ? "No account was found for that email."
            : "Could not sign in. Check your Firebase Authentication setup and try again.";
    } finally {
      submit.disabled = false;
    }
  });
}


function initSignUpPage() {
  const form = document.querySelector("#signup-form");
  if (!form) return;

  const nameInput = document.querySelector("#signup-name");
  const emailInput = document.querySelector("#signup-email");
  const passwordInput = document.querySelector("#signup-password");
  const confirmInput = document.querySelector("#signup-confirm-password");
  const rememberInput = document.querySelector("#signup-remember");
  const submitButton = document.querySelector("#signup-submit");
  const status = document.querySelector("#signup-status");
  const toggleButton = document.querySelector("#toggle-signup-password");

  toggleButton?.addEventListener("click", () => {
    const isHidden = passwordInput.type === "password";
    passwordInput.type = isHidden ? "text" : "password";
    toggleButton.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const displayName = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmInput.value;

    if (password.length < 6) {
      status.textContent = "Use a password with at least 6 characters.";
      return;
    }

    if (password !== confirmPassword) {
      status.textContent = "The passwords do not match.";
      confirmInput.focus();
      return;
    }

    if (!configured) {
      status.textContent = "Firebase is not configured yet. Add your Firebase settings to firebase.js.";
      return;
    }

    submitButton.disabled = true;
    status.textContent = "Creating your account…";

    try {
      const credential = await registerWithEmail(
        email,
        password,
        displayName,
        rememberInput.checked
      );

      if (credential.user) {
        status.textContent = "Account created. Taking you to your profile…";
        window.location.href = "profile.html";
      }
    } catch (error) {
      console.error("Account creation failed:", error);

      if (error.code === "auth/email-already-in-use") {
        status.textContent = "An account already exists for this email. Try signing in.";
      } else if (error.code === "auth/weak-password") {
        status.textContent = "Choose a stronger password.";
      } else if (error.code === "auth/invalid-email") {
        status.textContent = "Enter a valid email address.";
      } else {
        status.textContent = "Could not create your account. Check your Firebase Authentication setup and try again.";
      }
    } finally {
      submitButton.disabled = false;
    }
  });
}

updateHeaderState();
initLibraryPage();
initBlogPage();
initClassesPage();
initProfilePage();
initNotificationsPage();
initSignInPage();
initSignUpPage();
