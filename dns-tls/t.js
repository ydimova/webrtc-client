// Tracker script: sets a persistent tracking ID, then reports to https://<id>.<POC_TRACKER>/collect
(function () {
  const BASE = window.POC_TRACKER;
  const log = (m) => (window.pocLog ? window.pocLog(m) : console.log("[tracker]", m));

  // ?id=... forces a fixed ID (useful for exact-host block rules)
  let id = new URLSearchParams(location.search).get("id") || localStorage.getItem("poc_tid");
  if (!id) {
    id = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, "0")).join("");
    localStorage.setItem("poc_tid", id);
  }
  document.cookie = "poc_tid=" + id + "; path=/; max-age=31536000; SameSite=Lax";

  const origin = "https://" + id + "." + BASE;
  const url = origin + "/collect";
  const payload = () => JSON.stringify({ id, page: location.href, t: Date.now() });
  const hint = (rel) => {
    const l = document.createElement("link");
    l.rel = rel;
    l.href = origin;
    document.head.append(l);
    log(rel + " hint added for " + origin);
  };

  const send = {
    // JSON content type forces a CORS preflight (OPTIONS), like real trackers
    fetch: () =>
      fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload() }).then(
        (r) => log("fetch POST → HTTP " + r.status),
        (e) => log("fetch POST failed: " + e)
      ),
    beacon: () => log("sendBeacon queued: " + navigator.sendBeacon(url, payload())),
    preconnect: () => hint("preconnect"),
    dnsprefetch: () => hint("dns-prefetch"),
  };

  window.pocTracker = { id, url, send };
  log("tracking id " + id + " → " + url);

  const modes = new URLSearchParams(location.search).get("mode") || "fetch";
  modes.split(",").forEach((m) => (send[m] ? send[m]() : m !== "none" && log("unknown mode " + m)));
})();
