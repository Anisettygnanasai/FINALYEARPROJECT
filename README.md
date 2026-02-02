Smart Dine Pro: Mood & Weather-Based AI Food Recommendation System
Smart Dine Pro is a futuristic, full-stack web application designed for the modern dining experience. It utilizes Artificial Intelligence and Real-time Environmental Data to suggest the perfect meal based on a user's facial expression (mood), current weather conditions, and age group.

🌟 Key Features
AI Mood Analysis: Leverages DeepFace to analyze real-time camera feeds and detect dominant user emotions (Happy, Sad, Angry, etc.).

Weather-Adaptive Menu: Integrates a real-time Weather API to provide contextual recommendations, such as "Evening Breeze" specials or "Light Sunny" snacks.

Intelligent Weighted Scoring: Uses a custom algorithm to rank food items based on:

Age Appropriateness: (+15 points) ensuring child or senior safety.

Mood/Weather Matching: (+10 points each).

User Ratings: Dynamic updates based on real customer feedback.

Futuristic Glassmorphism UI: A high-end, responsive interface featuring neon glows and translucent glass panels for a premium feel.

Admin Kitchen Dashboard: Real-time order management for kitchen staff.

🛠️ Tech Stack
Frontend: React.js, Vite, Lucide-React, CSS3 (Glassmorphism).

Backend: Flask (Python), Pandas, NumPy.

AI/ML: DeepFace (OpenCV base), TensorFlow.

Database: CSV-based dynamic data management.

🚀 Installation & Setup
Prerequisites
Python 3.8+

Node.js & npm

Backend Setup
Navigate to the backend folder.

Create and activate a virtual environment.

Install dependencies:

Bash
pip install -r requirements.txt
Run the Flask server:

Bash
python app.py
Frontend Setup
Navigate to the frontend folder.

Install the necessary node modules:

Bash
npm install
Launch the development server:

Bash
npm run dev
📊 Data Management
The system relies on a menu_data.csv file containing the following attributes for each item:

mood_tag, weather_tag, age_group, calories, and rating.
