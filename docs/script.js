(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(pointer: fine)").matches;
  var root = document.documentElement;

  var roleEl = document.getElementById("role");
  var roles = (document.body.getAttribute("data-roles") || "").split("|").filter(Boolean);
  if (roleEl && roles.length && !reduce) {
    var r = 0;
    var c = 0;
    var del = false;
    var tick = function () {
      var word = roles[r];
      roleEl.textContent = word.slice(0, c);
      if (!del && c === word.length) {
        del = true;
        setTimeout(tick, 1400);
        return;
      }
      if (del && c === 0) {
        del = false;
        r = (r + 1) % roles.length;
      }
      c += del ? -1 : 1;
      setTimeout(tick, del ? 35 : 75);
    };
    tick();
  } else if (roleEl && roles.length) {
    roleEl.textContent = roles[0];
  }

  var cursor = document.getElementById("cursor");
  var pointerFrame = 0;
  var pointer = { x: 0, y: 0 };
  if (fine && !reduce) {
    window.addEventListener("pointermove", function (e) {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      if (pointerFrame) return;
      pointerFrame = requestAnimationFrame(function () {
        pointerFrame = 0;
        root.style.setProperty("--mx", pointer.x + "px");
        root.style.setProperty("--my", pointer.y + "px");
        if (cursor) {
          cursor.classList.add("on");
          root.style.setProperty("--cx", pointer.x + "px");
          root.style.setProperty("--cy", pointer.y + "px");
        }
      });
    }, { passive: true });
    if (cursor) {
      document.addEventListener("pointerover", function (e) {
        cursor.classList.toggle("big", !!e.target.closest("a, .btn, .card, button"));
      });
    }
  } else if (cursor) {
    cursor.remove();
  }

  if (fine && !reduce) {
    document.querySelectorAll(".card").forEach(function (card) {
      var box = null;
      var tilt = card.classList.contains("tilt");
      card.addEventListener("pointerenter", function () {
        box = card.getBoundingClientRect();
      });
      card.addEventListener("pointerleave", function () {
        box = null;
        if (tilt) card.style.transform = "";
      });
      card.addEventListener("pointermove", function (e) {
        if (!box) box = card.getBoundingClientRect();
        var x = e.clientX - box.left;
        var y = e.clientY - box.top;
        card.style.setProperty("--x", x + "px");
        card.style.setProperty("--y", y + "px");
        if (!tilt) return;
        var px = x / box.width - 0.5;
        var py = y / box.height - 0.5;
        card.style.transform = "rotateY(" + (px * 8) + "deg) rotateX(" + (-py * 8) + "deg) translateY(-4px)";
      }, { passive: true });
    });
  }

  var reveals = document.querySelectorAll(".rv");
  if (reduce || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        io.unobserve(entry.target);
        entry.target.querySelectorAll("[data-count]").forEach(function (n) {
          var to = +n.dataset.count;
          var t0 = performance.now();
          var step = function (t) {
            var k = Math.min((t - t0) / 1400, 1);
            n.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
            if (k < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        });
      });
    }, { threshold: 0.15 });
    reveals.forEach(function (el) { io.observe(el); });
  }

  var nav = document.getElementById("nav");
  var prog = document.getElementById("progress");
  var beam = document.getElementById("beam");
  var tl = document.getElementById("timeline");
  var lastY = 0;
  var links = nav ? Array.prototype.slice.call(nav.querySelectorAll("a")) : [];
  var secs = links.map(function (a) {
    var href = a.getAttribute("href") || "";
    return href.charAt(0) === "#" ? document.querySelector(href) : null;
  });

  var scrollFrame = 0;
  function onScroll() {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(function () {
      scrollFrame = 0;
      var y = window.scrollY;
      var h = document.body.scrollHeight - window.innerHeight;
      if (prog) prog.style.width = (h > 0 ? (y / h) * 100 : 0) + "%";
      if (nav && !reduce) nav.classList.toggle("hide", y > lastY && y > 200);
      lastY = y;
      if (beam && tl) {
        var rect = tl.getBoundingClientRect();
        var p = Math.min(Math.max((window.innerHeight * 0.6 - rect.top) / rect.height, 0), 1);
        beam.style.height = "calc(" + (p * 100) + "% - 12px)";
      }
      if (secs.some(Boolean)) {
        var cur = 0;
        secs.forEach(function (s, i) {
          if (s && s.getBoundingClientRect().top < window.innerHeight * 0.4) cur = i;
        });
        links.forEach(function (a, i) { a.classList.toggle("on", i === cur); });
      }
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var marquee = document.querySelector(".marquee");
  if (marquee && "IntersectionObserver" in window) {
    var mo = new IntersectionObserver(function (entries) {
      marquee.classList.toggle("is-off", !entries[0].isIntersecting);
    });
    mo.observe(marquee);
  }

  document.querySelectorAll("[data-filter]").forEach(function (button) {
    button.addEventListener("click", function () {
      var group = button.getAttribute("data-filter");
      var grid = document.querySelector(".skill-grid");
      document.querySelectorAll("[data-filter]").forEach(function (item) {
        item.classList.toggle("is-on", item === button);
      });
      document.querySelectorAll("[data-group]").forEach(function (card) {
        card.hidden = !(group === "semua" || card.getAttribute("data-group") === group);
      });
      if (grid) grid.style.gridTemplateColumns = group === "semua" ? "" : "1fr";
    });
  });

  function replay(node) {
    if (!node || reduce) return;
    node.classList.remove("is-swap");
    void node.offsetWidth;
    node.classList.add("is-swap");
  }
  document.querySelectorAll("[data-href]").forEach(function (button) {
    if (button.tagName !== "BUTTON") return;
    button.addEventListener("click", function () {
      var frame = document.getElementById("figure");
      var line = document.getElementById("pick-line");
      document.querySelectorAll(".picks button").forEach(function (item) {
        var on = item === button;
        item.classList.toggle("is-on", on);
        if (on) item.setAttribute("aria-current", "true");
        else item.removeAttribute("aria-current");
      });
      if (frame) {
        frame.src = button.getAttribute("data-href");
        frame.title = button.textContent.trim();
        replay(frame.closest(".stage"));
      }
      if (line) line.textContent = button.getAttribute("data-line") || "";
    });
  });

  var canvas = document.getElementById("stars");
  if (canvas && !reduce) {
    var ctx = canvas.getContext("2d");
    var W = 0;
    var H = 0;
    var pts = [];
    var mouse = { x: -999, y: -999 };
    var seen = true;
    var starId = 0;
    var lastDraw = 0;
    var resize = function () {
      W = canvas.width = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
      var count = Math.min(26, (W / 32) | 0);
      pts = [];
      for (var i = 0; i < count; i++) {
        pts.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          r: Math.random() * 1.4 + 0.4
        });
      }
    };
    resize();
    window.addEventListener("resize", resize);
    canvas.parentElement.addEventListener("pointermove", function (e) {
      var b = canvas.getBoundingClientRect();
      mouse.x = e.clientX - b.left;
      mouse.y = e.clientY - b.top;
    }, { passive: true });
    var loop = function (now) {
      starId = 0;
      if (!seen || document.hidden) return;
      if (now - lastDraw < 40) {
        starId = requestAnimationFrame(loop);
        return;
      }
      lastDraw = now;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "rgba(255,255,255,.7)";
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.3);
        ctx.fill();
        for (var j = i + 1; j < pts.length; j++) {
          var q = pts[j];
          var dx = p.x - q.x;
          var dy = p.y - q.y;
          var d = dx * dx + dy * dy;
          if (d < 12100) {
            ctx.strokeStyle = "rgba(124,92,255," + (0.22 * (1 - Math.sqrt(d) / 110)) + ")";
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
      }
      starId = requestAnimationFrame(loop);
    };
    function startStars() {
      if (!starId && seen && !document.hidden) starId = requestAnimationFrame(loop);
    }
    if ("IntersectionObserver" in window) {
      var starWatch = new IntersectionObserver(function (entries) {
        seen = entries[0].isIntersecting;
        if (seen) startStars();
      });
      starWatch.observe(canvas.parentElement);
    }
    document.addEventListener("visibilitychange", startStars);
    startStars();
  }

  if (year) year.textContent = String(new Date().getFullYear());
})();
