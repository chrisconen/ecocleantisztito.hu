/* ECO Clean – Google vélemények slider (egy értékelés, auto-léptetés balra 3000ms, nyilak) */
(function () {
    "use strict";
    var DEFAULT_ENDPOINT = "https://reviews.chris-conen.workers.dev/";
    var AUTO_MS = 3000;

    function stars(n) {
        n = Math.max(0, Math.min(5, Math.round(n) || 0));
        return "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n);
    }
    function esc(s) {
        return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
        });
    }
    function fmtRating(r) {
        r = Number(r) || 0;
        return r.toFixed(1).replace(/\.0$/, "");
    }

    var GOOGLE_G = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"/></svg>';

    function init(root) {
        var endpoint = root.getAttribute("data-reviews-endpoint") || DEFAULT_ENDPOINT;
        var mount = root.querySelector(".gr-mount");
        fetch(endpoint)
            .then(function (r) { return r.json(); })
            .then(function (data) {
                var reviews = (data.reviews || []).filter(function (r) { return r && r.text; });
                if (!reviews.length) { root.style.display = "none"; return; }
                render(root, mount, data, reviews);
            })
            .catch(function () { root.style.display = "none"; });
    }

    function render(root, mount, data, reviews) {
        var mapUri = data.googleMapsUri || "";
        var summary =
            '<div class="gr-summary">' +
            '<span class="gr-stars">' + stars(data.rating) + "</span>" +
            "<strong>" + fmtRating(data.rating) + "</strong>" +
            "<span>" + (data.total || reviews.length) + " Google értékelés</span>" +
            "</div>";

        var slides = reviews.map(function (r) {
            var photo = r.photo
                ? '<img class="gr-card__photo" src="' + esc(r.photo) + '" alt="' + esc(r.author) + '" loading="lazy" referrerpolicy="no-referrer">'
                : '<div class="gr-card__photo"></div>';
            var g = mapUri
                ? '<a class="gr-card__g" href="' + esc(mapUri) + '" target="_blank" rel="noopener noreferrer" style="text-decoration:none;color:inherit;">' + GOOGLE_G + " Google értékelés</a>"
                : '<span class="gr-card__g">' + GOOGLE_G + " Google értékelés</span>";
            return (
                '<div class="gr-slide"><div class="gr-card">' +
                '<div class="gr-card__head">' + photo +
                '<div class="gr-card__who"><span class="gr-card__name">' + esc(r.author) + "</span>" +
                '<span class="gr-card__meta">' + esc(r.relativeTime) + "</span></div></div>" +
                '<div class="gr-card__stars">' + stars(r.rating) + "</div>" +
                '<p class="gr-card__text">' + esc(r.text) + "</p>" +
                g +
                "</div></div>"
            );
        }).join("");

        mount.innerHTML =
            summary +
            '<div class="gr-stage">' +
            '<div class="gr-viewport"><div class="gr-track">' + slides + "</div></div>" +
            '<button class="gr-arrow gr-arrow--prev" type="button" aria-label="Előző értékelés"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></button>' +
            '<button class="gr-arrow gr-arrow--next" type="button" aria-label="Következő értékelés"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></button>' +
            "</div>" +
            '<div class="gr-dots"></div>';

        carousel(root, reviews.length);
    }

    function carousel(root, n) {
        var track = root.querySelector(".gr-track");
        var prev = root.querySelector(".gr-arrow--prev");
        var next = root.querySelector(".gr-arrow--next");
        var dotsWrap = root.querySelector(".gr-dots");
        var i = 0, timer = null;

        for (var d = 0; d < n; d++) {
            var b = document.createElement("button");
            b.type = "button";
            b.className = "gr-dot" + (d === 0 ? " active" : "");
            b.setAttribute("aria-label", (d + 1) + ". értékelés");
            (function (idx) { b.addEventListener("click", function () { go(idx); restart(); }); })(d);
            dotsWrap.appendChild(b);
        }
        var dots = dotsWrap.children;

        function go(x) {
            i = (x + n) % n;
            track.style.transform = "translateX(-" + (i * 100) + "%)";
            for (var k = 0; k < dots.length; k++) dots[k].classList.toggle("active", k === i);
        }
        function nextF() { go(i + 1); }
        function prevF() { go(i - 1); }
        function start() { stop(); if (n > 1) timer = setInterval(nextF, AUTO_MS); }
        function stop() { if (timer) { clearInterval(timer); timer = null; } }
        function restart() { start(); }

        next.addEventListener("click", function () { nextF(); restart(); });
        prev.addEventListener("click", function () { prevF(); restart(); });
        root.addEventListener("mouseenter", stop);
        root.addEventListener("mouseleave", start);
        root.addEventListener("focusin", stop);
        root.addEventListener("focusout", start);

        start();
    }

    document.addEventListener("DOMContentLoaded", function () {
        var nodes = document.querySelectorAll(".gr-reviews");
        for (var i = 0; i < nodes.length; i++) init(nodes[i]);
    });
})();
