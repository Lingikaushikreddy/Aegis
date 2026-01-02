import flwr as fl
import torch
import torch.nn as nn
import torch.optim as optim
from collections import OrderedDict
import os
import sys

# Ensure the engine module can be found if not installed
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from engine import aegis_engine
except ImportError:
    aegis_engine = None

from .trainer import SimpleNet, load_data

class AegisClient(fl.client.NumPyClient):
    def __init__(self):
        self.model = SimpleNet()
        self.train_loader = load_data() # Simulating local data access
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model.to(self.device)
        self.engine = None

        # Initialize the Rust engine with default safe params
        # Real params should come from server config ideally, but engine init is costly/stateful
        # We'll init lazily or with defaults
        if aegis_engine:
            try:
                self.engine = aegis_engine.FlClientCore(
                    data_path="./data", # Dummy path as actual data is loaded via PyTorch here
                    dp_sigma=1.0,
                    dp_threshold=1.0
                )
            except Exception as e:
                print(f"Failed to initialize Aegis Rust Engine: {e}")
                self.engine = None

    def get_parameters(self, config):
        return [val.cpu().numpy() for _, val in self.model.state_dict().items()]

    def set_parameters(self, parameters):
        params_dict = zip(self.model.state_dict().keys(), parameters)
        state_dict = OrderedDict({k: torch.tensor(v) for k, v in params_dict})
        self.model.load_state_dict(state_dict, strict=True)

    def _get_flattened_weights(self):
        """Extract and flatten model weights."""
        return torch.cat([p.data.view(-1) for p in self.model.parameters()]).tolist()

    def _set_flattened_weights(self, flat_weights: list):
        """Load flattened weights back into model."""
        pointer = 0
        new_tensor_data = torch.tensor(flat_weights, device=self.device)
        for p in self.model.parameters():
            num_param = p.numel()
            p.data.copy_(new_tensor_data[pointer:pointer+num_param].view_as(p))
            pointer += num_param

    def fit(self, parameters, config):
        self.set_parameters(parameters)
        
        # 1. Capture Initial State for Update Calculation
        initial_weights_flat = self._get_flattened_weights()

        # Parse Privacy Config
        privacy_level = config.get("privacy_level", "low")
        print(f"Client received config: Privacy Level = {privacy_level}")

        if privacy_level == "high" and self.engine is None:
             raise RuntimeError("High privacy requested but Aegis Rust Engine is not available!")

        # 2. Local Training
        criterion = nn.BCELoss()
        optimizer = optim.SGD(self.model.parameters(), lr=0.01)
        self.model.train()
        
        for _ in range(1): # 1 epoch per round
            for inputs, labels in self.train_loader:
                inputs, labels = inputs.to(self.device), labels.to(self.device)
                optimizer.zero_grad()
                outputs = self.model(inputs)
                loss = criterion(outputs, labels)
                loss.backward()
                optimizer.step()

        # 3. Calculate Update
        final_weights_flat = self._get_flattened_weights()

        # update = final - initial
        update_vector = [f - i for f, i in zip(final_weights_flat, initial_weights_flat)]

        # 4. Apply Privacy via Rust Engine
        if privacy_level == "high":
            print("--- Delegating to Rust Engine for Secure DP ---")
            rust_weights = aegis_engine.ModelWeights(
                data=update_vector,
                shape=[len(update_vector)]
            )
            try:
                # The engine applies clipping and noise to the UPDATE
                privatized_result = self.engine.privatize_update(rust_weights)
                privatized_update = privatized_result.data
            except Exception as e:
                raise RuntimeError(f"Privacy Engine Failure: {e}")
        else:
            # Low privacy: send raw gradients
            privatized_update = update_vector

        # 5. Reconstruct Weights
        # new_global = initial + privatized_update
        new_global_weights = [i + u for i, u in zip(initial_weights_flat, privatized_update)]

        self._set_flattened_weights(new_global_weights)

        return self.get_parameters(config={}), len(self.train_loader.dataset), {}

    def evaluate(self, parameters, config):
        self.set_parameters(parameters)
        criterion = nn.BCELoss()
        loss = 0.0
        correct = 0
        total = 0
        self.model.eval()
        
        with torch.no_grad():
            for inputs, labels in self.train_loader:
                inputs, labels = inputs.to(self.device), labels.to(self.device)
                outputs = self.model(inputs)
                loss += criterion(outputs, labels).item()
                predicted = (outputs > 0.5).float()
                total += labels.size(0)
                correct += (predicted == labels).sum().item()
        
        accuracy = correct / total if total > 0 else 0
        return float(loss), len(self.train_loader.dataset), {"accuracy": float(accuracy)}

def start_client():
    print("Starting Aegis FL Client...")
    fl.client.start_client(
        server_address="127.0.0.1:8080", 
        client=AegisClient().to_client()
    )

if __name__ == "__main__":
    start_client()
