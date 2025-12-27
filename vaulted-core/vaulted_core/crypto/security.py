import os
import keyring
import base64
from pathlib import Path
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import secrets

SERVICE_NAME = "vaulted_core"
USERNAME = "vault_master_key_v2" # Using v2 to distinguish from previous version

class VaultSecurity:
    def __init__(self, key_path: str = "vault_key.key", use_keyring: bool = True):
        self.key_path = Path(key_path)
        self.use_keyring = use_keyring
        self.key = self._load_or_generate_key()
        self.aesgcm = AESGCM(self.key)

    def _load_or_generate_key(self) -> bytes:
        # 1. Try Keyring first
        if self.use_keyring:
            try:
                stored_key = keyring.get_password(SERVICE_NAME, USERNAME)
                if stored_key:
                    return base64.urlsafe_b64decode(stored_key)
            except Exception as e:
                # Log error or just silently fallback
                # In production, we might want to log this properly.
                # For now, we assume keyring might be unavailable in some envs.
                pass

        # 2. Try File (Fallback)
        if self.key_path.exists():
            return base64.urlsafe_b64decode(self.key_path.read_bytes())
        
        # 3. Generate New (AES-256 = 32 bytes)
        key = AESGCM.generate_key(bit_length=256)
        key_b64 = base64.urlsafe_b64encode(key)
        
        # 4. Save
        if self.use_keyring:
            try:
                keyring.set_password(SERVICE_NAME, USERNAME, key_b64.decode('utf-8'))
                # print("Key saved to OS Keychain.") # Too noisy for libraries
                return key
            except Exception as e:
                # print(f"Keyring set failed ({e}), falling back to file.")
                pass
        
        # Fallback to file
        self.key_path.write_bytes(key_b64)
        # Set strict permissions on key file
        try:
            os.chmod(self.key_path, 0o600)
        except Exception:
            pass # Windows might fail on chmod

        return key

    def encrypt_data(self, data: bytes) -> bytes:
        """
        Encrypts data using AES-256-GCM.
        Format: [NONCE (12 bytes)][CIPHERTEXT + TAG]
        """
        nonce = secrets.token_bytes(12)
        # encrypt(nonce, data, associated_data)
        ciphertext = self.aesgcm.encrypt(nonce, data, None)
        return nonce + ciphertext

    def decrypt_data(self, token: bytes) -> bytes:
        """
        Decrypts data using AES-256-GCM.
        Expects Format: [NONCE (12 bytes)][CIPHERTEXT + TAG]
        """
        if len(token) < 28: # 12 nonce + 16 tag (minimum empty message)
            raise ValueError("Token too short")
        nonce = token[:12]
        ciphertext = token[12:]
        return self.aesgcm.decrypt(nonce, ciphertext, None)

    def encrypt_file(self, file_path: Path, output_path: Path):
        with open(file_path, "rb") as f:
            data = f.read()
        
        encrypted_data = self.encrypt_data(data)
        
        with open(output_path, "wb") as f:
            f.write(encrypted_data)

    def decrypt_file(self, encrypted_path: Path, output_path: Path):
        with open(encrypted_path, "rb") as f:
            data = f.read()
        
        decrypted_data = self.decrypt_data(data)
        
        with open(output_path, "wb") as f:
            f.write(decrypted_data)
