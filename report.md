# Hand Gesture Recognition Project Report

### 1. Dataset Summary
Total Samples       : 560
Gesture Classes     : 7
Training Samples    : 448
Validation Samples  : 0
Testing Samples     : 112

---

### 2. Gesture Class Labels
1. Palm
2. Fist
3. Thumbs Up
4. Thumbs Down
5. Index Right
6. Index Left
7. No Gesture

---

### 3. Sample Gesture Visualization
- Image 1 (`01_palm_20.jpg`) → Palm
- Image 2 (`02_fist_0.jpg`) → Fist
- Image 3 (`03_thumbs-up_0.jpg`) → Thumbs Up
- Image 4 (`04_thumbs-down_0.jpg`) → Thumbs Down
- Image 5 (`05_index-right_0.jpg`) → Index Right
- Image 6 (`06_index-left_0.jpg`) → Index Left
- Image 7 (`07_no-gesture_0.jpg`) → No Gesture

---

### 4. Preprocessing Results
Original Image Size : 120 × 120
Processed Image Size: 120 × 120 (flattened to 14,400 features)
Normalization Applied: Yes (scaled pixels to `[0.0, 1.0]`)

---

### 5. Hand Landmark Detection (if applicable)
Detected Landmarks : Not Applicable
Note               : The model classifies raw pixels directly using Support Vector Machines (SVM). Landmark coordinate extraction is not required, minimizing runtime overhead.

---

### 6. Predicted Gesture Output
- Test Image 1 → Predicted Gesture: Palm
- Test Image 2 → Predicted Gesture: Fist
- Test Image 3 → Predicted Gesture: Thumbs Up

---

### 7. Prediction Confidence Score
Gesture     : Palm
Confidence  : 100.0%

---

### 8. Model Accuracy
Training Accuracy : 100.0%
Testing Accuracy  : 100.0%

---

### 9. Confusion Matrix

| Actual \ Predicted | Palm | Fist | Thumbs Up | Thumbs Down | Index Right | Index Left | No Gesture |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Palm** | 16 | 0 | 0 | 0 | 0 | 0 | 0 |
| **Fist** | 0 | 16 | 0 | 0 | 0 | 0 | 0 |
| **Thumbs Up** | 0 | 0 | 16 | 0 | 0 | 0 | 0 |
| **Thumbs Down** | 0 | 0 | 0 | 16 | 0 | 0 | 0 |
| **Index Right** | 0 | 0 | 0 | 0 | 16 | 0 | 0 |
| **Index Left** | 0 | 0 | 0 | 0 | 0 | 16 | 0 |
| **No Gesture** | 0 | 0 | 0 | 0 | 0 | 0 | 16 |

---

### 10. Classification Report

```
                 Precision  Recall  F1-score  Support
Palm                1.00      1.00     1.00        16
Fist                1.00      1.00     1.00        16
Thumbs Up           1.00      1.00     1.00        16
Thumbs Down         1.00      1.00     1.00        16
Index Right         1.00      1.00     1.00        16
Index Left          1.00      1.00     1.00        16
No Gesture          1.00      1.00     1.00        16

Overall Accuracy                               100.0%
```

---

### 11. Real-Time Detection Results
Detected Gesture : Palm
Action Triggered : Play/Pause Media

---

### 12. Gesture-to-Command Mapping

| Gesture | System Action |
| :--- | :--- |
| Palm | Play / Pause Video |
| Fist | Mute / Unmute Audio |
| Thumbs Up | Increase Volume / Like |
| Thumbs Down | Decrease Volume |
| Index Right | Next Slide |
| Index Left | Previous Slide |
| No Gesture | Idle (No Action) |

---

### 13. Processing Speed
Average Inference Time : 13.69 ms/frame
Frame Rate             : 73.1 FPS

---

### 14. Misclassified Gestures
Actual Gesture    : None
Predicted Gesture : None
Note              : The model classified 100% of the testing subset correctly.

---

### 15. Final Conclusion
The hand gesture recognition model achieved a testing accuracy of 100.0% and successfully recognized multiple gestures in real-time, demonstrating its suitability for gesture-based human-computer interaction and media control systems.
