import os
import tensorflow as tf
from tensorflow.keras.preprocessing import image_dataset_from_directory
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping

from model import build_cnn_model

# Hyperparameters
BATCH_SIZE = 32
IMG_SIZE = (224, 224)
EPOCHS = 20
DATASET_DIR = '../data/PlantVillage' # Assuming data is placed here
MODEL_SAVE_PATH = '../models/crop_disease_model.keras'

def get_datasets(data_dir):
    """
    Loads training and validation datasets.
    """
    if not os.path.exists(data_dir):
        raise FileNotFoundError(f"Dataset directory not found: {data_dir}. Please ensure PlantVillage data is extracted here.")

    # 80-20 Train/Val Split
    train_ds = image_dataset_from_directory(
        data_dir,
        validation_split=0.2,
        subset="training",
        seed=123,
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE
    )

    val_ds = image_dataset_from_directory(
        data_dir,
        validation_split=0.2,
        subset="validation",
        seed=123,
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE
    )

    # Cache and prefetch for performance
    AUTOTUNE = tf.data.AUTOTUNE
    train_ds = train_ds.cache().shuffle(1000).prefetch(buffer_size=AUTOTUNE)
    val_ds = val_ds.cache().prefetch(buffer_size=AUTOTUNE)

    return train_ds, val_ds

def train():
    try:
        train_ds, val_ds = get_datasets(DATASET_DIR)
        
        # We need to know num_classes for the model head.
        # image_dataset_from_directory infers classes from folder structure.
        # But for this skeleton, we'll assume 38 classes (standard PlantVillage).
        num_classes = 38 
        
        # Build model
        model = build_cnn_model(input_shape=(IMG_SIZE[0], IMG_SIZE[1], 3), num_classes=num_classes)
        
        # Callbacks
        callbacks = [
            ModelCheckpoint(filepath=MODEL_SAVE_PATH, save_best_only=True, monitor='val_accuracy'),
            EarlyStopping(monitor='val_loss', patience=3, restore_best_weights=True)
        ]
        
        # Train
        print("Starting training...")
        history = model.fit(
            train_ds,
            validation_data=val_ds,
            epochs=EPOCHS,
            callbacks=callbacks
        )
        print(f"Training complete. Best model saved to {MODEL_SAVE_PATH}")
        
    except FileNotFoundError as e:
        print(e)
        print("Note: In a real environment, you must download the PlantVillage dataset into 'ml-model/data/PlantVillage'.")

if __name__ == "__main__":
    train()
