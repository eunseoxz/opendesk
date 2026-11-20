/**
 * OpenDesk chain wiring (viem + ABI).
 * Signatures:
 *   hasAgentId(address) view -> bool
 *   openTicket(string title, string category, string note) payable
 *   cancelTicket(uint256 ticketId)
 *   resolveTicket(uint256 ticketId)  // operator only, not called from this UI
 *   getTicket(uint256) -> opener, fee, title, category, note, status, openedAt
 *   event TicketOpened(ticketId, agent, fee, title, category)
 *
 * ABI: ./OpenDesk.abi.json (copied from deploy/). Desk address comes from
 * window.OpenDeskConfig.openDesk and stays null until mainnet broadcast.
 * Default UI remains demo-capable when ?demo= is set. This module never
 * auto-signs and never holds a private key.
 */
(function (global) {
  const cfg = () => global.OpenDeskConfig || {};
  const REGISTRY = (cfg().registry || "0x60b9262456de011f7d15a54cdd8c48baaa8b022f");
  const MIN_FEE_WEI = BigInt(cfg().minFeeWei || "1000000000000000");
  const MIN_FEE_BNB = "0.001";
  const ABI_URL = "./OpenDesk.abi.json";
  const VIEM = "https://esm.sh/viem@2.21.54";
  const VIEM_CHAINS = "https://esm.sh/viem@2.21.54/chains";

  const CATEGORIES = [
    "Review",
    "Tech check",
    "File delivery",
    "Short consult",
    "Demo ping",
  ];

  // Contract enum: 0 None, 1 Open, 2 Resolved, 3 Cancelled
  const STATUS = {
    0: "none",
    1: "open",
    2: "resolved",
    3: "cancelled",
    open: "open",
    resolved: "resolved",
    cancelled: "cancelled",
  };

  let viemMod = null;
  let bscChain = null;
  let abi = null;
  let walletClient = null;
  let publicClient = null;
  let account = null;

  function deskAddress() {
    const a = cfg().openDesk;
    return a || null;
  }

  function shortAddr(a) {
    if (!a || a.length < 10) return a || "";
    return a.slice(0, 6) + "\u2026" + a.slice(-4);
  }

  function weiToBnb(wei) {
    const w = typeof wei === "bigint" ? wei : BigInt(wei);
    const whole = w / 1000000000000000000n;
    const frac = w % 1000000000000000000n;
    const s = frac.toString().padStart(18, "0").replace(/0+$/, "");
    return s ? whole.toString() + "." + s : whole.toString();
  }

  function bnbToWei(bnbStr) {
    const raw = String(bnbStr || "").trim();
    if (!raw) return MIN_FEE_WEI;
    if (!/^\d+(\.\d+)?$/.test(raw)) throw new Error("Invalid fee amount");
    const [whole, frac = ""] = raw.split(".");
    const fracPadded = (frac + "000000000000000000").slice(0, 18);
    return BigInt(whole) * 1000000000000000000n + BigInt(fracPadded);
  }

  function explorerTx(hash) {
    const base = (cfg().explorer || "https://bscscan.com").replace(/\/$/, "");
    return base + "/tx/" + hash;
  }

  function mapTicket(id, result) {
    const [opener, fee, title, category, note, status, openedAt] = result;
    const statusNum = typeof status === "bigint" ? Number(status) : Number(status);
    return {
      id: typeof id === "bigint" ? Number(id) : Number(id),
      opener,
      agent: opener,
      fee: fee.toString(),
      feeBnb: weiToBnb(fee),
      title,
      category,
      note,
      status: STATUS[statusNum] || "open",
      openedAt: typeof openedAt === "bigint" ? Number(openedAt) : Number(openedAt),
    };
  }

  async function loadViem() {
    if (viemMod && bscChain) return;
    const [v, chains] = await Promise.all([
      import(VIEM),
      import(VIEM_CHAINS),
    ]);
    viemMod = v;
    bscChain = chains.bsc;
  }

  async function loadAbi() {
    if (abi) return abi;
    const res = await fetch(ABI_URL);
    if (!res.ok) throw new Error("Failed to load OpenDesk ABI (" + res.status + ")");
    abi = await res.json();
    return abi;
  }

  async function ensureChain(ethereum) {
    const chainId = "0x38";
    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId }],
      });
    } catch (switchErr) {
      if (switchErr && switchErr.code === 4902) {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId,
            chainName: cfg().chainName || "BNB Smart Chain",
            nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
            rpcUrls: [cfg().rpcUrl || "https://bsc-dataseed.binance.org"],
            blockExplorerUrls: [cfg().explorer || "https://bscscan.com"],
          }],
        });
      } else {
        throw switchErr;
      }
    }
  }

  function makePublicClient() {
    const { createPublicClient, http, custom } = viemMod;
    if (global.ethereum) {
      return createPublicClient({
        chain: bscChain,
        transport: custom(global.ethereum),
      });
    }
    return createPublicClient({
      chain: bscChain,
      transport: http(cfg().rpcUrl || "https://bsc-dataseed.binance.org"),
    });
  }

  async function connectWallet() {
    if (typeof global.ethereum === "undefined") {
      throw new Error("No EIP-1193 provider. Install MetaMask or Binance Web3 wallet, or use demo mode.");
    }
    await loadViem();
    await loadAbi();
    await ensureChain(global.ethereum);
    const accounts = await global.ethereum.request({ method: "eth_requestAccounts" });
    if (!accounts || !accounts.length) throw new Error("No account returned");
    account = accounts[0];
    const { createWalletClient, custom } = viemMod;
    walletClient = createWalletClient({
      account,
      chain: bscChain,
      transport: custom(global.ethereum),
    });
    publicClient = makePublicClient();
    return { address: account };
  }

  function disconnectWallet() {
    walletClient = null;
    publicClient = null;
    account = null;
  }

  async function ensureReadClient() {
    await loadViem();
    if (!publicClient) publicClient = makePublicClient();
    return publicClient;
  }

  const REGISTRY_ABI = [
    {
      type: "function",
      name: "balanceOf",
      stateMutability: "view",
      inputs: [{ name: "owner", type: "address" }],
      outputs: [{ name: "", type: "uint256" }],
    },
  ];

  async function hasAgentId(address) {
    if (!address) return false;
    const client = await ensureReadClient();
    const desk = deskAddress();
    if (desk) {
      await loadAbi();
      return Boolean(
        await client.readContract({
          address: desk,
          abi,
          functionName: "hasAgentId",
          args: [address],
        })
      );
    }
    const bal = await client.readContract({
      address: REGISTRY,
      abi: REGISTRY_ABI,
      functionName: "balanceOf",
      args: [address],
    });
    return bal > 0n;
  }

  async function openTicket({ title, category, note, valueWei }) {
    const desk = deskAddress();
    if (!desk) throw new Error("OpenDesk address is not set yet (waiting for mainnet deploy).");
    if (!walletClient || !account) throw new Error("Connect wallet first.");
    await loadAbi();
    const value = typeof valueWei === "bigint" ? valueWei : BigInt(valueWei || MIN_FEE_WEI);
    if (value < MIN_FEE_WEI) throw new Error("Fee is below the 0.001 BNB minimum.");
    const hash = await walletClient.writeContract({
      address: desk,
      abi,
      functionName: "openTicket",
      args: [title, category, note || ""],
      value,
      account,
      chain: bscChain,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const { decodeEventLog } = viemMod;
    let ticketId = null;
    for (const logItem of receipt.logs) {
      try {
        const decoded = decodeEventLog({ abi, data: logItem.data, topics: logItem.topics });
        if (decoded.eventName === "TicketOpened") {
          ticketId = decoded.args.ticketId;
          break;
        }
      } catch (_) {}
    }
    let ticket = null;
    if (ticketId != null) {
      ticket = await getTicket(ticketId);
    }
    return { hash, ticketId: ticketId != null ? ticketId.toString() : null, ticket, explorer: explorerTx(hash) };
  }

  async function cancelTicket(ticketId) {
    const desk = deskAddress();
    if (!desk) throw new Error("OpenDesk address is not set yet (waiting for mainnet deploy).");
    if (!walletClient || !account) throw new Error("Connect wallet first.");
    await loadAbi();
    const hash = await walletClient.writeContract({
      address: desk,
      abi,
      functionName: "cancelTicket",
      args: [BigInt(ticketId)],
      account,
      chain: bscChain,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    return { hash, explorer: explorerTx(hash) };
  }

  async function getTicket(ticketId) {
    const desk = deskAddress();
    if (!desk) throw new Error("OpenDesk address is not set yet (waiting for mainnet deploy).");
    const client = await ensureReadClient();
    await loadAbi();
    const result = await client.readContract({
      address: desk,
      abi,
      functionName: "getTicket",
      args: [BigInt(ticketId)],
    });
    return mapTicket(ticketId, result);
  }

  async function listTicketsFor(agent) {
    const desk = deskAddress();
    if (!desk || !agent) return [];
    const client = await ensureReadClient();
    await loadAbi();
    const { parseAbiItem } = viemMod;
    const fromBlock = cfg().deployBlock != null ? BigInt(cfg().deployBlock) : 0n;
    const event = parseAbiItem(
      "event TicketOpened(uint256 indexed ticketId, address indexed agent, uint256 fee, string title, string category)"
    );
    const logs = await client.getLogs({
      address: desk,
      event,
      args: { agent },
      fromBlock,
      toBlock: "latest",
    });
    const ids = logs.map((l) => l.args.ticketId).filter((id) => id != null);
    const tickets = [];
    for (const id of ids) {
      try {
        tickets.push(await getTicket(id));
      } catch (_) {}
    }
    tickets.sort((a, b) => Number(b.id) - Number(a.id));
    return tickets;
  }

  function isLiveConfigured() {
    return Boolean(deskAddress());
  }

  global.OpenDeskChain = {
    REGISTRY,
    MIN_FEE_WEI,
    MIN_FEE_BNB,
    get DESK_ADDRESS() {
      return deskAddress();
    },
    CATEGORIES,
    STATUS,
    shortAddr,
    weiToBnb,
    bnbToWei,
    explorerTx,
    isLiveConfigured,
    connectWallet,
    disconnectWallet,
    hasAgentId,
    openTicket,
    cancelTicket,
    getTicket,
    listTicketsFor,
  };
})(typeof window !== "undefined" ? window : globalThis);
