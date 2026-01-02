import flwr as fl
import torch
import torch.nn as nn
import torch.optim as optim
from collections import OrderedDict
from .trainer import SimpleNet, load_data

class AegisClient(fl.client.NumPyClient):
    def __init__(self):
        self.model = SimpleNet()
        self.train_loader = load_data() # Simulating local data access
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model.to(self.device)

    def get_parameters(self, config):
        return [val.cpu().numpy() for _, val in self.model.state_dict().items()]

    def set_parameters(self, parameters):
        params_dict = zip(self.model.state_dict().keys(), parameters)
        state_dict = OrderedDict({k: torch.tensor(v) for k, v in params_dict})
        self.model.load_state_dict(state_dict, strict=True)

    def fit(self, parameters, config):
        self.set_parameters(parameters)
        
        # Parse Privacy Config
        privacy_level = config.get("privacy_level", "low")
        print(f"Client received config: Privacy Level = {privacy_level}")

        # Train locally
        criterion = nn.BCELoss()
        optimizer = optim.SGD(self.model.parameters(), lr=0.01)
        self.model.train()
        
        for _ in range(1): # 1 epoch per round for now
            for inputs, labels in self.train_loader:
                inputs, labels = inputs.to(self.device), labels.to(self.device)
                optimizer.zero_grad()
                outputs = self.model(inputs)
                loss = criterion(outputs, labels)
                loss.backward()
                
                # --- PRIVACY INJECTION (Differential Privacy) ---
                # 1. Gradient Clipping (Prevent any single sample from having too much influence)
                torch.nn.utils.clip_grad_norm_(self.model.parameters(), max_norm=1.0)
                
                # 2. Add Noise (Simulated DP)
                # In production we would use opacus, but manual noise demonstrates the arch pattern
                if privacy_level == "high":
                    with torch.no_grad():
                        for param in self.model.parameters():
                            if param.grad is not None:
                                noise = torch.randn_like(param.grad) * 0.01
                                param.grad += noise

                optimizer.step()
                
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
