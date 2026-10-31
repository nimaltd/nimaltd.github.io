/*
 * nimaltd.github.io, on every page: the theme switch, the menu on phones and
 * its Products list, the platform picker, the copy buttons, terNIMA's
 * screenshots one after another and its download for this computer, and live
 * numbers and links from GitHub. Each part does nothing on a page without
 * what it works on. The pages work without any of it: every platform is then
 * listed one under another, the first screenshot stays, and the numbers and
 * the download links in the HTML stay as they are.
 */

(function () {
  "use strict";

  var root = document.documentElement;
  /* Every page's icons, as <use href="/assets/icons.svg#i-copy"/>. */
  var ICONS = "/assets/icons.svg";

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

  /* Products: a list that opens under its name, and closes on a click
     anywhere else or with Escape. Without the script it still opens. */
  var products = document.querySelector(".menu-products");

  if (products) {
    document.addEventListener("click", function (event) {
      if (products.open && !products.contains(event.target)) {
        products.open = false;
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && products.open) {
        products.open = false;
        products.querySelector("summary").focus();
      }
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Platform picker: a tab list, with the arrow keys, Home and End         */
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

  /* A link such as nimaltd.github.io/#zephyr opens on that platform. */
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
      use.setAttribute("href", ICONS + "#i-check");
      say("Copied");

      setTimeout(function () {
        button.classList.remove("done");
        use.setAttribute("href", ICONS + "#i-copy");
      }, 1600);
    }, function () {
      say("Could not copy. Select the text instead.");
    });
  });

  /* ---------------------------------------------------------------------- */
  /* terNIMA's screenshots: the next one every 2 seconds                    */
  /* ---------------------------------------------------------------------- */

  var SLIDE_MS = 2000;
  var shots = document.getElementById("shots");

  if (shots) {
    var slides = Array.prototype.slice.call(shots.querySelectorAll(".slide"));
    var slideCaption = shots.querySelector(".slide-caption");
    var slideTools = shots.querySelector(".slide-tools");
    var current = 0;
    var slideTimer = 0;
    /* Paused by its button; from the start for those who ask for less motion. */
    var paused = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    /* Held while the pointer or the keyboard is on it, and while it is off screen. */
    var hovered = false;
    var focused = false;
    var onScreen = true;

    var dots = slides.map(function (slide, index) {
      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = "slide-dot";
      dot.setAttribute("aria-label", "Show " + slide.getAttribute("data-caption"));
      dot.addEventListener("click", function () {
        show(index);
        run();
      });
      slideTools.appendChild(dot);
      return dot;
    });

    var pauseButton = document.createElement("button");
    pauseButton.type = "button";
    pauseButton.className = "slide-pause";
    pauseButton.innerHTML = '<svg class="ico"><use href="' + ICONS + '#i-pause"/></svg>';
    pauseButton.addEventListener("click", function () {
      paused = !paused;
      showPaused();
      run();
    });
    slideTools.appendChild(pauseButton);

    function showPaused() {
      pauseButton.setAttribute("aria-label", paused ? "Play the screenshots" : "Pause the screenshots");
      pauseButton.querySelector("use").setAttribute("href", ICONS + (paused ? "#i-play" : "#i-pause"));
    }

    function show(index) {
      slides[current].classList.remove("on");
      dots[current].removeAttribute("aria-current");
      current = (index + slides.length) % slides.length;
      slides[current].classList.add("on");
      dots[current].setAttribute("aria-current", "true");
      slideCaption.textContent = slides[current].getAttribute("data-caption");
    }

    /* Starts the clock again, if nothing holds it. */
    function run() {
      clearInterval(slideTimer);
      if (!paused && !hovered && !focused && onScreen) {
        slideTimer = setInterval(function () { show(current + 1); }, SLIDE_MS);
      }
    }

    shots.addEventListener("mouseenter", function () { hovered = true; run(); });
    shots.addEventListener("mouseleave", function () { hovered = false; run(); });
    shots.addEventListener("focusin", function () { focused = true; run(); });
    shots.addEventListener("focusout", function () { focused = false; run(); });

    if (window.IntersectionObserver) {
      new IntersectionObserver(function (entries) {
        onScreen = entries[0].isIntersecting;
        run();
      }).observe(shots);
    }

    show(0);
    showPaused();
    run();
  }

  /* ---------------------------------------------------------------------- */
  /* terNIMA: the download for this computer first                          */
  /* ---------------------------------------------------------------------- */

  /* Phones and tablets get no pick: terNIMA is for a computer. */
  function thisComputer() {
    var platform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "";

    if (/android|iphone|ipad|ipod/i.test(navigator.userAgent)) {
      return "";
    }

    if (/win/i.test(platform)) {
      return "windows";
    } else if (/mac/i.test(platform)) {
      return "mac";
    } else if (/linux/i.test(platform)) {
      return "linux";
    }

    return "";
  }

  var mine = document.querySelector('.os [data-os="' + thisComputer() + '"]');

  if (mine) {
    var first = mine.querySelector(".btn");
    mine.classList.add("mine");
    first.classList.remove("ghost");
    first.classList.add("amber");
    mine.parentNode.insertBefore(mine, mine.parentNode.firstChild);
  }

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

  /* terNIMA's latest release, so a new version's files are linked without
     the page changing. When it fails, the links in the HTML stay. */
  function latestRelease() {
    return getJson("https://api.github.com/repos/" + USER + "/ternima/releases/latest").then(function (release) {
      return {
        version: release.tag_name.replace(/^v/, ""),
        date: release.published_at,
        files: release.assets.map(function (asset) {
          return { name: asset.name, url: asset.browser_download_url };
        })
      };
    }, function () {
      return null;
    });
  }

  function fetchNumbers() {
    // The release on its own as well, so it shows even when the numbers do not come.
    var release = latestRelease();
    release.then(function (found) {
      if (found) {
        showRelease(found);
      }
    });

    return Promise.all([getJson("https://api.github.com/users/" + USER), allRepos(1, []), release]).then(function (answers) {
      var stars = {};
      var total = 0;

      answers[1].forEach(function (repo) {
        if (!repo.fork) {
          total += repo.stargazers_count;
        }

        stars[repo.name] = repo.stargazers_count;
      });

      var data = { at: Date.now(), followers: answers[0].followers, repos: answers[0].public_repos, total: total, stars: stars, release: answers[2] };
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

    if (data.release) {
      showRelease(data.release);
    }
  }

  /* Each link names the end of its file's name, such as ".msi". A link whose
     file the release does not have keeps the address it had. */
  function showRelease(release) {
    Array.prototype.forEach.call(document.querySelectorAll("[data-asset]"), function (link) {
      var end = link.getAttribute("data-asset");
      var file = release.files.filter(function (f) { return f.name.slice(-end.length) === end; })[0];

      if (file) {
        link.href = file.url;
      }
    });

    Array.prototype.forEach.call(document.querySelectorAll('[data-ternima="version"]'), function (el) {
      el.textContent = release.version;
    });

    /* On terNIMA's own page only. */
    var date = document.querySelector('[data-ternima="date"]');
    var published = new Date(release.date || "");

    if (date && !isNaN(published)) {
      date.setAttribute("datetime", release.date.slice(0, 10));
      date.textContent = published.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    }
  }

  var known = cached();

  if (known) {
    show(known);
  } else if (window.fetch && window.Promise) {
    fetchNumbers().then(show, function () { /* the numbers in the HTML stay */ });
  }

  document.getElementById("year").textContent = String(new Date().getFullYear());
})();
