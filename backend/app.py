import os
import datetime
import uuid
import pandas as pd
import numpy as np
import cv2
import base64
import requests  # Required for Weather API
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

CSV_FILE = 'menu_data.csv'
# Get your key from weatherapi.com
WEATHER_API_KEY = "da92ba39e070d8db6566c5f55b2ff087"

# --- 1. DATA LOADER & SAVER ---
def load_menu():
    base_path = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(base_path, CSV_FILE)
    if not os.path.exists(file_path): 
        print("CSV NOT FOUND")
        return []
    try:
        df = pd.read_csv(file_path)
        df = df.fillna('')
        # Standardize strings for matching
        df['mood_tag'] = df['mood_tag'].astype(str).str.strip()
        df['weather_tag'] = df['weather_tag'].astype(str).str.strip()
        df['age_group'] = df['age_group'].astype(str).str.strip()
        df['category'] = df['category'].astype(str).str.strip()
        
        # Ensure rating column exists
        if 'rating' not in df.columns:
            df['rating'] = 4.0
        else:
            df['rating'] = pd.to_numeric(df['rating'], errors='coerce').fillna(4.0)
            
        return df
    except Exception as e: 
        print(f"CSV LOAD ERROR: {e}")
        return []

def save_menu(df):
    base_path = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(base_path, CSV_FILE)
    df.to_csv(file_path, index=False)

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
    # Logic: 5 PM (17) to 6 AM (6) is Evening
    is_evening = hour >= 17 or hour < 6
    
    try:
        # If you have an API Key, use it, else fallback
        if WEATHER_API_KEY != "PASTE_YOUR_KEY_HERE":
            url = f"http://api.weatherapi.com/v1/current.json?key={WEATHER_API_KEY}&q=auto:ip"
            response = requests.get(url, timeout=2).json()
            condition = response['current']['condition']['text']
            return condition 
    except:
        pass
    
    return "Evening Breeze" if is_evening else "Light Sunny"

# --- 4. AI RECOMMENDATION LOGIC ---
def ai_recommend(age, mood, weather, restrictions=None, hunger=None, category=None):
    global menu_df
    menu_df = load_menu() 
    if len(menu_df) == 0: return []
    df = menu_df.copy()
    
    # A. STRICT FILTERS
    req_type = restrictions.get('type', 'Both') if restrictions else 'Both'
    if req_type != 'Both':
        df = df[df['type'].str.lower() == req_type.lower()]

    user_age = int(age)
    if user_age > 60:
        df = df[df['age_group'].isin(['Senior', 'All'])]
    elif user_age < 13:
        df = df[df['age_group'].isin(['Child', 'All'])]
    
    # B. WEIGHTED SCORING
    df['score'] = 0.0
    target_group = 'Senior' if user_age > 60 else 'Child' if user_age < 13 else 'Adult'
    
    df.loc[df['age_group'] == target_group, 'score'] += 15
    df.loc[df['mood_tag'].str.contains(mood, case=False, na=False), 'score'] += 10
    df.loc[df['weather_tag'].str.contains(weather, case=False, na=False), 'score'] += 10
    
    if category and category != 'Any':
        df.loc[df['category'].str.contains(category, case=False, na=False), 'score'] += 10

    if hunger:
        if hunger == 'Light':
            df.loc[pd.to_numeric(df['calories'], errors='coerce') < 300, 'score'] += 10
        elif hunger in ['Heavy', 'Starving']:
            df.loc[pd.to_numeric(df['calories'], errors='coerce') > 600, 'score'] += 10

    df['score'] += df['rating']

    return df.sort_values(by=['score', 'rating'], ascending=False).head(6).to_dict(orient='records')

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
    
    recs = ai_recommend(
        data.get('age', 25), 
        data.get('mood', 'Neutral'), 
        weather_desc,
        restrictions={'type': data.get('preference', 'Both')},
        hunger=data.get('hunger'),
        category=data.get('category')
    )
    return jsonify(recs)

@app.route('/api/ai/analyze', methods=['POST'])
def analyze_face():
    try:
        from deepface import DeepFace
        data = request.json
        img_data = data['image'].split(',')[1]
        nparr = np.frombuffer(base64.b64decode(img_data), np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        analysis = DeepFace.analyze(frame, actions=['emotion'], enforce_detection=False)
        result = analysis[0] if isinstance(analysis, list) else analysis
        weather_desc = get_real_weather_info()
        
        return jsonify({
            "status": "success",
            "detected": { 
                "mood": result['dominant_emotion'], 
                "age": data.get('age', 25), 
                "weather": weather_desc,
                "weather_desc": weather_desc 
            },
            "recommendations": ai_recommend(data.get('age', 25), result['dominant_emotion'], weather_desc)
        })
    except Exception as e:
        return jsonify({"status": "error", "recommendations": []})

@app.route('/api/order/place', methods=['POST'])
def place_order():
    data = request.json
    token = str(uuid.uuid4().int)[:6]
    orders_db[token] = { 
        "token": token, "table": data.get('table'), "items": data.get('items'), 
        "status": "Accepted", "timestamp": datetime.datetime.now().isoformat()
    }
    return jsonify({"success": True, "token": token})

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

# --- 6. ADMIN ROUTES ---
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
        'age_group': data.get('age_group', 'All'), 'rating': 4.0
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

if __name__ == '__main__':
    app.run(debug=True, port=5000)