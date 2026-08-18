import numpy as np
from sklearn.ensemble import RandomForestRegressor
from typing import List, Dict, Any

from ..config import DEFAULT_HBR_KM, DEFAULT_SIGMA_KM
from ..risk.analytic_pc import analytic_pc

class MLTriageModel:
    def __init__(self):
        self.model = RandomForestRegressor(n_estimators=100, max_depth=14, n_jobs=-1, random_state=42)
        self.is_trained = False
        
    def generate_synthetic_data(self, n_samples: int = 5000):
        """
        Generates synthetic training data by sweeping the feature space.
        Features: [miss_distance_km, sigma_km, hbr_km]
        Target: log10(Pc)
        """
        print(f"Generating {n_samples} synthetic samples for training...")
        
        X = np.zeros((n_samples, 3))
        # Skew towards closer misses to learn the critical boundary better
        X[:, 0] = np.random.exponential(scale=2.0, size=n_samples)
        X[:, 1] = np.random.uniform(0.5, 2.0, n_samples)
        X[:, 2] = np.random.uniform(0.001, 0.050, n_samples) # up to 50m HBR
        
        y = np.zeros(n_samples)
        
        for i in range(n_samples):
            miss_vector = np.array([X[i, 0], 0.0])
            pc = analytic_pc(miss_vector, X[i, 1], X[i, 2])
            # Clip Pc to avoid log(0)
            pc = max(pc, 1e-9)
            y[i] = np.log10(pc)
            
        return X, y
        
    def train(self, n_samples: int = 5000):
        X_train, y_train = self.generate_synthetic_data(n_samples)
        print("Training Random Forest surrogate model...")
        self.model.fit(X_train, y_train)
        self.is_trained = True
        print("Training complete.")
        
    def predict_pc(self, features: np.ndarray) -> np.ndarray:
        """
        Predicts Pc given an array of features (N x 3).
        """
        if not self.is_trained:
            raise ValueError("Model is not trained yet.")
            
        y_pred_log10 = self.model.predict(features)
        return 10 ** y_pred_log10

    def prescreen_events(self, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Adds a 'ml_prescreen_score' (predicted Pc) to each event.
        """
        if not self.is_trained:
            self.train()
            
        if not events:
            return []
            
        X = np.zeros((len(events), 3))
        for i, event in enumerate(events):
            X[i, 0] = event["miss_distance_km"]
            X[i, 1] = event.get("sigma_km", DEFAULT_SIGMA_KM)
            X[i, 2] = event.get("hbr_km", DEFAULT_HBR_KM)
            
        predicted_pcs = self.predict_pc(X)
        
        for i, event in enumerate(events):
            event["ml_prescreen_score"] = float(predicted_pcs[i])
            
        return events

# Singleton instance to be used across the app
ml_triage_model = MLTriageModel()
