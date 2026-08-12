/*!
 * return-ribbon.js — James Mulhern properties
 * Shows a "Back to [Site]" ribbon at the top of the page when the visitor
 * arrived via document.referrer from another known Mulhern property.
 * Falls back to nothing if the referrer is unknown/external/same-site.
 * Safe to include on every page; no-ops silently if anything is unexpected.
 */
(function () {
  try {
    var KNOWN_SITES = [
      { host: "www.authorjamesmulhern.com", label: "James Mulhern — Author Site", url: "https://www.authorjamesmulhern.com" },
      { host: "authorjamesmulhern.com", label: "James Mulhern — Author Site", url: "https://www.authorjamesmulhern.com" },
      { host: "silvercurrentpress.com", label: "Silver Current Press", url: "https://silvercurrentpress.com" },
      { host: "www.silvercurrentpress.com", label: "Silver Current Press", url: "https://silvercurrentpress.com" },
      { host: "salon.silvercurrentpress.com", label: "The 2601 Salon", url: "https://salon.silvercurrentpress.com" },
      { host: "art-of-telling.com", label: "The Art of Telling", url: "https://art-of-telling.com" },
      { host: "www.art-of-telling.com", label: "The Art of Telling", url: "https://art-of-telling.com" },
      { host: "companion.art-of-telling.com", label: "The Art of Telling — Companion", url: "https://companion.art-of-telling.com" },
      { host: "submittingpoetry.silvercurrentpress.com", label: "Submitting Poetry", url: "https://submittingpoetry.silvercurrentpress.com" },
      { host: "submittingmemoirs.silvercurrentpress.com", label: "Submitting Memoirs", url: "https://submittingmemoirs.silvercurrentpress.com" },
      { host: "submittingshortstories.silvercurrentpress.com", label: "Submitting Short Stories", url: "https://submittingshortstories.silvercurrentpress.com" },
      { host: "shortstories.silvercurrentpress.com", label: "The Mulhern Story Library", url: "https://shortstories.silvercurrentpress.com" },
      { host: "publishingpoetry.silvercurrentpress.com", label: "Publishing Poetry", url: "https://publishingpoetry.silvercurrentpress.com" }
    ];

    if (!document.referrer) return;

    var refHost;
    try {
      refHost = new URL(document.referrer).hostname;
    } catch (e) {
      return;
    }

    if (refHost === window.location.hostname) return; // same site, no ribbon needed

    var match = null;
    for (var i = 0; i < KNOWN_SITES.length; i++) {
      if (KNOWN_SITES[i].host === refHost) {
        match = KNOWN_SITES[i];
        break;
      }
    }
    if (!match) return;

    var ribbon = document.createElement("div");
    ribbon.id = "mulhern-return-ribbon";
    ribbon.setAttribute("role", "navigation");
    ribbon.setAttribute("aria-label", "Return to previous site");
    ribbon.style.cssText = [
      "background:#10182E",
      "color:#F8F1DD",
      "text-align:center",
      "padding:10px 16px",
      "font-family:system-ui,-apple-system,'Segoe UI',sans-serif",
      "font-size:14px",
      "font-weight:600",
      "letter-spacing:0.02em",
      "border-bottom:3px solid #6E4A0E",
      "position:relative",
      "z-index:9999"
    ].join(";");

    var a = document.createElement("a");
    a.href = document.referrer;
    a.style.cssText = "color:#F8F1DD;text-decoration:none;display:inline-flex;align-items:center;gap:8px;";
    a.onmouseover = function () { this.style.color = "#F0D080"; };
    a.onmouseout = function () { this.style.color = "#F8F1DD"; };

    var arrow = document.createElement("span");
    arrow.style.cssText = "font-size:16px;line-height:1;";
    arrow.innerHTML = "&#8592;";

    var text = document.createElement("span");
    text.innerHTML = "Back to <strong style=\"color:#F0D080;\">" + match.label + "</strong>";

    a.appendChild(arrow);
    a.appendChild(text);
    ribbon.appendChild(a);

    document.body.insertBefore(ribbon, document.body.firstChild);
  } catch (e) {
    /* fail silently — never break the page */
  }
})();
