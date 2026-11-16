  /* ---------- Forms: send to the site, which stores and emails the enquiry ---------- */
  document.querySelectorAll("form[data-demo]").forEach((f) => {
    const started = Date.now();
    const hp = document.createElement("div"); hp.className = "sap-hp"; hp.setAttribute("aria-hidden", "true");
    hp.innerHTML = '<label>Website<input type="text" name="website" tabindex="-1" autocomplete="off"></label>';
    f.appendChild(hp);
    const status = document.createElement("p"); status.className = "form__status"; status.setAttribute("role", "status"); f.appendChild(status);
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      const btn = f.querySelector("[type=submit]");
      const label = btn ? btn.textContent : "";
      const data = Object.fromEntries(new FormData(f).entries());
      data.page = location.pathname; data.elapsed = Math.round((Date.now() - started) / 1000);
      if (btn) { btn.disabled = true; btn.textContent = "…"; }
      status.className = "form__status"; status.textContent = "";
      const fail = (msg) => { status.className = "form__status is-error"; status.textContent = msg || "Your message could not be sent. Please write to sales@schmoll-asia.com."; if (btn) { btn.disabled = false; btn.textContent = label; } };
      fetch((window.SAP && window.SAP.contact) || "/wp-json/sap/v1/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
        .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
        .then(({ ok, j }) => {
          if (!ok) return fail(j && j.message);
          if (btn) { btn.textContent = "✓ " + (btn.dataset.sent || "Sent"); }
          status.textContent = "Thank you. We have received your details.";
          f.reset();
          setTimeout(() => { if (btn) { btn.textContent = label; btn.disabled = false; } }, 4000);
        })
        .catch(() => fail());
    });
  });
