import os
import datetime
import uuid
import json
import pandas as pd
import numpy as np
import base64
import requests
import random
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

CSV_FILE = 'menu_data.csv'
STATS_FILE = 'impact_stats.json'  # Permanent ledger for social impact
WEATHER_API_KEY = "da92ba39e070d8db6566c5f55b2ff087"

# --- 1. DATA LOADER & SAVER ---
def load_menu():
    base_path = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(base_path, CSV_FILE)
    if not os.path.exists(file_path): 
        print("CSV NOT FOUND")
        return []
    try:
        df = pd.read_csv(file_path, on_bad_lines='skip')
        df = df.fillna('')
        df['mood_tag'] = df['mood_tag'].astype(str).str.strip()
        df['weather_tag'] = df['weather_tag'].astype(str).str.strip()
        df['age_group'] = df['age_group'].astype(str).str.strip()
        df['category'] = df['category'].astype(str).str.strip()
        if 'rating' not in df.columns:
            df['rating'] = 4.0
        else:
            df['rating'] = pd.to_numeric(df['rating'], errors='coerce').fillna(4.0)

        if 'is_available' not in df.columns:
            df['is_available'] = True
        else:
            df['is_available'] = df['is_available'].astype(str).str.lower().isin(['true', '1', 'yes'])
        return df
    except Exception as e: 
        print(f"CSV LOAD ERROR: {e}")
        return []

def save_menu(df):
    base_path = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(base_path, CSV_FILE)
    df.to_csv(file_path, index=False)

def update_permanent_stats(charity_amt):
    """Saves charity data permanently even after 24h order cleanup."""
    stats = {"total_charity": 0, "total_orders": 0}
    if os.path.exists(STATS_FILE):
        with open(STATS_FILE, 'r') as f:
            try: stats = json.load(f)
            except: pass
    stats["total_charity"] += charity_amt
    stats["total_orders"] += 1
    with open(STATS_FILE, 'w') as f:
        json.dump(stats, f)

menu_df = load_menu()
orders_db = {} 

# --- 2. ORDER CLEANUP LOGIC (24 Hours) ---
@app.before_request
def cleanup_old_orders():
    now = datetime.datetime.now()
    tokens_to_remove = []
    for token, order in orders_db.items():
        try:
            if (now - datetime.datetime.fromisoformat(order['timestamp'])).total_seconds() > 86400:
                tokens_to_remove.append(token)
        except: continue
    for t in tokens_to_remove: 
        del orders_db[t]

# --- 3. UPDATED WEATHER HELPER ---
def get_real_weather_info():
    hour = datetime.datetime.now().hour
    is_evening = hour >= 17 or hour < 6
    try:
        if WEATHER_API_KEY != "PASTE_YOUR_KEY_HERE":
            url = f"http://api.weatherapi.com/v1/current.json?key={WEATHER_API_KEY}&q=auto:ip"
            response = requests.get(url, timeout=2).json()
            return response['current']['condition']['text'] 
    except: pass
    return "Evening Breeze" if is_evening else "Light Sunny"

# --- 4. AI RECOMMENDATION LOGIC (VARIETY SHUFFLE & AGRI-BOOST) ---
def ai_recommend(age, mood, weather, restrictions=None, hunger=None, category=None):
    global menu_df
    menu_df = load_menu() 
    if len(menu_df) == 0: return []
    df = menu_df.copy()
    
    req_type = restrictions.get('type', 'Both') if restrictions else 'Both'
    if req_type != 'Both':
        df = df[df['type'].str.lower() == req_type.lower()]

    if category and category != 'Any':
        df = df[df['category'].str.contains(category, case=False, na=False)]

    user_age = int(age)
    if user_age > 60:
        df = df[df['age_group'].isin(['Senior', 'All'])]
    elif user_age < 13:
        df = df[df['age_group'].isin(['Child', 'All'])]
    
    if df.empty: return []

    df['score'] = 0.0
    target_group = 'Senior' if user_age > 60 else 'Child' if user_age < 13 else 'Adult'
    df.loc[df['age_group'] == target_group, 'score'] += 15
    df.loc[df['mood_tag'].str.contains(mood, case=False, na=False), 'score'] += 12
    df.loc[df['weather_tag'].str.contains(weather, case=False, na=False), 'score'] += 8
    
    # NEW: Agri-Connect Social Boost (+2 points for local sourcing)
    df.loc[df['description'].str.contains("Locally Sourced", case=False, na=False), 'score'] += 2
    
    if hunger:
        df['calories_num'] = pd.to_numeric(df['calories'], errors='coerce').fillna(300)
        if hunger == 'Light':
            df.loc[df['calories_num'] < 300, 'score'] += 10
        elif hunger in ['Heavy', 'Starving']:
            df.loc[df['calories_num'] > 500, 'score'] += 10

    df['score'] += df['rating']

    # Keep unavailable items in the pool, but with very low chance.
    # If at least a few available options exist, recommendation naturally favors them.
    if 'is_available' in df.columns:
        df.loc[~df['is_available'], 'score'] -= 40

    # VARIETY FIX: Pick top 12 matches, then sample 6 to avoid repetition
    top_pool = df.sort_values(by=['score', 'rating'], ascending=False).head(12)
    return top_pool.sample(n=min(len(top_pool), 6)).to_dict(orient='records')

# --- 5. ROUTES ---

@app.route('/api/menu', methods=['GET'])
def get_menu():
    global menu_df
    menu_df = load_menu()
    if isinstance(menu_df, list): return jsonify([])
    return jsonify(menu_df.to_dict(orient='records'))

@app.route('/api/ai/manual', methods=['POST'])
def manual_recommend():
    data = request.json
    weather_desc = get_real_weather_info() 
    recs = ai_recommend(data.get('age', 25), data.get('mood', 'Neutral'), weather_desc,
        restrictions={'type': data.get('preference', 'Both')},
        hunger=data.get('hunger'), category=data.get('category'))
    return jsonify(recs)

@app.route('/api/ai/analyze', methods=['POST'])
def analyze_face():
    try:
        import cv2
        from deepface import DeepFace
        data = request.json
        img_data = data['image'].split(',')[1]
        nparr = np.frombuffer(base64.b64decode(img_data), np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # 1. PRE-PROCESSING: Convert to Grayscale to remove lighting noise
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # 2. STANDARDIZE: Resize for consistent AI landmark detection
        frame_ready = cv2.resize(gray, (640, 480))
        
        # 3. RE-COLOR: Convert back to 3-channel for library compatibility
        frame_final = cv2.cvtColor(frame_ready, cv2.COLOR_GRAY2RGB)
        
        # 4. ROBUST ANALYSIS: Set enforce_detection to False
        # This prevents the "Face Not Recognized" crash if you are tilted
        analysis = DeepFace.analyze(
            frame_final, 
            actions=['emotion'], 
            enforce_detection=False, 
            detector_backend='opencv' # More reliable for webcams than standard VGG
        )
        
        result = analysis[0] if isinstance(analysis, list) else analysis
        
        # Expert Mood Smoothing Logic
        detected_mood = result['dominant_emotion']
        if result['emotion']['happy'] > 90 and result['emotion']['neutral'] > 1:
            detected_mood = 'neutral'

        weather_desc = get_real_weather_info()
        return jsonify({
            "status": "success",
            "detected": { 
                "mood": detected_mood, 
                "age": data.get('age', 25), 
                "weather_desc": weather_desc 
            },
            "recommendations": ai_recommend(data.get('age', 25), detected_mood, weather_desc)
        })
    except Exception as e:
        # Detailed terminal logging for debugging
        print(f"AI SYSTEM LOG: {str(e)}") 
        return jsonify({"status": "error", "message": "AI face analysis unavailable on this deployment.", "recommendations": []})

@app.route('/api/order/place', methods=['POST'])
def place_order():
    data = request.json
    token = str(uuid.uuid4().int)[:6]
    requested_items = data.get('items', [])

    # Prevent accidental ordering of unavailable items.
    unavailable_names = set()
    if not isinstance(menu_df, list) and not menu_df.empty and 'is_available' in menu_df.columns:
        unavailable_names = set(menu_df[~menu_df['is_available']]['name'].astype(str).tolist())

    if any(item.get('name') in unavailable_names for item in requested_items):
        return jsonify({"success": False, "error": "One or more selected items are currently unavailable."}), 400
    
    # CHARITY CALCULATION: Tracks impact for permanent ledger
    charity_total = sum(5 for item in requested_items if "Social Impact" in item.get('description', ''))
    update_permanent_stats(charity_total)
    
    orders_db[token] = { 
        "token": token, "table": data.get('table'), "items": requested_items,
        "charity_earned": charity_total, "status": "Accepted", "timestamp": datetime.datetime.now().isoformat()
    }
    return jsonify({"success": True, "token": token, "charity_earned": charity_total})

@app.route('/api/admin/stats', methods=['GET'])
def get_admin_stats():
    """Permanent endpoint for Dashboard analytics."""
    if os.path.exists(STATS_FILE):
        with open(STATS_FILE, 'r') as f: return jsonify(json.load(f))
    return jsonify({"total_charity": 0, "total_orders": 0})


@app.route('/api/impact/recent', methods=['GET'])
def get_recent_impact_stats():
    """Recent social-impact snapshot to nudge customers toward charity choices."""
    recent_orders = sorted(orders_db.values(), key=lambda o: o.get('timestamp', ''), reverse=True)[:5]
    charity_orders = [o for o in recent_orders if o.get('charity_earned', 0) > 0]
    charity_amount = int(sum(o.get('charity_earned', 0) for o in charity_orders))

    return jsonify({
        "recent_window": 5,
        "recent_orders_count": len(recent_orders),
        "charity_orders_count": len(charity_orders),
        "recent_charity_amount": charity_amount,
        "recent_social_impact_count": int(charity_amount // 20)
    })

@app.route('/api/order/status/<token>', methods=['GET'])
def get_order_status(token):
    if token in orders_db:
        return jsonify({"found": True, "status": orders_db[token]['status'], "details": orders_db[token]})
    return jsonify({"found": False}), 404

@app.route('/api/order/rate', methods=['POST'])
def rate_order():
    global menu_df
    data = request.json
    token, rating = data.get('token'), data.get('rating')
    if token in orders_db and rating:
        items = [i['name'] for i in orders_db[token]['items']]
        for name in items:
            if name in menu_df['name'].values:
                old_r = menu_df.loc[menu_df['name'] == name, 'rating'].values[0]
                menu_df.loc[menu_df['name'] == name, 'rating'] = round((old_r + float(rating)) / 2, 1)
        save_menu(menu_df)
        return jsonify({"success": True})
    return jsonify({"success": False}), 400

@app.route('/api/admin/orders', methods=['GET'])
def get_orders(): return jsonify(orders_db)

@app.route('/api/admin/update', methods=['POST'])
def update_status():
    data = request.json
    if data['token'] in orders_db:
        orders_db[data['token']]['status'] = data['status']
        return jsonify({"success": True})
    return jsonify({"error": "Order not found"}), 404

@app.route('/api/admin/menu/add', methods=['POST'])
def add_item():
    global menu_df
    data = request.json
    new_row = {
        'id': len(menu_df) + 101, 'name': data['name'], 'price': data['price'],
        'category': data['category'], 'type': data['type'], 'calories': data.get('calories', 200),
        'description': data.get('description', ''), 'image_file': 'placeholder.jpg',
        'mood_tag': data.get('mood_tag', 'Happy'), 'weather_tag': data.get('weather_tag', 'Sunny'),
        'age_group': data.get('age_group', 'All'), 'rating': 4.0, 'is_available': True
    }
    menu_df = pd.concat([menu_df, pd.DataFrame([new_row])], ignore_index=True)
    save_menu(menu_df)
    return jsonify({"success": True})

@app.route('/api/admin/menu/delete', methods=['POST'])
def delete_item():
    global menu_df
    menu_df = menu_df[menu_df['name'] != request.json.get('name')]
    save_menu(menu_df)
    return jsonify({"success": True})

@app.route('/api/admin/menu/availability', methods=['POST'])
def update_item_availability():
    global menu_df
    data = request.json
    name = data.get('name')
    is_available = data.get('is_available')

    if name is None or is_available is None:
        return jsonify({"success": False, "error": "name and is_available are required"}), 400

    if name not in menu_df['name'].values:
        return jsonify({"success": False, "error": "Item not found"}), 404

    menu_df.loc[menu_df['name'] == name, 'is_available'] = bool(is_available)
    save_menu(menu_df)
    return jsonify({"success": True})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
