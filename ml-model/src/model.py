import tensorflow as tf
from tensorflow.keras import layers, models

def build_cnn_model(input_shape=(224, 224, 3), num_classes=38):
    """
    Builds a Convolutional Neural Network (CNN) for Plant Disease Detection.
    Args:
        input_shape: Shape of the input images.
        num_classes: Number of disease categories (e.g., 38 for standard PlantVillage).
    Returns:
        Compiled Keras Model.
    """
    model = models.Sequential([
        # Data Augmentation layer is usually put outside or here. We assume pre-augmentation for flexibility.
        
        # Block 1
        layers.Conv2D(32, (3, 3), activation='relu', input_shape=input_shape),
        layers.MaxPooling2D(2, 2),
        
        # Block 2
        layers.Conv2D(64, (3, 3), activation='relu'),
        layers.MaxPooling2D(2, 2),
        
        # Block 3
        layers.Conv2D(128, (3, 3), activation='relu'),
        layers.MaxPooling2D(2, 2),
        
        # Block 4
        layers.Conv2D(128, (3, 3), activation='relu'),
        layers.MaxPooling2D(2, 2),
        
        # Classification Head
        layers.Flatten(),
        layers.Dropout(0.5),
        layers.Dense(512, activation='relu'),
        layers.Dense(num_classes, activation='softmax')
    ])
    
    model.compile(
        optimizer='adam',
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    
    return model

if __name__ == "__main__":
    model = build_cnn_model()
    model.summary()
