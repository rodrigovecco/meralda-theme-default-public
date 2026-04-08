/**
 * Default Theme — JS enhancements
 *
 * Loaded at bottom of <body>. No external dependencies beyond what
 * the framework already loads (jQuery / Bootstrap may or may not be
 * present; all logic degrades gracefully).
 */
(function () {
    "use strict";

    /* ------------------------------------------------------------------ */
    /* 1. Active sidebar item                                               */
    /* ------------------------------------------------------------------ */
    /**
     * The framework renders the sidebar from PHP without knowing which
     * menu item is current.  We resolve it client-side by comparing the
     * "ui" query-string parameter (or the full pathname) against each
     * nav-link href.
     */
    function highlightActiveSidebarItem() {
        var links = document.querySelectorAll(".sb-sidenav-menu .nav-link");
        if (!links.length) return;

        var currentSearch = window.location.search;   // e.g. "?ui=demo&mod=…"
        var currentPath   = window.location.pathname;

        var bestMatch = null;
        var bestScore = 0;

        links.forEach(function (link) {
            // Already marked active server-side → leave it alone
            if (link.classList.contains("active")) return;

            var href = link.getAttribute("href") || "";
            if (!href || href === "#") return;

            // Score by shared query-string characters (longer match = more specific)
            var score = 0;
            try {
                var url      = new URL(href, window.location.origin);
                var hrefPath = url.pathname;
                var hrefSrch = url.search;

                if (hrefPath === currentPath) score += 10;
                if (hrefSrch && currentSearch.indexOf(hrefSrch.slice(1)) !== -1) {
                    score += hrefSrch.length;
                }
            } catch (_) { /* malformed href */ }

            if (score > bestScore) {
                bestScore = score;
                bestMatch = link;
            }
        });

        if (bestMatch && bestScore > 0) {
            bestMatch.classList.add("active");

            // Expand parent collapse if inside a collapsible group
            var parentCollapse = bestMatch.closest(".collapse");
            if (parentCollapse) {
                parentCollapse.classList.add("show");
                var toggler = document.querySelector(
                    '[data-bs-target="#' + parentCollapse.id + '"],' +
                    '[data-target="#'   + parentCollapse.id + '"]'
                );
                if (toggler) toggler.setAttribute("aria-expanded", "true");
            }
        }
    }

    /* ------------------------------------------------------------------ */
    /* 2. Form submit — disable button to prevent double-submit            */
    /* ------------------------------------------------------------------ */
    function setupFormSubmitFeedback() {
        document.addEventListener("submit", function (e) {
            var form = e.target;
            if (!(form instanceof HTMLFormElement)) return;

            // Skip search / filter forms (they need to re-submit freely)
            if (form.dataset.noFeedback) return;

            var btn = form.querySelector('[type="submit"]');
            if (!btn) return;

            // Give it ~80 ms so the browser actually submits first
            setTimeout(function () {
                btn.disabled = true;
                btn.style.opacity = "0.6";
                btn.style.cursor  = "not-allowed";

                // Safety valve: re-enable after 8 s in case the page doesn't reload
                setTimeout(function () {
                    btn.disabled = false;
                    btn.style.opacity = "";
                    btn.style.cursor  = "";
                }, 8000);
            }, 80);
        }, true);
    }

    /* ------------------------------------------------------------------ */
    /* 3. Keyboard shortcuts  (G then key within 1 s)                      */
    /* ------------------------------------------------------------------ */
    /**
     * Shortcuts only fire when focus is NOT inside a text input / textarea.
     * They work by reading the href of the matching sidebar nav-link so
     * they automatically stay in sync with the menu structure.
     */
    function setupKeyboardShortcuts() {
        var pending = false;
        var timer   = null;

        /** Map second key → label fragment in the sidebar link text */
        var shortcuts = {
            "d": "demo",
            "u": "usuario",
            "c": "configur",
        };

        document.addEventListener("keydown", function (e) {
            // Ignore inside inputs
            var tag = (document.activeElement || {}).tagName || "";
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
            if (document.activeElement && document.activeElement.isContentEditable) return;

            var key = e.key.toLowerCase();

            if (!pending) {
                if (key === "g") {
                    pending = true;
                    clearTimeout(timer);
                    timer = setTimeout(function () { pending = false; }, 1000);
                }
                return;
            }

            // We are in "pending" state — look for the shortcut
            pending = false;
            clearTimeout(timer);

            var fragment = shortcuts[key];
            if (!fragment) return;

            // Find matching link in sidebar
            var links = document.querySelectorAll(".sb-sidenav-menu .nav-link");
            var target = null;
            links.forEach(function (link) {
                var text = (link.textContent || "").toLowerCase().trim();
                if (text.indexOf(fragment) !== -1 && !target) target = link;
            });

            if (target) {
                var href = target.getAttribute("href");
                if (href && href !== "#") window.location.href = href;
            }
        });
    }

    /* ------------------------------------------------------------------ */
    /* 4. Toast notifications for flash messages                            */
    /* ------------------------------------------------------------------ */
    /**
     * If the framework renders inline alert banners (.alert.alert-success,
     * .alert.alert-danger, etc.) inside #layoutSidenav_content, convert
     * them to auto-dismissing toasts that slide in from the top-right.
     */
    function setupFlashToasts() {
        var alerts = document.querySelectorAll(
            "#layoutSidenav_content .alert:not(.alert-permanent)"
        );
        if (!alerts.length) return;

        // Create container if needed
        var container = document.getElementById("mw-toast-container");
        if (!container) {
            container = document.createElement("div");
            container.id = "mw-toast-container";
            container.setAttribute("aria-live", "polite");
            container.setAttribute("aria-atomic", "false");
            Object.assign(container.style, {
                position:  "fixed",
                top:       "72px",
                right:     "1.25rem",
                zIndex:    "9999",
                display:   "flex",
                flexDirection: "column",
                gap:       "0.5rem",
                maxWidth:  "360px",
                width:     "100%",
            });
            document.body.appendChild(container);
        }

        alerts.forEach(function (alert) {
            var toast = document.createElement("div");
            toast.className = alert.className.replace("alert", "mw-toast");
            toast.setAttribute("role", "alert");
            toast.innerHTML = alert.innerHTML;
            Object.assign(toast.style, {
                padding:      "0.75rem 1rem",
                borderRadius: "0.5rem",
                boxShadow:    "0 4px 12px rgba(0,0,0,.12)",
                fontSize:     "0.8125rem",
                opacity:      "0",
                transform:    "translateX(24px)",
                transition:   "opacity 250ms ease, transform 250ms ease",
            });

            // Copy background from original alert classes
            container.appendChild(toast);

            // Animate in
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    toast.style.opacity   = "1";
                    toast.style.transform = "translateX(0)";
                });
            });

            // Auto-dismiss after 4 s
            setTimeout(function () {
                toast.style.opacity   = "0";
                toast.style.transform = "translateX(24px)";
                setTimeout(function () {
                    if (toast.parentNode) toast.parentNode.removeChild(toast);
                }, 260);
            }, 4000);

            // Hide the original banner
            alert.style.display = "none";
        });
    }

    /* ------------------------------------------------------------------ */
    /* 5. Sidebar collapse persistence                                      */
    /* ------------------------------------------------------------------ */
    /**
     * Remember whether the sidebar is open or collapsed across page loads
     * using sessionStorage (cleared when the tab closes).
     */
    function setupSidebarPersistence() {
        var body    = document.body;
        var toggler = document.getElementById("sidebarToggle");
        if (!toggler) return;

        var STORAGE_KEY = "mw_sidebar_collapsed";

        // Restore saved state before paint
        if (sessionStorage.getItem(STORAGE_KEY) === "1") {
            body.classList.add("sb-sidenav-toggled");
        }

        toggler.addEventListener("click", function () {
            var collapsed = body.classList.toggle("sb-sidenav-toggled");
            try {
                sessionStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
            } catch (_) {}
        });
    }

    /* ------------------------------------------------------------------ */
    /* Init                                                                 */
    /* ------------------------------------------------------------------ */
    function init() {
        highlightActiveSidebarItem();
        setupFormSubmitFeedback();
        setupKeyboardShortcuts();
        setupFlashToasts();
        setupSidebarPersistence();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
