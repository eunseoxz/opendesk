# Spec: OpenDesk

Kategori target: Agent Application Innovation Award (juara 1 10k USDC).
Mainnet follows green tests.

## 1. Satu kalimat pitch

OpenDesk adalah meja layanan on-chain di BNB Chain: hanya pemegang Agent ID yang bisa buka tiket berbayar kecil (BNB), bayar sendiri lewat konfirmasi wallet, lalu dapat receipt dan status yang terikat ke Agent ID-nya.

## 2. Masalah + kenapa Agent ID wajib di inti (bukan opsional)

Masalah: layanan kecil on-chain (review singkat, cek teknis, delivery file, konsultasi singkat) sering dibuka siapa saja. Tanpa identitas tetap, sulit bedakan user serius dari spam, dan receipt tidak terikat ke identitas yang bisa diverifikasi.

Kenapa Agent ID wajib di inti:
- Gate akses: `openTicket` gagal jika `balanceOf(registry, msg.sender) == 0`. Tanpa Agent ID, tidak ada tiket.
- Identitas pembayaran: event tiket menyimpan `agentAddress` (msg.sender yang punya NFT Agent ID). Receipt di frontend dibaca dari event + token URI/nama jika tersedia, bukan dari form bebas.
- Anti-sybil ringan: Agent ID non-transferable (satu per user). Volume farm multi-wallet tanpa Agent ID tidak masuk skor juri.
- Bukan stiker: UI tanpa Agent ID hanya menampilkan "claim Agent ID dulu" dan tombol connect. Semua aksi bayar/buka/tutup lewat kontrak yang cek registry.

Bobot Depth 30%: Agent ID adalah kunci bisnis (akses + identitas receipt), bukan badge di footer.

Diferensiasi dari bounty-board generik (Andri172/agent-bounty dll):
- OpenDesk = user bayar untuk buka tiket layanan ke desk/operator, bukan poster mengunci bounty untuk worker klaim.
- Tidak ada escrow multi-party worker claim.
- Fokus: gerbang berbayar + receipt terikat Agent ID + status tiket, bukan marketplace job.

## 3. Alur user (langkah demi langkah, termasuk konfirmasi wallet)

1. User buka situs OpenDesk (Pages). Halaman cek wallet connect (MetaMask / Binance Web3 / Agentic Wallet lewat provider standar, bukan QR pairing di situs kita).
2. Frontend panggil `balanceOf(registry, address)`. Jika 0: tampilkan status "butuh Agent ID" + link resmi claim di app Binance. Tidak ada tombol bayar.
3. Jika > 0: user isi form tiket (judul singkat, kategori, catatan opsional, fee default kecil misalnya 0.001 BNB, bisa diubah dalam batas min/max kontrak).
4. User klik "Buka tiket". Wallet muncul popup native: nilai BNB + gas. User harus konfirmasi sendiri. Tidak ada auto-sign, tidak ada bypass.
5. Setelah tx mined: kontrak emit `TicketOpened`. Frontend tampilkan receipt (ticketId, agent address, fee, timestamp, status = open).
6. Operator (alamat yang ditunjuk, bukan "owner tarik dana sembarang") menandai selesai lewat `resolveTicket(ticketId)` atau user bisa `cancelTicket` jika masih open (refund policy: v1 usulkan fee non-refundable supaya kontrak sederhana; alternatif refund hanya via cancel sebelum resolve).
7. User lihat daftar tiket miliknya (filter by agent address) dan status open/resolved/cancelled.

Setiap tx on-chain: selalu konfirmasi wallet user. Dilarang simpan sesi Agentic Wallet di server.

## 4. Kontrak (BNB Chain)

### Nama dan tanggung jawab

1. `OpenDesk.sol` (satu kontrak utama, cukup untuk MVP)
   - Buka tiket berbayar, simpan metadata ringkas on-chain (atau hash + URI off-chain), resolve/cancel, baca status.
   - Cek Agent ID ke registry tetap: `0x60b9262456de011f7d15a54cdd8c48baaa8b022f` (SPACE ID Agent ID NFT, non-transferable).

Opsional belakangan (cut list kalau mepet): `OpenDeskView` helper view-only, tidak perlu.

### Fungsi inti (signature-level)

```solidity
// baca registry
function hasAgentId(address user) public view returns (bool);

// buka tiket: msg.value >= minFee, require hasAgentId(msg.sender)
function openTicket(string calldata title, uint8 category, string calldata noteURI)
  external payable returns (uint256 ticketId);

// operator resolve
function resolveTicket(uint256 ticketId, string calldata resultURI) external;

// pembuat tiket cancel (jika policy allow + status open)
function cancelTicket(uint256 ticketId) external;

// views
function getTicket(uint256 ticketId) external view returns (...);
function ticketCountOf(address agent) external view returns (uint256);
```

Cek Agent ID:
```solidity
IERC721(AGENT_ID_REGISTRY).balanceOf(user) > 0
// AGENT_ID_REGISTRY = 0x60b9262456de011f7d15a54cdd8c48baaa8b022f
```

Fee BNB masuk treasury address yang di-set sekali di constructor (immutable lebih aman), atau `payable` owner withdraw hanya untuk saldo fee (bukan dana user tersimpan lama). Usulan: fee langsung diteruskan ke `treasury` di `openTicket` (pull-free), supaya tidak ada "tarik dana user" yang mengambang.

### Event yang dihitung sebagai interaksi (>=30)

Minimal satu panggilan state-changing dari alamat yang `balanceOf(registry) > 0`:
- `TicketOpened(ticketId, agent, fee, category)`  ← metrik utama
- `TicketResolved(...)` / `TicketCancelled(...)` (bonus, bukan syarat)

Ambang juri: unique address Agent ID yang berinteraksi dengan kontrak submit selama periode. Kita hitung unique `agent` di `TicketOpened`.

### Owner permissions (wajib diungkap di README)

Usulan minimal (rekomendasi):
- `pause()` / `unpause()` saja (emergency stop openTicket).
- Tidak ada mint token, tidak ada pajak dinamis, tidak ada freeze user, tidak ada ubah registry address setelah deploy (immutable).
- `treasury` immutable di constructor.
- Operator resolve: role terpisah `operator` yang bisa diganti oleh owner, atau fixed di constructor. Prefer fixed / 1-step set sekali.

Alternatif lebih keras: no owner sama sekali setelah deploy (no pause). Tradeoff: tidak bisa stop jika bug fee.

### Gas perkiraan

Belum diukur di mesin lokal. Tulis di README setelah uji: "uji di BSC testnet dulu". Jangan isi angka palsu. Setelah testnet: catat gas deploy + 1x `openTicket` di bukti refs.

Stack kontrak: Solidity 0.8.x, Foundry untuk test + script verify BscScan. Source verified + open source wajib.

## 5. Frontend / produk live

### Halaman

1. `/` Landing: pitch 1 kalimat, CTA connect, penjelasan Agent ID wajib, link docs/repo.
2. `/desk` Form buka tiket + saldo Agent ID status.
3. `/tickets` Daftar tiket milik address yang connect (dari event/indexer ringan atau `ticketCountOf` + enumerate).
4. `/ticket/:id` Detail + receipt + status.
5. `/faq` Syarat Agent ID, cara claim resmi (link app Binance), peringatan: selalu konfirmasi tx sendiri.

### Stack usulan

- Static site (HTML/JS atau Vite ringan) + `viem` atau `ethers` v6.
- Host: Cloudflare Pages (pola yang sudah dipakai tim) atau Pages sejenis.
- Tidak ada backend yang pegang kunci. Opsional: Cloudflare Worker read-only untuk cache event (bukan wajib MVP).
- Tidak ada pairing Agentic Wallet via QR di situs kita. Connect = EIP-1193 provider dari ekstensi/app user.

### Sebelum / sesudah bayar

- Sebelum: status Agent ID (punya / tidak), fee, gas estimasi dari wallet, tombol disabled jika tidak punya Agent ID.
- Sesudah: ticketId, link BscScan tx, status open, salinan receipt (address + fee + waktu).

## 6. Cara dapat >=30 user Agent ID asli (bukan sybil)

Metrik on-chain: unique `msg.sender` pada `TicketOpened` di mana `balanceOf(registry, sender) > 0` pada saat tx (enforce di kontrak). Skrip hitung dari log event, bukan dari UI analytics.

### Saluran (2-3 konkret)

1. Soft launch awal ke lingkaran yang sudah pegang Agent ID (teman builder dan holder yang sudah dikenal). Target minggu 1: 10 unique.
2. Ajakan bertarget di komunitas Agent ID / BNB builder yang sudah aktif. Soft CTA: coba buka tiket fee kecil, dapat receipt.
3. Demo publik + README jelas: "butuh Agent ID, fee kecil, 1 klik openTicket". Semakin rendah friksi, semakin mudah orang coba sekali.

### Dilarang

- Multi-akun palsu / bot massal tanpa Agent ID sah.
- Volume farming (spam openTicket dari wallet sybil).
- Janji yield / bayar orang hanya supaya klik.

### Cadangan jika lambat di hari ke-10 (~30 Nov)

- Turunkan minFee mendekati dust yang masih masuk akal.
- Tambah kategori "demo ping" (tetap lewat `openTicket`, tetap Agent ID gate) supaya orang coba 1 tx tanpa butuh layanan nyata.
- Jangan longgarkan gate Agent ID. Lebih baik kurang user daripada diskualifikasi sybil.

## 7. Pembagian kerja singkat

| Area | Kerja |
|---|---|
| Kontrak | Spec ini, kontrak Foundry, test, deploy testnet lalu mainnet setelah tes hijau, verify BscScan, wiring frontend ke kontrak, skrip hitung unique Agent ID |
| UI | UI/landing OpenDesk, brand netral (bukan Binance/BNB), state loading/empty/error, mobile 375px |
| Dokumen | README, teks submit form, deskripsi pemakaian Agent ID, owner permission disclosure |
| QA | Live URL, verify BscScan, cek gate Agent ID, cek tidak ada bypass konfirmasi, cek klaim di materi |
| Koordinasi | Rubrik/ledger, jaga jadwal submit, pantau hitungan 30 interaksi |

- UI dan dokumen bisa jalan paralel dengan skeleton Foundry + test `hasAgentId` di testnet.
- Deploy mainnet mengikuti tes hijau.

## 8. Cut list (sengaja tidak dikerjakan di MVP)

- Escrow bounty / worker claim marketplace (itu Ide 2, cadangan).
- Token sendiri, poin, leaderboard gamifikasi.
- Chat on-chain / messaging.
- Auto-match operator AI yang sign tx tanpa user.
- Mobile app native.
- Indexer berat / subgraph (cukup event + RPC untuk MVP).
- Multi-chain.
- Video demo wajib (opsional belakangan jika sisa waktu; tidak disebut wajib di pengumuman).
- Community Promotion Award sebagai target utama.

## 9. Risiko + mitigasi

| Risiko | Mitigasi |
|---|---|
| Form submit Binance kena WAF / susah dibuka | Simpan mirror field dari BinanceHub; coba submit lebih awal (jangan mepet 9 Des); siapkan materi offline siap tempel |
| Gagal kejar 30 unique Agent ID | Soft launch minggu 1, fee rendah, demo ping, pantau skrip harian; cadangan hari ke-10 di bagian 6 |
| Payout / akun Binance (KYC pemenang, negara) | Konfirmasi akun aktif sebelum submit; alamat penerima hadiah diisi saat submit |
| Garis merah keamanan (pairing QR, bypass konfirmasi, unlimited approve, tiru merek) | Tidak ada QR pairing di situs; setiap tx konfirmasi user; tidak minta approve ERC20 unlimited (bayar native BNB); nama OpenDesk netral; QA cek sebelum publik |
| Kompetitor bounty-board ramai | Tetap di Ide 1 (gerbang layanan), jangan geser ke klon escrow kecuali Ide 1 macet + diferensiasi jelas |
| Bug kontrak / fee stuck | Fee forward ke treasury di openTicket; pause emergency; audit singkat + test Foundry sebelum mainnet |
