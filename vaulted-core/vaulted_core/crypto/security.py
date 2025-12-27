import os
from cryptography.fernet import Fernet
from pathlib import Path

class VaultSecurity:
    def __init__(self, key_path: str = "vault_key.key"):
        self.key_path = Path(key_path)
        self.key = self._load_or_generate_key()
        self.cipher = Fernet(self.key)

    def _load_or_generate_key(self) -> bytes:
        if self.key_path.exists():
            return self.key_path.read_bytes()
        
        key = Fernet.generate_key()
        # In a real app, we would password protect this key or use the OS Keychain
        self.key_path.write_bytes(key)
        # Set restrictive permissions (read/write by owner only)
        os.chmod(self.key_path, 0o600) 
        return key

    def encrypt_data(self, data: bytes) -> bytes:
        return self.cipher.encrypt(data)

    def decrypt_data(self, token: bytes) -> bytes:
        return self.cipher.decrypt(token)

    def encrypt_file(self, file_path: Path, output_path: Path):
        """Encrypts a file and saves it to output_path."""
        with open(file_path, "rb") as f:
            data = f.read()
        
        encrypted_data = self.encrypt_data(data)
        
        with open(output_path, "wb") as f:
            f.write(encrypted_data)

    def decrypt_file(self, encrypted_path: Path, output_path: Path):
        """Decrypts a file and saves it to output_path."""
        with open(encrypted_path, "rb") as f:
            data = f.read()
        
        decrypted_data = self.decrypt_data(data)
        
        with open(output_path, "wb") as f:
            f.write(decrypted_data)
