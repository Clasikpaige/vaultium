/* Vaultium UI — SPA (Frontend Only) */

/* Utilities */
function fmt(n, opts = {}) {
    const { dec = 2, compact = false } = opts;
    if (compact) {
        if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
        if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
        if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
    }
    return Number(n).toLocaleString(undefined, { maximumFractionDigits: dec });
}

function shortHash(s, n = 10) {
    if (!s) return '';
    return s.slice(0, n) + '…' + s.slice(-6);
}

function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateMockTxs(count) {
    const types = ['send', 'receive', 'contract', 'swap'];
    const coins = ['BTC', 'ETH', 'BNB', 'LTC', 'BCH'];
    const out = [];
    for (let i = 0; i < count; i++) {
        const coin = coins[rand(0, coins.length - 1)];
        const amount = (Math.random() * 1000).toFixed(6);
        out.push({
            id: '0x' + Math.random().toString(36).slice(2) + Date.now().toString(36).slice(-4),
            time: Date.now() - rand(3600 * 1000, 86400 * 1000),
            type: types[rand(0, types.length - 1)],
            coin,
            amount: Number(amount),
            status: Math.random() > 0.14 ? (Math.random() > 0.6 ? 'confirmed' : 'pending') : 'failed',
            fee: (Math.random() * 0.01).toFixed(6),
            to: '0x' + Math.random().toString(36).slice(2, 16),
            from: '0x' + Math.random().toString(36).slice(2, 16),
            explorer: '#'
        });
    }
    return out.sort((a, b) => b.time - a.time);
}

/* State Management */
let state = { txs: [], trackers: {} };

async function fetchState() {
    const response = await fetch('/api/state');
    state = await response.json();
    state.txs = generateMockTxs(18); // Generate mock transactions client-side
    renderCurrentPage();
}

/* Renderers */
function renderDashboard() {
    const balanceBig = document.getElementById('balance-big');
    const balanceUsd = document.getElementById('balance-usd');
    if (balanceBig && balanceUsd) {
        balanceBig.textContent = fmt(state.balances.BTC, { dec: 6 }) + ' BTC';
        balanceUsd.textContent = '$' + fmt(state.balances.BTC * state.rates.BTC.rate, { dec: 2 });
    }
    renderRates(document.getElementById('rates-list'));
    renderDashTxs(document.getElementById('dash-txs'));
    renderPortfolioMini(document.getElementById('portfolio-mini'));

    document.getElementById('open-portfolio')?.addEventListener('click', () => navigate('/portfolio'));
    document.getElementById('open-smart')?.addEventListener('click', () => navigate('/smart'));
    document.getElementById('quick-send')?.addEventListener('click', () => navigate('/send'));

    startRatesSimulation();
}

function renderRates(root) {
    if (!root) return;
    root.innerHTML = '';
    for (const k in state.rates) {
        const r = state.rates[k];
        const el = document.createElement('div');
        el.className = 'rate-pill';
        el.innerHTML = `
            <div class="rate-top">
                <div style="font-weight:800">${r.symbol}</div>
                <div style="font-weight:800">$${fmt(r.rate, { dec: 2 })}</div>
            </div>
            <div class="small muted">${r.change24h >= 0 ? '▲' : '▼'} ${Math.abs(r.change24h).toFixed(2)}% • 24h</div>
        `;
        root.appendChild(el);
    }
}

let ratesInterval = null;
function startRatesSimulation() {
    if (ratesInterval) return;
    ratesInterval = setInterval(() => {
        for (const k in state.rates) {
            const drift = (Math.random() - 0.48) * (k === 'BTC' ? 120 : 6);
            state.rates[k].rate = Math.max(0.0001, state.rates[k].rate + drift);
            state.rates[k].change24h = (Math.random() * 4 - 2).toFixed(2);
        }
        const rl = document.getElementById('rates-list');
        if (rl) renderRates(rl);
        const balUsd = document.getElementById('balance-usd');
        if (balUsd) balUsd.textContent = '$' + fmt(state.balances.BTC * state.rates.BTC.rate, { dec: 2 });
    }, 2200);
}

function renderDashTxs(root) {
    if (!root) return;
    root.innerHTML = '';
    const txs = state.txs.slice(0, 5);
    txs.forEach(tx => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.alignItems = 'center';
        row.style.marginBottom = '8px';
        row.innerHTML = `
            <div>
                <div style="font-weight:700">${tx.type.toUpperCase()} • ${tx.coin}</div>
                <div class="muted small">${new Date(tx.time).toLocaleString()} • <span class="tx-hash">${shortHash(tx.id)}</span></div>
            </div>
            <div style="text-align:right">
                <div style="font-weight:800">${tx.amount}</div>
                <div class="muted small ${tx.status === 'confirmed' ? 'green' : tx.status === 'failed' ? 'red' : 'muted'}">${tx.status}</div>
            </div>
        `;
        row.addEventListener('click', () => openTxModal(tx));
        row.style.cursor = 'pointer';
        root.appendChild(row);
    });
}

function renderPortfolioMini(root) {
    if (!root) return;
    root.innerHTML = '';
    const assets = Object.values(state.rates).slice(0, 3);
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.gap = '8px';
    assets.forEach(a => {
        const c = document.createElement('div');
        c.style.flex = '1';
        c.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center">
                <div>
                    <div style="font-weight:700">${a.symbol}</div>
                    <div class="muted small">${fmt(Math.random() * 10)} ${a.symbol}</div>
                </div>
                <div style="text-align:right">
                    <div style="font-weight:700">$${fmt(a.rate * (Math.random() * 2 + 0.1), { dec: 2 })}</div>
                    <div class="muted small">${a.change24h}%</div>
                </div>
            </div>
        `;
        container.appendChild(c);
    });
    root.appendChild(container);
}

function renderTransactions() {
    function populate(filter = 'all') {
        const tbody = document.getElementById('tx-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        state.txs.filter(t => filter === 'all' || t.status === filter).forEach(tx => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="tx-hash">${shortHash(tx.id, 8)}</span></td>
                <td>${tx.type}</td>
                <td>${tx.coin}</td>
                <td>${tx.amount}</td>
                <td>${new Date(tx.time).toLocaleString()}</td>
                <td>${tx.status}</td>
            `;
            tr.addEventListener('click', () => openTxModal(tx));
            tr.style.cursor = 'pointer';
            tbody.appendChild(tr);
        });
    }

    const filter = document.getElementById('tx-filter');
    if (filter) {
        populate();
        filter.addEventListener('change', (e) => populate(e.target.value));
    }

    const exportBtn = document.getElementById('btn-export');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const csv = ['id,type,coin,amount,time,status', ...state.txs.map(t => `${t.id},${t.type},${t.coin},${t.amount},${new Date(t.time).toISOString()},${t.status}`)].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'vaultium-txs.csv';
            a.click();
            URL.revokeObjectURL(url);
        });
    }
}

function renderSend() {
    const previewBtn = document.getElementById('send-preview');
    if (previewBtn) {
        previewBtn.addEventListener('click', () => {
            const to = document.getElementById('send-to').value.trim();
            const amt = parseFloat(document.getElementById('send-amount').value) || 0;
            const asset = document.getElementById('send-asset').value;
            const note = document.getElementById('send-note').value;
            const box = document.getElementById('send-preview-box');
            if (!to || amt <= 0) {
                box.innerHTML = '<div class="red">Invalid recipient or amount.</div>';
                return;
            }
            const fee = (amt * 0.001).toFixed(6);
            box.innerHTML = `
                <div style="font-weight:800">${amt} ${asset}</div>
                <div class="muted small">To: <span class="tx-hash">${shortHash(to)}</span></div>
                <div class="muted small">Estimated fee: ${fee} ${asset}</div>
                <div style="margin-top:12px;display:flex;gap:8px">
                    <button class="btn btn-primary" id="confirm-send">Confirm</button>
                    <button class="btn btn-ghost" id="edit-send">Edit</button>
                </div>
            `;
            document.getElementById('confirm-send').addEventListener('click', () => {
                const tx = {
                    id: '0x' + Math.random().toString(36).slice(2) + Date.now().toString(36).slice(-4),
                    time: Date.now(),
                    type: 'send',
                    coin: asset,
                    amount: amt.toFixed(6),
                    status: 'pending',
                    fee
                };
                state.txs.unshift(tx);
                alert('Transaction queued (simulated). It will appear in Transactions.');
                navigate('/transactions');
            });
            document.getElementById('edit-send')?.addEventListener('click', () => {});
        });
    }
    document.getElementById('send-cancel')?.addEventListener('click', () => {
        document.getElementById('send-to').value = '';
        document.getElementById('send-amount').value = '';
        document.getElementById('send-note').value = '';
    });
}

function renderSmart() {
    renderContractsList();
    document.getElementById('btn-add-contract')?.addEventListener('click', () => {
        const modal = createModal(`
            <h3>Add Contract</h3>
            <div class="muted small">Add a token or contract address to watch (UI-only).</div>
            <div style="height:12px"></div>
            <input id="contract-address" placeholder="0x..." />
            <div style="height:8px"></div>
            <input id="contract-label" placeholder="Label (e.g. USDT-BSC)" />
            <div style="height:12px"></div>
            <div style="display:flex;gap:8px;justify-content:flex-end">
                <button class="btn btn-ghost" id="cancel-add">Cancel</button>
                <button class="btn btn-primary" id="confirm-add">Add</button>
            </div>
        `);
        modal.querySelector('#cancel-add').addEventListener('click', () => closeModal());
        modal.querySelector('#confirm-add').addEventListener('click', () => {
            const addr = modal.querySelector('#contract-address').value.trim();
            const label = modal.querySelector('#contract-label').value.trim() || addr.slice(0, 8);
            if (!addr) {
                alert('Enter address');
                return;
            }
            state.watchlists.push({ address: addr, label, chain: 'EVM', added: Date.now() });
            closeModal();
            renderContractsList();
        });
    });
}

function renderContractsList() {
    const root = document.getElementById('contracts-list');
    if (!root) return;
    root.innerHTML = '';
    if (state.watchlists.length === 0) {
        root.innerHTML = '<div class="muted">No contracts watched. Add one to start tracking token balances & events.</div>';
        return;
    }
    state.watchlists.forEach(c => {
        const el = document.createElement('div');
        el.className = 'card';
        el.style.marginBottom = '10px';
        el.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center">
                <div>
                    <div style="font-weight:800">${c.label}</div>
                    <div class="muted small">${c.address}</div>
                </div>
                <div style="display:flex;gap:8px">
                    <button class="btn btn-ghost" data-addr="${c.address}" onclick="viewContract(this)">View</button>
                    <button class="btn" style="background:transparent;border:0;color:var(--danger)" onclick="removeContract('${c.address}')">Remove</button>
                </div>
            </div>
        `;
        root.appendChild(el);
    });
}

window.viewContract = function(btn) {
    const addr = btn.dataset.addr;
    const entry = state.watchlists.find(w => w.address === addr);
    createModal(`
        <h3>${entry.label}</h3>
        <div class="muted small">${entry.address}</div>
        <div style="height:12px"></div>
        <div class="muted small">Token balance (simulated):</div>
        <div style="font-weight:800">${fmt(Math.random() * 10000, { dec: 4 })}</div>
        <div style="height:12px"></div>
        <div class="muted small">Recent events (simulated)</div>
        <div style="margin-top:8px">${Array.from({ length: 3 }).map(() => 'Transfer • ' + fmt(Math.random() * 100, { dec: 2 }) + ' tokens').join('<br>')}</div>
    `);
};

window.removeContract = function(addr) {
    if (!confirm('Remove watched contract?')) return;
    state.watchlists = state.watchlists.filter(w => w.address !== addr);
    renderContractsList();
};

function renderPortfolio() {
    renderPortfolioGrid();
    document.getElementById('add-asset')?.addEventListener('click', () => {
        const modal = createModal(`
            <h3>Add Asset</h3>
            <input id="asset-symbol" placeholder="Symbol (BTC,ETH...)" />
            <div style="height:8px"></div>
            <input id="asset-amt" placeholder="Amount" />
            <div style="height:12px"></div>
            <div style="display:flex;justify-content:flex-end;gap:8px">
                <button class="btn btn-ghost" id="cancel-add-asset">Cancel</button>
                <button class="btn btn-primary" id="confirm-add-asset">Add</button>
            </div>
        `);
        modal.querySelector('#cancel-add-asset').addEventListener('click', () => closeModal());
        modal.querySelector('#confirm-add-asset').addEventListener('click', () => {
            const s = modal.querySelector('#asset-symbol').value.trim().toUpperCase();
            const a = parseFloat(modal.querySelector('#asset-amt').value) || 0;
            if (!s || a <= 0) {
                alert('Invalid');
                return;
            }
            state.holdings.push({ symbol: s, amount: a });
            closeModal();
            renderPortfolioGrid();
        });
    });
    drawTinyChart('port-chart');
    const total = document.getElementById('portfolio-total');
    if (total) {
        total.textContent = '$' + fmt(state.balances.BTC * state.rates.BTC.rate, { dec: 2 });
    }
}

function renderPortfolioGrid() {
    const root = document.getElementById('portfolio-grid');
    if (!root) return;
    root.innerHTML = '';
    const holdings = state.holdings || [];
    holdings.forEach(h => {
        const rateObj = state.rates[h.symbol] || { rate: Math.random() * 1000 };
        const el = document.createElement('div');
        el.className = 'asset-card';
        el.draggable = true;
        el.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center">
                <div>
                    <div style="font-weight:800">${h.symbol}</div>
                    <div class="muted small">${fmt(h.amount)} ${h.symbol}</div>
                </div>
                <div style="text-align:right">
                    <div style="font-weight:800">$${fmt(h.amount * rateObj.rate, { dec: 2 })}</div>
                    <div class="muted small">${rateObj.change24h || (Math.random() * 3 - 1).toFixed(2)}%</div>
                </div>
            </div>
        `;
        root.appendChild(el);
        el.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', h.symbol);
        });
    });
    root.addEventListener('dragover', e => e.preventDefault());
    root.addEventListener('drop', e => {
        const sym = e.dataTransfer.getData('text/plain');
        const idx = state.holdings.findIndex(x => x.symbol === sym);
        if (idx >= 0) {
            const [item] = state.holdings.splice(idx, 1);
            state.holdings.unshift(item);
            renderPortfolioGrid();
        }
    });
}

function renderHistory() {
    const list = document.getElementById('history-list');
    if (!list) return;
    list.innerHTML = state.txs.map(tx => `
        <div style="padding:10px;border-bottom:1px dashed var(--glass-border);display:flex;justify-content:space-between">
            <div>
                <div style="font-weight:700">${tx.type} • ${tx.coin} • ${fmt(tx.amount)}</div>
                <div class="muted small">${new Date(tx.time).toLocaleString()}</div>
            </div>
            <div style="text-align:right">
                <div class="${tx.status === 'confirmed' ? 'green' : tx.status === 'failed' ? 'red' : 'muted'}">${tx.status}</div>
                <div class="muted small">${tx.fee ? (tx.fee + ' fee') : ''}</div>
            </div>
        </div>
    `).join('');
}

function renderSettings() {
    document.getElementById('save-int')?.addEventListener('click', () => alert('Saved (demo)'));
    document.getElementById('theme-toggle')?.addEventListener('click', () => alert('Theme toggle (demo)'));
}

function openTxModal(tx) {
    const modal = createModal(`
        <h3>Transaction</h3>
        <div class="muted small">${tx.coin} • ${tx.type}</div>
        <div style="height:8px"></div>
        <div style="display:flex;justify-content:space-between">
            <div>
                <div style="font-weight:800">${tx.amount} ${tx.coin}</div>
                <div class="muted small">From: <span class="tx-hash">${shortHash(tx.from)}</span></div>
                <div class="muted small">To: <span class="tx-hash">${shortHash(tx.to)}</span></div>
            </div>
            <div style="text-align:right">
                <div class="${tx.status === 'confirmed' ? 'green' : tx.status === 'failed' ? 'red' : 'muted'}" style="font-weight:800">${tx.status}</div>
                <div class="muted small">${new Date(tx.time).toLocaleString()}</div>
            </div>
        </div>
        <div style="height:12px"></div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
            <button class="btn btn-ghost" id="view-explorer">Open Explorer</button>
            <button class="btn btn-primary" id="track-tx">${tx.status === 'pending' ? 'Track' : 'View'}</button>
        </div>
    `);
    modal.querySelector('#view-explorer').addEventListener('click', () => {
        window.open(tx.explorer || '#', '_blank');
    });
    modal.querySelector('#track-tx').addEventListener('click', () => {
        startTxTracker(tx);
        closeModal();
        navigate('/transactions');
    });
}

function startTxTracker(tx) {
    if (state.trackers[tx.id]) return;
    state.trackers[tx.id] = { status: tx.status, progress: 0 };
    const id = setInterval(() => {
        const t = state.trackers[tx.id];
        t.progress += Math.random() * 30;
        if (t.progress >= 100) {
            t.status = 'confirmed';
            clearInterval(id);
            const idx = state.txs.findIndex(x => x.id === tx.id);
            if (idx >= 0) state.txs[idx].status = 'confirmed';
            delete state.trackers[tx.id];
            alert('Transaction confirmed (simulated): ' + shortHash(tx.id, 10));
        } else {
            console.log('Tracking', tx.id, Math.round(t.progress) + '%');
        }
    }, 1500);
}

function createModal(innerHtml) {
    const wrap = document.createElement('div');
    wrap.className = 'modal';
    wrap.innerHTML = `<div class="card">${innerHtml}</div>`;
    document.body.appendChild(wrap);
    wrap.addEventListener('click', (e) => {
        if (e.target === wrap) closeModal();
    });
    return wrap;
}

function closeModal() {
    const m = document.querySelector('.modal');
    if (m) m.remove();
}

function navigate(path) {
    window.location.href = path;
}

function drawTinyChart(id) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.clientWidth * devicePixelRatio;
    const h = canvas.height = canvas.clientHeight * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    const points = Array.from({ length: 60 }, (_, i) => Math.sin(i / 6) * 6 + 30 + Math.random() * 3);
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    const g = ctx.createLinearGradient(0, 0, 0, canvas.clientHeight);
    g.addColorStop(0, 'rgba(124,92,255,0.25)');
    g.addColorStop(1, 'rgba(110,231,183,0.02)');
    ctx.fillStyle = g;
    ctx.beginPath();
    const step = canvas.clientWidth / (points.length - 1);
    for (let i = 0; i < points.length; i++) {
        const x = i * step;
        const y = points[i];
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.lineTo(canvas.clientWidth, canvas.clientHeight);
    ctx.lineTo(0, canvas.clientHeight);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#7c5cff';
    for (let i = 0; i < points.length; i++) {
        const x = i * step;
        const y = points[i];
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
}

function renderCurrentPage() {
    const path = window.location.pathname;
    if (path === '/' || path === '/dashboard') renderDashboard();
    else if (path === '/transactions') renderTransactions();
    else if (path === '/send') renderSend();
    else if (path === '/smart') renderSmart();
    else if (path === '/portfolio') renderPortfolio();
    else if (path === '/history') renderHistory();
    else if (path === '/settings') renderSettings();
}

/* Initialization */
document.addEventListener('DOMContentLoaded', () => {
    fetchState();
    document.getElementById('q')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const q = e.target.value.trim().toLowerCase();
            if (!q) return;
            const tx = state.txs.find(t => t.id.toLowerCase().includes(q) || t.from.toLowerCase().includes(q) || t.to.toLowerCase().includes(q));
            if (tx) {
                openTxModal(tx);
                return;
            }
            alert('No match found in demo data (this is a UI-only demo).');
        }
    });
    document.getElementById('dev-toggle')?.addEventListener('click', () => {
        alert('Dev toggles (demo). You can wire this up to enable real API keys.');
    });
});
