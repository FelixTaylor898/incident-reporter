**Incident Tracker App**

This project is a simple Incident Tracking System with a Django backend and an Expo (React Native) frontend. It allows users to view, create, delete, and update incidents.

**How to Run the Django Backend**

1. Navigate into the backend folder:

`cd backend`

2. Create and activate a virtual environment:

`python -m venv venv`

`source venv/bin/activate   # Mac/Linux  `

`venv\Scripts\activate      # Windows`

3. Install dependencies:

`pip install -r requirements.txt`

4. Run database migrations:

`python manage.py migrate`

5. Start the Django server:

`python manage.py runserver 0.0.0.0:8000`

The backend should now be running at http://localhost:8000 (or http://<your LAN IP>:8000 for mobile devices).

**Running the Web View**

The Django project also includes a simple web interface for viewing and creating incidents. Once the server is running, open your browser and go to:
* Incidents page: http://localhost:8000/incidents/

If you are on a mobile device, replace localhost with your LAN IP (for example http://192.168.1.25:8000/incidents/).

**How to Run the Expo App**

1. Navigate into the Expo project folder:

`cd mobile`

2. Install dependencies:

`npm install`

3. Start the Expo development server:

`npx expo start`

4. Open the Expo Go app on your phone and scan the QR code to run the app.

**Setting the BACKEND_BASE_URL**

The frontend needs to know where your Django API is running. Open your app/index.tsx and update the BACKEND_BASE_URL constant to match your LAN IP address. For example:

`const BACKEND_BASE_URL = "http://x.x.x.x:8000";`

**CORS**

CORS is already configured in the Django backend using django-cors-headers. During development, all origins are allowed. For production, update CORS_ALLOWED_ORIGINS in settings.py to restrict access to specific domains.