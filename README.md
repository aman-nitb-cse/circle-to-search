<div align="center">

<img src="assets/hero.svg" alt="Coding Keyboard Simulator" width="100%">

<br>

[![Stars](https://img.shields.io/github/stars/aman-nitb-cse/Coding-keyboard-simulator?style=for-the-badge&logo=github&color=38bdf8&labelColor=0f172a)](https://github.com/aman-nitb-cse/Coding-keyboard-simulator/stargazers)
[![Forks](https://img.shields.io/github/forks/aman-nitb-cse/Coding-keyboard-simulator?style=for-the-badge&logo=git&color=2563eb&labelColor=0f172a)](https://github.com/aman-nitb-cse/Coding-keyboard-simulator/network/members)
[![Issues](https://img.shields.io/github/issues/aman-nitb-cse/Coding-keyboard-simulator?style=for-the-badge&color=f59e0b&labelColor=0f172a)](https://github.com/aman-nitb-cse/Coding-keyboard-simulator/issues)
[![Last commit](https://img.shields.io/github/last-commit/aman-nitb-cse/Coding-keyboard-simulator?style=for-the-badge&color=10b981&labelColor=0f172a)](https://github.com/aman-nitb-cse/Coding-keyboard-simulator/commits)

[![Chrome users](https://img.shields.io/chrome-web-store/users/dpadfcjjnkjabijdiagaadnhnghemdmh?style=flat-square&logo=googlechrome&logoColor=white&label=Users&color=4285F4)](https://chromewebstore.google.com/detail/dpadfcjjnkjabijdiagaadnhnghemdmh)
[![Rating](https://img.shields.io/chrome-web-store/rating/dpadfcjjnkjabijdiagaadnhnghemdmh?style=flat-square&logo=googlechrome&logoColor=white&label=Rating&color=f59e0b)](https://chromewebstore.google.com/detail/dpadfcjjnkjabijdiagaadnhnghemdmh)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-2563eb?style=flat-square&logo=googlechrome&logoColor=white)
![Chrome 111+](https://img.shields.io/badge/Chrome-111%2B-4285F4?style=flat-square&logo=googlechrome&logoColor=white)
![Version](https://img.shields.io/badge/version-1.0.0-38bdf8?style=flat-square)
![Vanilla JS](https://img.shields.io/badge/Vanilla-JavaScript-f7df1e?style=flat-square&logo=javascript&logoColor=black)

**Type or paste clipboard code into any web editor, with smart indent and bracket handling.**

[Install](https://chromewebstore.google.com/detail/dpadfcjjnkjabijdiagaadnhnghemdmh) · [Usage](#-usage) · [Features](#-features) · [How it works](#-how-it-works) · [Analytics](#-community--analytics) · [Report a bug](https://github.com/aman-nitb-cse/Coding-keyboard-simulator/issues/new)

</div>

---

## ✨ Overview

**Coding Keyboard Simulator** is a lightweight Chrome extension (Manifest V3). Copy some code, click inside an editor, press a shortcut, and the extension either **types it out like a human** or **pastes it instantly**, fixing indentation and auto-closed brackets along the way so the result matches your source exactly.

<div align="center">
<img src="assets/features.svg" alt="UI and features" width="100%">
</div>

## 🚀 Features

| | Feature | What it does |
|---|---|---|
| ⌨️ | **Human typing** | Natural keystroke rhythm (~55 WPM) with bursts, word pauses, longer pauses at new lines and `; { }`, and occasional "thinking" breaks. |
| 📋 | **Direct paste** | Drops the clipboard contents into the editor instantly. |
| 📐 | **Smart indent** | Looks at what the editor actually produced after each newline and corrects it, so every line ends with exactly the source indentation (tabs, spaces, auto-indent or none). |
| 🔤 | **Bracket handling** | Cancels the closers that editors auto-insert for `( [ { " ' \`` and HTML tags, so nothing gets doubled. |
| 🙈 | **Human typos** | Occasional QWERTY neighbour-key slips followed by a natural backspace correction. |
| 🛑 | **Esc to stop** | Stop typing at any moment. A toast shows *Typing…*, *Done*, *Clipboard Empty* or *Click inside the editor first*. |
| 🎛️ | **Custom shortcuts** | Rebind both shortcuts from Chrome's own keyboard settings. |
| 🌐 | **Works in common editors** | Plain `<textarea>`, contenteditable, **Monaco**, **CodeMirror** and **Ace** based editors. |

## 📦 Install

<div align="center">

<a href="https://chromewebstore.google.com/detail/dpadfcjjnkjabijdiagaadnhnghemdmh">
  <img src="https://img.shields.io/badge/Add%20to%20Chrome-Install%20from%20Chrome%20Web%20Store-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white&labelColor=0f172a" alt="Add to Chrome" height="48">
</a>

</div>

1. Open the [**Chrome Web Store page**](https://chromewebstore.google.com/detail/dpadfcjjnkjabijdiagaadnhnghemdmh).
2. Click **Add to Chrome**.
3. Pin the extension to your toolbar for quick access to the popup.

## 🎮 Usage

1. Copy the code you want to insert.
2. **Click inside** the target editor.
3. Press a shortcut:

| Shortcut | Action |
|---|---|
| <kbd>Alt</kbd> + <kbd>V</kbd> | Human typing |
| <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>V</kbd> | Direct paste |
| <kbd>Esc</kbd> | Stop typing |

Want different keys? Open the popup and click **Record Key**, which takes you to `chrome://extensions/shortcuts`.

## 🧠 How it works

```mermaid
flowchart LR
    A[Shortcut pressed] --> B[background.js]
    B --> C[Inject scripts into the tab]
    C --> D[offscreen.js reads clipboard]
    D --> E{Mode}
    E -->|Alt+V| F[ks-human.js: cadence + typos]
    E -->|Alt+Shift+V| G[Direct paste]
    F --> H[ks-editor.js: Monaco / CodeMirror / Ace / textarea]
    G --> H
    H --> I[Smart indent + bracket cancel]
    I --> J[ks-toast.js: status toast]
```

| File | Role |
|---|---|
| `manifest.json` | MV3 manifest, shortcuts (`human-type`, `direct-paste`), permissions |
| `background.js` | Handles commands and injects the content scripts |
| `offscreen.html/js` | Reads the clipboard via an offscreen document |
| `content.js` | Typing loop, smart indent, bracket cancel |
| `ks-human.js` | Human keystroke timing and QWERTY typo helpers |
| `ks-editor.js` | Editor detection and text insertion |
| `page-bridge.js` | Page-world bridge for Monaco / CodeMirror / Ace APIs |
| `ks-toast.js` | Shadow-DOM toast notifications |
| `popup.html/js` | Popup UI showing the current shortcuts |

**Permissions:** `activeTab`, `scripting`, `clipboardRead`, `offscreen`. The extension only acts on the tab where you press a shortcut.

## 📊 Community & Analytics

<div align="center">

### ⭐ Star history

<a href="https://star-history.com/#aman-nitb-cse/Coding-keyboard-simulator&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=aman-nitb-cse/Coding-keyboard-simulator&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=aman-nitb-cse/Coding-keyboard-simulator&type=Date" />
    <img alt="Star history chart" src="https://api.star-history.com/svg?repos=aman-nitb-cse/Coding-keyboard-simulator&type=Date" width="640" />
  </picture>
</a>

### 👥 Contributors

<a href="https://github.com/aman-nitb-cse/Coding-keyboard-simulator/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=aman-nitb-cse/Coding-keyboard-simulator" alt="Contributors" />
</a>

### 📥 Chrome Web Store & activity

[![Users](https://img.shields.io/chrome-web-store/users/dpadfcjjnkjabijdiagaadnhnghemdmh?style=for-the-badge&logo=googlechrome&logoColor=white&label=Users&color=4285F4&labelColor=0f172a)](https://chromewebstore.google.com/detail/dpadfcjjnkjabijdiagaadnhnghemdmh)
[![Rating](https://img.shields.io/chrome-web-store/rating/dpadfcjjnkjabijdiagaadnhnghemdmh?style=for-the-badge&label=Rating&color=f59e0b&labelColor=0f172a)](https://chromewebstore.google.com/detail/dpadfcjjnkjabijdiagaadnhnghemdmh)
[![Store version](https://img.shields.io/chrome-web-store/v/dpadfcjjnkjabijdiagaadnhnghemdmh?style=for-the-badge&label=Store%20version&color=10b981&labelColor=0f172a)](https://chromewebstore.google.com/detail/dpadfcjjnkjabijdiagaadnhnghemdmh)
![Commit activity](https://img.shields.io/github/commit-activity/m/aman-nitb-cse/Coding-keyboard-simulator?style=for-the-badge&label=Commits%2Fmonth&color=10b981&labelColor=0f172a)
![Repo size](https://img.shields.io/github/repo-size/aman-nitb-cse/Coding-keyboard-simulator?style=for-the-badge&color=a78bfa&labelColor=0f172a)

</div>

## 🐞 Feedback

Found a bug or want a feature? Click the 🐞 icon in the popup (it opens a pre-filled issue) or [open an issue](https://github.com/aman-nitb-cse/Coding-keyboard-simulator/issues/new). Please include the site/editor you used (e.g. LeetCode, Monaco, CodeMirror) and your Chrome version.

## 🤝 Contributing

1. Fork the repo and create a branch: `git checkout -b feature/my-idea`
2. Make your changes and test them in Chrome
3. Open a pull request

## 📄 License

Add a `LICENSE` file (MIT is a common choice) and update this section.

<div align="center">

Made with ⌨️ by [aman-nitb-cse](https://github.com/aman-nitb-cse) · If this helped you, drop a ⭐

</div>
