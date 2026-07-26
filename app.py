import http.server
import socketserver
import json
import base64
import os
import urllib.parse
from io import BytesIO
from PIL import Image
import numpy as np
import joblib

PORT = 8000
MODEL_PATH = 'gesture_model.joblib'

# Load the saved model at server startup
if os.path.exists(MODEL_PATH):
    print(f"Loading gesture model from {MODEL_PATH}...")
    model_data = joblib.load(MODEL_PATH)
    clf = model_data['model']
    categories = model_data['categories']
    label_names = model_data['label_names']
    img_size = model_data['img_size']
    print(f"Loaded {model_data['model_name']} model trained on {img_size} images at {model_data.get('saved_at', 'unknown time')}")
else:
    print(f"WARNING: Model file {MODEL_PATH} not found. Please run 'train.py' first.")
    clf = None
    categories = []
    label_names = {}
    img_size = (120, 120)

class GestureAPIHandler(http.server.SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle pre-flight requests for CORS if needed"""
        self.send_response(200, "ok")
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        # Parse path
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        if path == '/api/status':
            self.send_json_response({
                'status': 'active',
                'model_loaded': clf is not None,
                'model_name': model_data['model_name'] if clf else None,
                'categories': categories,
                'label_names': label_names
            })
        else:
            # Fall back to standard SimpleHTTPRequestHandler behavior to serve static files
            super().do_GET()

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        if path == '/api/predict':
            self.handle_predict()
        else:
            self.send_error_response(404, "Endpoint not found")

    def handle_predict(self):
        if clf is None:
            self.send_error_response(503, "Model not loaded. Please train the model first.")
            return

        try:
            # Read content length and load JSON data
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            request_json = json.loads(post_data.decode('utf-8'))

            if 'image' not in request_json:
                self.send_error_response(400, "Missing 'image' key in JSON request.")
                return

            # Extract base64 image data
            image_data_url = request_json['image']
            if ',' in image_data_url:
                header, base64_data = image_data_url.split(',', 1)
            else:
                base64_data = image_data_url

            # Decode image
            image_bytes = base64.b64decode(base64_data)
            img = Image.open(BytesIO(image_bytes))

            # Preprocess image
            img = img.convert('L') # Convert to grayscale
            img = img.resize(img_size, Image.Resampling.LANCZOS)
            
            # Normalize and flatten
            img_arr = np.array(img, dtype=np.float32) / 255.0
            features = img_arr.flatten().reshape(1, -1)

            # Predict class
            prediction_idx = int(clf.predict(features)[0])
            pred_category = categories[prediction_idx]
            pred_label = label_names[pred_category]

            # Get probabilities if supported
            probabilities = {}
            if hasattr(clf, "predict_proba"):
                try:
                    proba = clf.predict_proba(features)[0]
                    for idx, val in enumerate(proba):
                        cat_name = categories[idx]
                        lbl_name = label_names[cat_name]
                        probabilities[lbl_name] = float(val)
                except Exception as e:
                    print(f"Error calculating probabilities: {e}")

            # Send response
            response = {
                'prediction_index': prediction_idx,
                'category': pred_category,
                'label': pred_label,
                'confidence': probabilities.get(pred_label, 1.0),
                'probabilities': probabilities
            }
            self.send_json_response(response)

        except Exception as e:
            print(f"Error in prediction handler: {e}")
            self.send_error_response(500, f"Internal prediction error: {str(e)}")

    def send_json_response(self, data, status=200):
        response_bytes = json.dumps(data).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Length', len(response_bytes))
        self.end_headers()
        self.wfile.write(response_bytes)

    def send_error_response(self, status, message):
        self.send_json_response({'error': message}, status=status)

def run():
    # Set the working directory to the directory of this file to serve files correctly
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Enable socket reuse to avoid "Address already in use" errors during testing/restarts
    socketserver.TCPServer.allow_reuse_address = True
    
    with socketserver.TCPServer(("", PORT), GestureAPIHandler) as httpd:
        print("==================================================")
        print(f"Hand Gesture Recognition Server running on http://localhost:{PORT}")
        print("Press Ctrl+C to terminate.")
        print("==================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")

if __name__ == '__main__':
    run()
