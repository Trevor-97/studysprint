# StudySprint Chemistry

An independent, student-friendly chemistry study website featuring an e-Library, concept blog, live Google Meet class directory, profile settings, and browser notifications.

## Files Included
- `index.html` — Chemistry e-Library with keyword search, topic filters, and resource-type filters.
- `blog.html` — Concept explainers grouped by chemistry branch.
- `classes.html` — Live class schedule accepting host-provided Google Meet URLs.
- `signin.html` — Split-screen student sign-in & account creation page (works in local demo mode or Firebase Auth).
- `profile.html` — Browser-saved display name and optional Google Sign-In.
- `notifications.html` — Local browser notifications feed.
- `style.css` — Shared responsive styling.
- `app.js` — Application state, filtering, `localStorage`, and Firebase bridge.
- `firebase.js` — Optional Firebase Auth & Firestore integration.
- `firestore.rules` — Security rules for Firestore.

## Setup Instructions

### 1. Run Locally
Because `app.js` uses ES modules (`type="module"`), serve the folder over a local HTTP server rather than double-clicking `index.html`:
- **VS Code:** Install the *Live Server* extension, right-click `index.html`, and select **Open with Live Server**.
- **Python:** Run `python -m http.server 8000` inside the project folder and visit `http://localhost:8000`.

### 2. Replace Placeholder Resources
Open `app.js` and replace each `url: "#replace-with-authorized-link"` inside the `RESOURCES` array with your real, authorized study links (PDFs, notes, past papers).

### 3. Configure Firebase (Optional)
If you want Google Sign-In and cloud-synced Live Classes:
1. Create a project in the [Firebase Console](https://console.firebase.google.com/).
2. Register a **Web App** (`</>`), copy the `firebaseConfig` object, and paste it into `firebase.js`.
3. In Firebase Console → **Authentication** → **Sign-in method**, enable **Google**.
4. In Firebase Console → **Firestore Database**, create a database and paste the contents of `firestore.rules` into the **Rules** tab.
