(function () {
  const C = window.OpenDeskChain;
  const $ = (sel, el = document) => el.querySelector(sel);
  const app = $("#app");

  const DEMO_TICKETS = [
    {
      id: 1,
      opener: "0xA11CE00000000000000000000000000000D00D",
      fee: "1000000000000000",
      title: "Review landing copy",
      category: "Review",
      note: "Check pitch tone for Agent ID holders.",
      status: "open",
      openedAt: 1732032000,
    },
    {
      id: 2,
      opener: "0xA11CE00000000000000000000000000000D00D",
      fee: "1000000000000000",
      title: "Tech check registry gate",
      category: "Tech check",
      note: "",
      status: "resolved",
      openedAt: 1731945600,
    },
    {
      id: 3,
      opener: "0xA11CE00000000000000000000000000000D00D",
      fee: "2000000000000000",
      title: "Demo ping",
      category: "Demo ping",
      note: "One-tx smoke.",
      status: "cancelled",
      openedAt: 1731859200,
    },
  ];

  const state = {
    demo: "ready", // disconnected | noagent | ready | loading | error | live
    live: false,
    address: null,
    hasAgent: false,
    tickets: [],
    lastReceipt: null,
    pending: false,
    errorMsg: "",
    fetchingId: null,
  };

  function icon(name, cls = "icon") {
    return `<img class="${cls}" src="./assets/icons/${name}.svg" alt="" width="20" height="20" />`;
  }

  function parseRoute() {
    const h = (location.hash || "#/").replace(/^#/, "") || "/";
    const parts = h.split("/").filter(Boolean);
    if (parts[0] === "ticket" && parts[1]) return { name: "ticket", id: parts[1] };
    if (parts[0] === "desk") return { name: "desk" };
    if (parts[0] === "tickets") return { name: "tickets" };
    if (parts[0] === "faq") return { name: "faq" };
    return { name: "home" };
  }

  function applyDemo(mode) {
    state.live = false;
    state.demo = mode;
    state.errorMsg = "";
    state.pending = mode === "loading";
    state.lastReceipt = null;
    if (mode === "disconnected") {
      state.address = null;
      state.hasAgent = false;
      state.tickets = [];
    } else if (mode === "noagent") {
      state.address = "0xBEEF000000000000000000000000000000CAFE";
      state.hasAgent = false;
      state.tickets = [];
    } else if (mode === "ready") {
      state.address = "0xA11CE00000000000000000000000000000D00D";
      state.hasAgent = true;
      state.tickets = DEMO_TICKETS.slice();
    } else if (mode === "loading") {
      state.address = "0xA11CE00000000000000000000000000000D00D";
      state.hasAgent = true;
      state.tickets = DEMO_TICKETS.slice();
      state.pending = true;
    } else if (mode === "error") {
      state.address = "0xA11CE00000000000000000000000000000D00D";
      state.hasAgent = true;
      state.tickets = DEMO_TICKETS.slice();
      state.errorMsg = "Transaction rejected or RPC failed. You can retry.";
    } else if (mode === "empty") {
      state.address = "0xA11CE00000000000000000000000000000D00D";
      state.hasAgent = true;
      state.tickets = [];
    }
    const url = new URL(location.href);
    url.searchParams.set("demo", mode);
    history.replaceState(null, "", url.pathname + url.search + location.hash);
    render();
  }

  function statusChip(status) {
    const s = String(status).toLowerCase();
    const label = s.charAt(0).toUpperCase() + s.slice(1);
    const ic =
      s === "resolved" ? "status-resolved" : s === "cancelled" ? "status-cancelled" : "status-open";
    return `<span class="chip chip-${s}">${icon(ic)} ${label}</span>`;
  }

  function agentChip() {
    if (!state.address) {
      return `<span class="chip chip-muted">${icon("connect")} Not connected</span>`;
    }
    if (!state.hasAgent) {
      return `<span class="chip chip-warn">${icon("agent-id-badge")} No Agent ID</span>`;
    }
    return `<span class="chip chip-ok">${icon("agent-id-badge")} Agent ID ready</span>`;
  }

  function shell(content) {
    const route = parseRoute();
    const nav = [
      ["home", "#/", "Home"],
      ["desk", "#/desk", "Desk"],
      ["tickets", "#/tickets", "Tickets"],
      ["faq", "#/faq", "FAQ"],
    ]
      .map(([name, href, label]) => {
        const cur =
          route.name === name ||
          (name === "home" && route.name === "home") ||
          (name === "tickets" && route.name === "ticket");
        return `<a href="${href}" ${cur ? 'aria-current="page"' : ""}>${label}</a>`;
      })
      .join("");

    const demoOn = new URLSearchParams(location.search).has("demo");
    const demoModes = ["disconnected", "noagent", "ready", "loading", "empty", "error"];
    let demoControls = "";
    if (demoOn) {
      const demos = demoModes
        .map(
          (m) =>
            `<button type="button" data-demo="${m}" aria-pressed="${state.demo === m}">${m}</button>`
        )
        .join("");
      const demoOptions = demoModes
        .map((m) => `<option value="${m}" ${state.demo === m ? "selected" : ""}>${m}</option>`)
        .join("");
      demoControls = `
            <div class="demo-switch" role="group" aria-label="Demo wallet state">${demos}</div>
            <label class="sr-only" for="demo-select">Demo state</label>
            <select id="demo-select" class="demo-select" aria-label="Demo wallet state">${demoOptions}</select>`;
    }

    return `
      <div class="app-shell">
        <header class="topbar">
          <a class="brand" href="#/" aria-label="OpenDesk home">
            ${icon("mark", "icon brand-mark")}
            <span class="brand-text">OpenDesk</span>
          </a>
          <div class="topbar-actions">
            ${demoControls}
            <div class="topbar-wallet">
            ${
              state.address
                ? `<span class="chip mono" title="${state.address}">${C.shortAddr(state.address)}</span>
                   <button type="button" class="btn btn-ghost" data-action="disconnect">Disconnect</button>`
                : `<button type="button" class="btn btn-primary" data-action="connect">${icon("connect")} Connect wallet</button>`
            }
            </div>
          </div>
        </header>
        <nav class="nav-links" aria-label="Primary">${nav}</nav>
        <main class="main" id="main" ${state.pending ? 'aria-busy="true"' : ""}>${content}</main>
        <footer class="footer">OpenDesk · BNB Chain · Agent ID gate · Always confirm transactions yourself · <a href="#/faq">FAQ</a> · <a href="https://github.com/eunseoxz/opendesk" rel="noopener">Repo</a></footer>
      </div>`;
  }

  function viewHome() {
    return `
      <section class="stack hero">
        <p class="section-title">Service desk</p>
        <h1>On-chain service desk for Agent ID holders.</h1>
        <p class="lead">Open a small paid ticket, get a receipt tied to your Agent ID. No escrow marketplace. You confirm every transaction in your wallet.</p>
        <div class="row">
          <a class="btn btn-primary" href="#/desk">${icon("ticket")} Open a ticket</a>
          <a class="btn btn-secondary" href="#/faq">How Agent ID works</a>
        </div>
        <div class="card stack">
          <div class="row">${agentChip()}</div>
          <p class="muted" style="margin:0">Agent ID is required. Without it, pay and open stay disabled. Claim Agent ID inside the official Binance Wallet app (in-app Agent ID flow). OpenDesk never asks for seed phrases or hosts a fake claim URL.</p>
        </div>
      </section>`;
  }

  function viewDesk() {
    const liveLocked = state.live && !C.isLiveConfigured();
    const disabled = !state.address || !state.hasAgent || state.pending || liveLocked;
    const cats = C.CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join("");
    let banner = "";
    if (!state.address) {
      banner = `<div class="banner banner-warn">${icon("alert")}<div><strong>Connect wallet</strong><p class="muted" style="margin:4px 0 0">Use MetaMask, Binance Web3, or another EIP-1193 provider.</p></div></div>`;
    } else if (!state.hasAgent) {
      banner = `<div class="banner banner-warn">${icon("alert")}<div><strong>Claim Agent ID first</strong><p class="muted" style="margin:4px 0 0">Open Binance Wallet in-app Agent ID, then return here. Pay stays disabled until <span class="mono">hasAgentId</span> is true.</p></div></div>`;
    } else if (liveLocked) {
      banner = `<div class="banner banner-warn">${icon("alert")}<div><strong>Desk not deployed yet</strong><p class="muted" style="margin:4px 0 0">Agent ID check can run against the live registry. Open and cancel stay disabled until the mainnet address is set in config.js.</p></div></div>`;
    }
    if (state.errorMsg) {
      banner += `<div class="banner banner-danger">${icon("alert")}<div><strong>Error</strong><p class="muted" style="margin:4px 0 8px">${state.errorMsg}</p><button type="button" class="btn btn-secondary" data-action="retry-error">Retry</button></div></div>`;
    }
    if (state.lastReceipt) {
      const r = state.lastReceipt;
      banner += `<div class="banner banner-ok">${icon("receipt")}<div><strong>Ticket opened</strong><p class="muted" style="margin:4px 0 8px">#${r.id} · ${r.feeBnb} BNB · ${r.category}</p><a class="btn btn-secondary" href="#/ticket/${r.id}">View receipt</a></div></div>`;
    }
    const loadingBlock = state.pending
      ? `<div class="card" aria-live="polite"><p class="muted">Checking balance / waiting for wallet…</p><div class="stack"><div class="skeleton" style="width:70%"></div><div class="skeleton" style="width:50%"></div><div class="skeleton" style="width:40%"></div></div></div>`
      : "";

    return `
      <section class="stack">
        <div>
          <p class="section-title">Desk</p>
          <h1 style="margin:0;font-size:24px">Open a ticket</h1>
          <p class="muted">Fee default ${C.MIN_FEE_BNB} BNB (min). Title, category, and optional note go on-chain as strings.</p>
        </div>
        <div class="row">${agentChip()}</div>
        ${banner}
        ${loadingBlock}
        <form class="card form-grid" id="ticket-form" ${disabled ? "aria-disabled=true" : ""}>
          <label class="field">
            <span>Title</span>
            <input name="title" maxlength="80" required placeholder="Short request title" ${disabled ? "disabled" : ""} />
          </label>
          <label class="field">
            <span>Category</span>
            <select name="category" required ${disabled ? "disabled" : ""}>${cats}</select>
            <span class="help">Sent to contract as string label (not uint8).</span>
          </label>
          <label class="field">
            <span>Note (optional)</span>
            <textarea name="note" maxlength="500" placeholder="Plain text note" ${disabled ? "disabled" : ""}></textarea>
          </label>
          <label class="field">
            <span>Fee (BNB)</span>
            <input class="mono" name="fee" type="text" inputmode="decimal" value="${C.MIN_FEE_BNB}" ${disabled ? "disabled" : ""} />
            <span class="help">At least ${C.MIN_FEE_BNB} BNB (minFee); no maxFee in the contract · you confirm in wallet</span>
          </label>
          <button class="btn btn-primary" type="submit" ${disabled ? "disabled" : ""}>${icon("ticket")} Open ticket</button>
        </form>
      </section>`;
  }

  function viewTickets() {
    if (!state.address) {
      return `<section class="stack"><h1 style="font-size:24px;margin:0">Your tickets</h1><div class="banner banner-warn">${icon("alert")}<div>Connect wallet to list tickets for your address.</div></div></section>`;
    }
    if (state.pending) {
      return `<section class="stack" aria-busy="true"><h1 style="font-size:24px;margin:0">Your tickets</h1><div class="card stack"><div class="skeleton"></div><div class="skeleton" style="width:80%"></div><div class="skeleton" style="width:60%"></div></div></section>`;
    }
    if (!state.tickets.length) {
      return `
        <section class="stack">
          <div class="row" style="justify-content:space-between">
            <h1 style="font-size:24px;margin:0">Your tickets</h1>
            <a class="btn btn-primary" href="#/desk">${icon("ticket")} New</a>
          </div>
          <div class="empty card">
            ${icon("empty-desk", "icon icon-lg")}
            <p><strong>No tickets yet</strong></p>
            <p class="muted">Open a small paid ticket from the desk when your Agent ID is ready.</p>
            <a class="btn btn-secondary" href="#/desk">Go to desk</a>
          </div>
        </section>`;
    }
    const items = state.tickets
      .map(
        (t) => `
      <a class="ticket-item" href="#/ticket/${t.id}">
        <div class="ticket-meta">${statusChip(t.status)}<span class="mono muted">#${t.id}</span><span class="mono muted">${C.weiToBnb(t.fee)} BNB</span></div>
        <h3>${escapeHtml(t.title)}</h3>
        <p class="muted" style="margin:0">${escapeHtml(t.category)}</p>
      </a>`
      )
      .join("");
    return `
      <section class="stack">
        <div class="row" style="justify-content:space-between">
          <div>
            <p class="section-title">Tickets</p>
            <h1 style="font-size:24px;margin:0">Your tickets</h1>
          </div>
          <a class="btn btn-primary" href="#/desk">${icon("ticket")} New</a>
        </div>
        <div class="ticket-list">${items}</div>
      </section>`;
  }

  function viewTicket(id) {
    const t = state.tickets.find((x) => String(x.id) === String(id)) || state.lastReceipt;
    if (!t || String(t.id) !== String(id)) {
      if (state.pending) {
        return `<section class="card" aria-busy="true"><div class="skeleton"></div><div class="skeleton" style="width:70%"></div></section>`;
      }
      return `<section class="stack"><div class="banner banner-danger">${icon("alert")}<div>Ticket #${escapeHtml(id)} not found.</div></div><a class="btn btn-secondary" href="#/tickets">Back</a></section>`;
    }
    const feeBnb = t.feeBnb || C.weiToBnb(t.fee);
    const when = t.openedAt
      ? new Date(t.openedAt * 1000).toISOString().replace("T", " ").slice(0, 19) + " UTC"
      : "-";
    const canCancel = String(t.status).toLowerCase() === "open";
    return `
      <section class="stack">
        <a class="muted" href="#/tickets">← Tickets</a>
        <div class="row">${statusChip(t.status)} ${agentChip()}</div>
        <article class="receipt" aria-label="Ticket receipt">
          <h2>${icon("receipt", "icon")} Receipt · #${t.id}</h2>
          <dl>
            <div><dt>Title</dt><dd>${escapeHtml(t.title)}</dd></div>
            <div><dt>Category</dt><dd>${escapeHtml(t.category)}</dd></div>
            <div><dt>Agent</dt><dd class="mono">${escapeHtml(t.opener || state.address || "")}</dd></div>
            <div><dt>Fee</dt><dd class="mono">${feeBnb} BNB</dd></div>
            <div><dt>Opened</dt><dd class="mono">${when}</dd></div>
            <div><dt>Note</dt><dd>${escapeHtml(t.note || "(none)")}</dd></div>
            <div><dt>Status</dt><dd>${escapeHtml(String(t.status))}</dd></div>
          </dl>
          <div class="receipt-stub">
            <span>OpenDesk</span>
            <span>Tied to Agent ID</span>
          </div>
        </article>
        ${
          canCancel
            ? `<button type="button" class="btn btn-danger" data-action="cancel" data-id="${t.id}">Cancel + refund (before resolve)</button>
               <p class="help">Policy: cancel refunds while open. After resolve, fee is non-refundable.</p>`
            : ""
        }
      </section>`;
  }

  function viewFaq() {
    return `
      <section class="stack faq">
        <div>
          <p class="section-title">FAQ</p>
          <h1 style="font-size:24px;margin:0">Before you open a ticket</h1>
        </div>
        <details open>
          <summary>How do I get an Agent ID?</summary>
          <p>Claim Agent ID inside the official Binance Wallet app (in-app Agent ID). OpenDesk does not host a claim page and will never ask for your seed phrase. After you hold the NFT at registry <span class="mono">0x60b9…022f</span>, return here and connect.</p>
        </details>
        <details>
          <summary>Why is Agent ID required?</summary>
          <p>The contract gates <span class="mono">openTicket</span> with <span class="mono">hasAgentId</span>. Receipts bind to your agent address. No Agent ID means no pay button.</p>
        </details>
        <details>
          <summary>Do I auto-sign transactions?</summary>
          <p>No. Every on-chain action shows your wallet popup. Always read fee and gas, then confirm yourself.</p>
        </details>
        <details>
          <summary>Can I cancel or get a refund?</summary>
          <p>Yes, while status is open: <span class="mono">cancelTicket</span> refunds the fee. After an operator resolves the ticket, the fee is non-refundable.</p>
        </details>
        <details>
          <summary>What is the default fee?</summary>
          <p>Fee must be at least minFee (${C.MIN_FEE_BNB} BNB); there is no maxFee in the contract. Value is sent as native BNB with the open call.</p>
        </details>
      </section>`;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function render() {
    const route = parseRoute();
    let body = "";
    if (route.name === "desk") body = viewDesk();
    else if (route.name === "tickets") body = viewTickets();
    else if (route.name === "ticket") body = viewTicket(route.id);
    else if (route.name === "faq") body = viewFaq();
    else body = viewHome();
    app.innerHTML = shell(body);
    bind();
  }

  function errText(e) {
    return (e && (e.shortMessage || e.message)) || String(e);
  }

  async function liveConnect() {
    state.live = true;
    state.demo = "live";
    state.pending = true;
    state.errorMsg = "";
    render();
    try {
      const { address } = await C.connectWallet();
      state.address = address;
      state.hasAgent = await C.hasAgentId(address);
      try {
        state.tickets = C.isLiveConfigured() ? await C.listTicketsFor(address) : [];
      } catch (e) {
        state.tickets = [];
        if (C.isLiveConfigured()) state.errorMsg = errText(e);
      }
      if (!C.isLiveConfigured()) {
        state.errorMsg = "Contract address is not set yet. You can check Agent ID, but open/cancel wait for mainnet deploy.";
      }
      state.pending = false;
      render();
    } catch (e) {
      state.pending = false;
      state.address = null;
      state.hasAgent = false;
      state.errorMsg = errText(e);
      render();
    }
  }

  function liveDisconnect() {
    if (C.disconnectWallet) C.disconnectWallet();
    state.live = true;
    state.demo = "live";
    state.address = null;
    state.hasAgent = false;
    state.tickets = [];
    state.lastReceipt = null;
    state.pending = false;
    state.errorMsg = "";
    const url = new URL(location.href);
    url.searchParams.delete("demo");
    history.replaceState(null, "", url.pathname + url.search + location.hash);
    render();
  }

  async function liveRefresh() {
    if (!state.address) return;
    state.pending = true;
    state.errorMsg = "";
    render();
    try {
      state.hasAgent = await C.hasAgentId(state.address);
      if (C.isLiveConfigured()) {
        state.tickets = await C.listTicketsFor(state.address);
      }
      state.pending = false;
      render();
    } catch (e) {
      state.pending = false;
      state.errorMsg = errText(e);
      render();
    }
  }

  async function liveOpen(title, category, note, feeStr) {
    state.pending = true;
    state.errorMsg = "";
    render();
    try {
      const valueWei = C.bnbToWei(feeStr);
      const result = await C.openTicket({ title, category, note, valueWei });
      if (result.ticket) {
        state.tickets = [result.ticket, ...state.tickets.filter((x) => String(x.id) !== String(result.ticket.id))];
        state.lastReceipt = result.ticket;
        state.pending = false;
        location.hash = "#/ticket/" + result.ticket.id;
        render();
        return;
      }
      await liveRefresh();
    } catch (e) {
      state.pending = false;
      state.errorMsg = errText(e);
      render();
    }
  }

  async function liveCancel(id) {
    state.pending = true;
    state.errorMsg = "";
    render();
    try {
      await C.cancelTicket(id);
      const updated = await C.getTicket(id);
      state.tickets = state.tickets.map((x) => (String(x.id) === String(id) ? updated : x));
      state.pending = false;
      render();
    } catch (e) {
      state.pending = false;
      state.errorMsg = errText(e);
      render();
    }
  }

  async function liveFetchTicket(id) {
    if (!state.live || !C.isLiveConfigured()) return;
    if (state.tickets.some((x) => String(x.id) === String(id))) return;
    if (state.fetchingId === String(id)) return;
    state.fetchingId = String(id);
    state.pending = true;
    render();
    try {
      const t = await C.getTicket(id);
      if (t && t.opener && t.opener !== "0x0000000000000000000000000000000000000000") {
        state.tickets.push(t);
      }
    } catch (_) {
      // leave as not found
    }
    state.fetchingId = null;
    state.pending = false;
    render();
  }

  function bind() {
    app.querySelectorAll("[data-demo]").forEach((btn) => {
      btn.addEventListener("click", () => applyDemo(btn.getAttribute("data-demo")));
    });
    const demoSelect = $("#demo-select", app);
    if (demoSelect) {
      demoSelect.addEventListener("change", () => applyDemo(demoSelect.value));
    }
    const connect = $('[data-action="connect"]', app);
    if (connect) {
      connect.addEventListener("click", () => {
        if (state.live || !new URLSearchParams(location.search).has("demo")) {
          liveConnect();
          return;
        }
        // Offline demo path (screenshots / QA)
        applyDemo("ready");
      });
    }
    const disconnect = $('[data-action="disconnect"]', app);
    if (disconnect) {
      disconnect.addEventListener("click", () => {
        if (state.live) {
          liveDisconnect();
          return;
        }
        applyDemo("disconnected");
      });
    }
    const retry = $('[data-action="retry-error"]', app);
    if (retry) {
      retry.addEventListener("click", () => {
        if (state.live) {
          liveRefresh();
          return;
        }
        applyDemo("ready");
      });
    }
    const cancel = $('[data-action="cancel"]', app);
    if (cancel) {
      cancel.addEventListener("click", () => {
        const id = Number(cancel.getAttribute("data-id"));
        if (state.live) {
          liveCancel(id);
          return;
        }
        const t = state.tickets.find((x) => x.id === id);
        if (t) t.status = "cancelled";
        render();
      });
    }
    const form = $("#ticket-form", app);
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!state.hasAgent || !state.address) return;
        const fd = new FormData(form);
        const title = String(fd.get("title") || "").trim();
        const category = String(fd.get("category") || "");
        const note = String(fd.get("note") || "").trim();
        const feeStr = String(fd.get("fee") || C.MIN_FEE_BNB);
        if (!title) return;
        if (state.live) {
          liveOpen(title, category, note, feeStr);
          return;
        }
        state.pending = true;
        state.demo = "loading";
        render();
        setTimeout(() => {
          const id = Math.max(0, ...state.tickets.map((t) => t.id)) + 1;
          const ticket = {
            id,
            opener: state.address,
            fee: "1000000000000000",
            feeBnb: feeStr,
            title,
            category,
            note,
            status: "open",
            openedAt: Math.floor(Date.now() / 1000),
          };
          state.tickets.unshift(ticket);
          state.lastReceipt = ticket;
          state.pending = false;
          state.demo = "ready";
          location.hash = "#/ticket/" + id;
          render();
        }, 700);
      });
    }
  }

  function boot() {
    const params = new URLSearchParams(location.search);
    window.addEventListener("hashchange", () => {
      const route = parseRoute();
      if (state.live && route.name === "ticket") liveFetchTicket(route.id);
      render();
    });
    if (params.has("demo")) {
      applyDemo(params.get("demo") || "ready");
      return;
    }
    state.live = true;
    state.demo = "live";
    state.address = null;
    state.hasAgent = false;
    state.tickets = [];
    render();
    const route = parseRoute();
    if (route.name === "ticket") liveFetchTicket(route.id);
  }

  boot();
})();
