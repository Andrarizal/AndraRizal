(function () {
  var burger = document.querySelector(".burger");
  var menu = document.querySelector(".menu");

  function setOpen(open) {
    if (!burger || !menu) return;
    burger.classList.toggle("is-open", open);
    menu.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    burger.setAttribute("aria-label", open ? "Tutup menu" : "Buka menu");
    document.body.classList.toggle("menu-open", open);
    if ("inert" in menu) menu.inert = !open;
  }

  if (burger && menu) {
    burger.addEventListener("click", function () {
      setOpen(burger.getAttribute("aria-expanded") !== "true");
    });

    menu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        setOpen(false);
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") setOpen(false);
    });
  }

  var panels = Array.prototype.slice.call(document.querySelectorAll(".panel"));
  var dots = Array.prototype.slice.call(document.querySelectorAll(".dots a"));
  var hint = document.getElementById("hint");

  if (panels.length && "IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var id = entry.target.id;
          dots.forEach(function (dot) {
            var on = dot.getAttribute("href") === "#" + id;
            dot.classList.toggle("is-on", on);
            if (on) dot.setAttribute("aria-current", "true");
            else dot.removeAttribute("aria-current");
          });
          if (hint) hint.classList.toggle("is-gone", id !== "awal");
        });
      },
      { threshold: 0.55 }
    );
    panels.forEach(function (panel) {
      observer.observe(panel);
    });
  }

  document.querySelectorAll("[data-filter]").forEach(function (button) {
    button.addEventListener("click", function () {
      var group = button.getAttribute("data-filter");
      var grid = document.querySelector(".skill-grid");
      document.querySelectorAll("[data-filter]").forEach(function (item) {
        item.classList.toggle("is-on", item === button);
      });
      document.querySelectorAll("[data-group]").forEach(function (card) {
        var show = group === "semua" || card.getAttribute("data-group") === group;
        card.hidden = !show;
      });
      if (grid) grid.style.gridTemplateColumns = group === "semua" ? "" : "1fr";
    });
  });

  document.querySelectorAll("[data-pick]").forEach(function (button) {
    button.addEventListener("click", function () {
      var id = button.getAttribute("data-pick");
      document.querySelectorAll("[data-pick]").forEach(function (item) {
        var on = item === button;
        item.classList.toggle("is-on", on);
        if (on) item.setAttribute("aria-current", "true");
        else item.removeAttribute("aria-current");
      });
      document.querySelectorAll("[data-face]").forEach(function (face) {
        face.hidden = face.getAttribute("data-face") !== id;
      });
      var line = document.getElementById("pick-line");
      var link = document.getElementById("pick-link");
      var frame = document.getElementById("figure");
      if (frame && button.getAttribute("data-href")) {
        frame.src = button.getAttribute("data-href");
        frame.title = button.textContent.trim();
      }
      if (line) line.textContent = button.getAttribute("data-line") || "";
      if (link) {
        link.href = button.getAttribute("data-href") || "#";
        link.textContent = button.getAttribute("data-label") || "Buka";
        if (button.getAttribute("data-external") === "true") {
          link.target = "_blank";
          link.rel = "noopener noreferrer";
        } else {
          link.removeAttribute("target");
          link.removeAttribute("rel");
        }
      }
    });
  });

  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
