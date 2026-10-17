/*
 * nimaltd.github.io: the theme switch, the menu on phones, the installer
 * picker, the copy buttons, and live numbers from GitHub. The page works
 * without any of it: every installer is then listed one under another, and
 * the numbers in the HTML stay as they are.
 */

(function () {
  "use strict";

  var root = document.documentElement;

  /* Storage can throw, in a private window or with site data blocked. */
  function load(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  function save(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* nothing to do */ }
  }

  /* ---------------------------------------------------------------------- */
  /* Theme                                                                  */
  /* ---------------------------------------------------------------------- */

  var themeButton = document.getElementById("theme");

  function showTheme() {
    var light = root.dataset.theme === "light";
    themeButton.setAttribute("aria-label", light ? "Switch to the dark theme" : "Switch to the light theme");
    document.querySelector('meta[name="theme-color"]').setAttribute("content", light ? "#f3f7fc" : "#071226");
  }

  themeButton.addEventListener("click", function () {
    root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
    save("theme", root.dataset.theme);
    showTheme();
  });

  showTheme();

  /* ---------------------------------------------------------------------- */
  /* Menu on phones                                                         */
  /* ---------------------------------------------------------------------- */

  var menuButton = document.getElementById("menu");
  var links = document.getElementById("nav-links");

  function closeMenu() {
    links.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Open the menu");
  }

  menuButton.addEventListener("click", function () {
    var open = links.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", open ? "true" : "false");
    menuButton.setAttribute("aria-label", open ? "Close the menu" : "Open the menu");
  });

  links.addEventListener("click", function (event) {
    if (event.target.closest("a")) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && links.classList.contains("open")) {
      closeMenu();
      menuButton.focus();
    }
  });

  /* ---------------------------------------------------------------------- */
  /* Installer picker: a tab list, with the arrow keys, Home and End        */
  /* ---------------------------------------------------------------------- */

  var tabs = Array.prototype.slice.call(document.querySelectorAll(".rail-tab"));

  function select(tab, focus) {
    tabs.forEach(function (other) {
      var on = other === tab;
      other.setAttribute("aria-selected", on ? "true" : "false");
      other.tabIndex = on ? 0 : -1;
      document.getElementById(other.getAttribute("aria-controls")).classList.toggle("on", on);
    });

    if (focus) {
      tab.focus();
    }
  }

  tabs.forEach(function (tab, index) {
    tab.addEventListener("click", function () {
      select(tab, false);
      history.replaceState(null, "", "#" + tab.id.replace("tab-", ""));
    });

    tab.addEventListener("keydown", function (event) {
      var next = null;

      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        next = tabs[(index + 1) % tabs.length];
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        next = tabs[(index - 1 + tabs.length) % tabs.length];
      } else if (event.key === "Home") {
        next = tabs[0];
      } else if (event.key === "End") {
        next = tabs[tabs.length - 1];
      }

      if (next) {
        event.preventDefault();
        select(next, true);
      }
    });
  });

  /* A link such as nimaltd.github.io/#zephyr opens on that installer. */
  var wanted = document.getElementById("tab-" + location.hash.slice(1));

  if (wanted && tabs.indexOf(wanted) >= 0) {
    select(wanted, false);
    document.getElementById("installers").scrollIntoView();
  }

  /* ---------------------------------------------------------------------- */
  /* Copy buttons                                                           */
  /* ---------------------------------------------------------------------- */

  var toast = document.getElementById("toast");
  var toastTimer = 0;

  function say(text) {
    toast.textContent = text;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 1800);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }

    /* Older browsers, and pages opened from a file. */
    return new Promise(function (resolve, reject) {
      var area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();

      try {
        document.execCommand("copy") ? resolve() : reject();
      } catch (e) {
        reject(e);
      }

      document.body.removeChild(area);
    });
  }

  document.addEventListener("click", function (event) {
    var button = event.target.closest(".copy");

    if (!button) {
      return;
    }

    copyText(button.getAttribute("data-copy")).then(function () {
      var use = button.querySelector("use");
      button.classList.add("done");
      use.setAttribute("href", "#i-check");
      say("Copied");

      setTimeout(function () {
        button.classList.remove("done");
        use.setAttribute("href", "#i-copy");
      }, 1600);
    }, function () {
      say("Could not copy. Select the text instead.");
    });
  });

  /* ---------------------------------------------------------------------- */
  /* Live numbers from GitHub                                               */
  /* ---------------------------------------------------------------------- */

  /* GitHub allows 60 requests an hour without a token, so the answer is kept
     for an hour in this tab, and the numbers in the HTML stay when it fails. */
  var USER = "nimaltd";
  var CACHE = "github-numbers";
  var HOUR = 60 * 60 * 1000;

  function cached() {
    try {
      var data = JSON.parse(sessionStorage.getItem(CACHE));
      return data && Date.now() - data.at < HOUR ? data : null;
    } catch (e) {
      return null;
    }
  }

  function remember(data) {
    try { sessionStorage.setItem(CACHE, JSON.stringify(data)); } catch (e) { /* nothing to do */ }
  }

  function getJson(url) {
    return fetch(url, { headers: { Accept: "application/vnd.github+json" } }).then(function (response) {
      if (!response.ok) {
        throw new Error(response.status);
      }

      return response.json();
    });
  }

  /* Up to three pages of a hundred repositories, enough for years. */
  function allRepos(page, found) {
    return getJson("https://api.github.com/users/" + USER + "/repos?per_page=100&page=" + page).then(function (repos) {
      found = found.concat(repos);
      return repos.length === 100 && page < 3 ? allRepos(page + 1, found) : found;
    });
  }

  function fetchNumbers() {
    return Promise.all([getJson("https://api.github.com/users/" + USER), allRepos(1, [])]).then(function (answers) {
      var stars = {};
      var total = 0;

      answers[1].forEach(function (repo) {
        if (!repo.fork) {
          total += repo.stargazers_count;
        }

        stars[repo.name] = repo.stargazers_count;
      });

      var data = { at: Date.now(), followers: answers[0].followers, repos: answers[0].public_repos, total: total, stars: stars };
      remember(data);
      return data;
    });
  }

  function format(n) {
    return Number(n).toLocaleString("en-US");
  }

  function show(data) {
    var put = {
      stars: format(data.total),
      followers: format(data.followers),
      repos: String(data.repos)
    };

    Array.prototype.forEach.call(document.querySelectorAll("[data-stat]"), function (el) {
      var value = put[el.getAttribute("data-stat")];

      if (value) {
        el.textContent = value;
      }
    });

    Array.prototype.forEach.call(document.querySelectorAll("[data-repo]"), function (el) {
      var count = data.stars[el.getAttribute("data-repo")];

      if (typeof count === "number") {
        (el.querySelector("span") || el).textContent = format(count);
      }
    });
  }

  var known = cached();

  if (known) {
    show(known);
  } else if (window.fetch && window.Promise) {
    fetchNumbers().then(show, function () { /* the numbers in the HTML stay */ });
  }

  document.getElementById("year").textContent = String(new Date().getFullYear());
})();
