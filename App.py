from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from functools import wraps
import json

app = Flask(__name__)
app.secret_key = 'your-secret-key'  # Replace with a secure key in production

# Demo user credentials (in production, use a database with hashed passwords)
DEMO_USER = {'username': 'demo', 'password': 'password123'}

# Authentication decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        if username == DEMO_USER['username'] and password == DEMO_USER['password']:
            session['user'] = username
            return redirect(url_for('dashboard'))
        return render_template('login.html', error='Invalid credentials')
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect(url_for('login'))

@app.route('/')
@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html')

@app.route('/transactions')
@login_required
def transactions():
    return render_template('transactions.html')

@app.route('/send')
@login_required
def send():
    return render_template('send.html')

@app.route('/smart')
@login_required
def smart():
    return render_template('smart.html')

@app.route('/portfolio')
@login_required
def portfolio():
    return render_template('portfolio.html')

@app.route('/history')
@login_required
def history():
    return render_template('history.html')

@app.route('/settings')
@login_required
def settings():
    return render_template('settings.html')

# API endpoint for mock data (to replace inline state)
@app.route('/api/state')
@login_required
def get_state():
    state = {
        'balances': {'BTC': 8000000, 'USD_per_BTC': 56000},
        'rates': {
            'BTC': {'symbol': 'BTC', 'rate': 56000, 'change24h': 2.4},
            'ETH': {'symbol': 'ETH', 'rate': 3200, 'change24h': -1.2},
            'BNB': {'symbol': 'BNB', 'rate': 350, 'change24h': 0.3},
            'LTC': {'symbol': 'LTC', 'rate': 72, 'change24h': -0.9},
            'BCH': {'symbol': 'BCH', 'rate': 220, 'change24h': 0.1},
        },
        'watchlists': [],
        'holdings': [
            {'symbol': 'BTC', 'amount': 8000000},
            {'symbol': 'ETH', 'amount': 1200},
            {'symbol': 'BNB', 'amount': 5400}
        ],
        'txs': []  # Populated dynamically in JS
    }
    return jsonify(state)

if __name__ == '__main__':
    app.run(debug=True)
