import os
import json
import time
from src.dataset import get_train_test_splits
from src.model import train_and_evaluate_all, plot_confusion_matrix, save_model

def main():
    print("==================================================")
    # 1. Load dataset
    print("Loading and preprocessing dataset...")
    img_size = (120, 120)
    X_train, X_test, y_train, y_test, categories, label_names_dict = get_train_test_splits(
        data_dir='data',
        img_size=img_size,
        test_size=0.2,
        random_state=42
    )
    
    label_names = [label_names_dict[cat] for cat in categories]
    
    print(f"Dataset summary:")
    print(f"  Training samples: {X_train.shape[0]}")
    print(f"  Testing samples:  {X_test.shape[0]}")
    print(f"  Features per image: {X_train.shape[1]} ({img_size[0]}x{img_size[1]})")
    print(f"  Number of classes: {len(categories)}")
    print("Classes:", label_names)
    print("==================================================")
    
    # 2. Train and evaluate all models
    print("Starting classifier comparisons...")
    best_model, best_name, results, class_report, conf_mat = train_and_evaluate_all(
        X_train, X_test, y_train, y_test, label_names
    )
    print("==================================================")
    
    # 3. Plot confusion matrix
    print("Generating performance visualizations...")
    plot_confusion_matrix(conf_mat, label_names, output_path='confusion_matrix.png')
    
    # 4. Save model
    print("Saving the best classifier...")
    save_model(best_model, best_name, categories, label_names_dict, img_size, 'gesture_model.joblib')
    
    # 5. Save metrics JSON for the frontend dashboard
    metrics_data = {
        'best_model': best_name,
        'accuracy': results[best_name]['accuracy'],
        'train_time_sec': results[best_name]['train_time'],
        'inference_time_ms': results[best_name]['inference_time'] * 1000,
        'dataset_summary': {
            'train_size': int(X_train.shape[0]),
            'test_size': int(X_test.shape[0]),
            'num_classes': len(categories)
        },
        'models_comparison': {
            name: {
                'accuracy': float(info['accuracy']),
                'train_time_sec': float(info['train_time']),
                'inference_time_ms': float(info['inference_time'] * 1000)
            } for name, info in results.items()
        },
        'classification_report': class_report,
        'trained_at': time.strftime('%Y-%m-%d %H:%M:%S')
    }
    
    with open('metrics.json', 'w') as f:
        json.dump(metrics_data, f, indent=4)
    print("Metrics saved to metrics.json")
    print("==================================================")
    print("Training pipeline finished successfully!")

if __name__ == '__main__':
    main()
