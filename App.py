from flask import Flask, render_template, request, redirect, url_for, flash
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
import json

app = Flask(__name__)
app.secret_key = 'your-secret-key'  # Replace with a secure key in production

# Flask-Login setup
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# Mock user database (for demo purposes)
users = {
    'demo': {
        'username': 'demo',
        'password': generate_password_hash('password123')  # Demo credentials
    }
}

# User class for Flask-Login
class User(UserMixin):
    def __init__(self, username):
        self.id = username

@login_manager.user_loader
def load_user(username):
    if username in users:
        return User(username)
    return None

# Mock state (simulating a database)
state = {
    'balances': {'BTC': 8000000, 'USD_per_BTC': 56000},
    'watchlists': [],
    'txs': [],
    'rates': {
        'BTC': {'symbol': 'BTC', 'rate': 56000, 'change24h': 2.4},
        'ETH': {'symbol': 'ETH', 'rate': 3200, 'change24h': -1.2},
        'BNB': {'symbol': 'BNB', 'rate': 350, 'change24h': 0.3},
        'LTC': {'symbol': 'LTC', 'rate': 72, 'change24h': -0.9},
        'BCH': {'symbol': 'BCH', 'rate': 220, 'change24h': 0.1},
    },
    'trackers': {},
    'holdings': [{'symbol': 'BTC', 'amount': 8000000}, {'symbol': 'ETH', 'amount': 1200}, {'symbol': 'BNB', 'amount': 5400}]
}

# Routes
@app.route('/')
@login_required
def index():
    return render_template('index.html', state=json.dumps(state))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user_data = users.get(username)
        if user_data and check_password_hash(user_data['password'], password):
            user = User(username)
            login_user(user)
            flash('Logged in successfully.', 'success')
            return redirect(url_for('index'))
        flash('Invalid username or password.', 'error')
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('Logged out successfully.', 'success')
    return redirect(url_for('login'))

# API endpoints for dynamic data
@app.route('/api/state', methods=['GET'])
@login_required
def get_state():
    return json.dumps(state)

@app.route('/api/send', methods=['POST'])
@login_required
def send_transaction():
    data = request.json
    tx = {
        'id': '0x' + str(hash(data['to'] + str(data['amount'])))[-10:],
        'time': int(time.time() * 1000),
        'type': 'send',
        'coin': data['asset'],
        'amount': float(data['amount']),
        'status': 'pending',
        'fee': float(data['amount']) * 0.001,
        'to': data['to'],
        'from': '0x' + str(hash(current_user.id))[-10:],
        'explorer': '#'
    }
    state['txs'].insert(0, tx)
    return json.dumps({'status': 'success', 'tx': tx})

@app.route('/api/add_contract', methods=['POST'])
@login_required
def add_contract():
    data = request.json
    addr = data['address']
    label = data.get('label', addr[:8])
    if addr:
        state['watchlists'].append({'address': addr, 'label': label, 'chain': 'EVM', 'added': int(time.time() * 1000)})
        return json.dumps({'status': 'success'})
    return json.dumps({'status': 'error', 'message': 'Invalid address'})

@app.route('/api/remove_contract/<addr>', methods=['POST'])
@login_required
def remove_contract(addr):
    state['watchlists'] = [w for w in state['watchlists'] if w['address'] != addr]
    return json.dumps({'status': 'success'})

@app.route('/api/add_asset', methods=['POST'])
@login_required
def add_asset():
    data = request.json
    symbol = data['symbol'].upper()
    amount = float(data['amount'])
    if symbol and amount > 0:
        state['holdings'].append({'symbol': symbol, 'amount': amount})
        return json.dumps({'status': 'success'})
    return json.dumps({'status': 'error', 'message': 'Invalid asset or amount'})

if __name__ == '__main__':
    app.run(debug=True)
