# Live sync for team projects – one-time setup (about 15 minutes)

Teams can always work by sending **team files** to each other (no setup). Live sync is optional: once it
is on, a teammate's change shows up on the others' devices within a few seconds. It uses a free Google
**Firebase** project owned by the JATC. Apprentice work for team projects that turn live sync on is stored
there. Everything else stays in each apprentice's browser.

## 1. Create the Firebase project
1. Go to <https://console.firebase.google.com> and sign in with a JATC Google account.
2. **Add project** → name it `jatc-plan-room` → you can turn Google Analytics **off** → **Create project**.

## 2. Turn on anonymous sign-in
**Build → Authentication → Get started → Sign-in method → Anonymous → Enable → Save.**
(Apprentices don't make accounts; each device signs in anonymously.)

## 3. Create the database
1. **Build → Firestore Database → Create database**.
2. Location: **us-west2 (Los Angeles)** → **Start in production mode** → **Create**.
3. Open the **Rules** tab, replace everything with this and click **Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /teams/{team}/records/{rec} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Each team gets a random, hard-to-guess team code; only devices that joined with that team's file know it.

## 4. Register the web app and copy the config
1. **Project settings (⚙) → General → Your apps → Web (`</>`)** → nickname `plan-room` → **Register app**.
2. Copy the `firebaseConfig = { … }` block it shows (apiKey, authDomain, projectId, …). These values are
   meant to be public – it's safe to put them on the website.
3. **Authentication → Settings → Authorized domains → Add domain:** `jrodartejatc.github.io`

## 5. Put the config in the app
Send the config to Claude, or edit `app/js/cloud-config.js` in the training repo:

```js
PT.cloudConfig = {
  apiKey: "…",
  authDomain: "jatc-plan-room.firebaseapp.com",
  projectId: "jatc-plan-room",
  storageBucket: "…",
  messagingSenderId: "…",
  appId: "…"
};
```

After the website updates, a **⚡ Turn on live sync** button appears on each team project (Team Project page).

## Good to know
- Free plan limits (50,000 reads / 20,000 writes a day) are far more than a class uses.
- Live sync needs internet. If it drops, keep working – changes send when it's back, and team files still work.
- Very large uploaded plan pages (over ~1 MB) don't go through live sync – have one person upload the plans
  and send the **team file** once.
- To wipe a finished class's data: Firestore Database → Data → delete the `teams` collection.
