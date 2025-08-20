"""
Blockchain Integration Module for SovicoPassport Smart Contract
Provides functions to interact with the SovicoPassport NFT contract on blockchain
"""

import json
import os
from web3 import Web3
from web3.middleware import geth_poa_middleware
import time

# Configuration
BLOCKCHAIN_NODE_URL = "http://127.0.0.1:7545"  # Ganache default
CONTRACT_ADDRESS = None  # Will be loaded from deployment artifacts
PRIVATE_KEY = None  # Should be set from environment variables
ACCOUNT_ADDRESS = None  # Will be derived from private key

def load_contract_artifacts():
    """
    Load contract ABI and address from Hardhat artifacts
    Returns: (abi, address) tuple
    """
    try:
        # Load ABI from compiled contract
        abi_path = os.path.join("contracts", "artifacts", "contracts", "SovicoPassport.sol", "SovicoPassport.json")
        with open(abi_path, 'r') as f:
            contract_json = json.load(f)
            abi = contract_json['abi']
        
        # Load deployed contract address
        deployment_path = os.path.join("contracts", "deployed_contracts.json")
        if os.path.exists(deployment_path):
            with open(deployment_path, 'r') as f:
                deployments = json.load(f)
                address = deployments.get('SovicoPassport', {}).get('address')
        else:
            # If no deployment file, use environment variable
            address = os.getenv('SOVICO_PASSPORT_CONTRACT_ADDRESS')
        
        if not address:
            raise ValueError("Contract address not found. Please deploy contract first.")
        
        return abi, address
    
    except Exception as e:
        print(f"Error loading contract artifacts: {e}")
        raise

def setup_web3_connection():
    """
    Setup Web3 connection to blockchain node
    Returns: Web3 instance
    """
    try:
        # Connect to blockchain node
        w3 = Web3(Web3.HTTPProvider(BLOCKCHAIN_NODE_URL))
        
        # Add middleware for PoA networks (like Ganache)
        w3.middleware_onion.inject(geth_poa_middleware, layer=0)
        
        # Check connection
        if not w3.is_connected():
            raise ConnectionError(f"Failed to connect to blockchain node at {BLOCKCHAIN_NODE_URL}")
        
        print(f"✅ Connected to blockchain node at {BLOCKCHAIN_NODE_URL}")
        print(f"📊 Current block number: {w3.eth.block_number}")
        
        return w3
    
    except Exception as e:
        print(f"❌ Error connecting to blockchain: {e}")
        raise

def setup_account(w3, private_key=None):
    """
    Setup account for signing transactions
    Returns: (account, address) tuple
    """
    try:
        # Use provided private key or get from environment
        if not private_key:
            private_key = os.getenv('PRIVATE_KEY')
        
        if not private_key:
            # For development, use first account from Ganache
            accounts = w3.eth.accounts
            if accounts:
                account_address = accounts[0]
                print(f"🔑 Using Ganache account: {account_address}")
                return None, account_address
            else:
                raise ValueError("No private key provided and no accounts available")
        
        # Create account from private key
        account = w3.eth.account.from_key(private_key)
        account_address = account.address
        
        # Check balance
        balance = w3.eth.get_balance(account_address)
        balance_eth = w3.from_wei(balance, 'ether')
        
        print(f"🔑 Account address: {account_address}")
        print(f"💰 Account balance: {balance_eth} ETH")
        
        if balance == 0:
            print("⚠️  Warning: Account has zero balance. Make sure to fund it for transactions.")
        
        return account, account_address
    
    except Exception as e:
        print(f"❌ Error setting up account: {e}")
        raise

def update_nft_on_blockchain(token_id, new_rank, new_badge, private_key=None):
    """
    Update NFT passport data on blockchain using the SovicoPassport smart contract
    
    Args:
        token_id (int): The NFT token ID to update
        new_rank (str): New rank to assign to the passport
        new_badge (str): New badge to add to the passport
        private_key (str, optional): Private key for signing transaction
    
    Returns:
        str: Transaction hash if successful
    """
    try:
        print(f"🚀 Starting NFT update process...")
        print(f"📝 Token ID: {token_id}")
        print(f"🏆 New Rank: {new_rank}")
        print(f"🏅 New Badge: {new_badge}")
        print("-" * 50)
        
        # Step 1: Setup Web3 connection
        print("1️⃣ Connecting to blockchain node...")
        w3 = setup_web3_connection()
        
        # Step 2: Load contract ABI and address
        print("2️⃣ Loading contract artifacts...")
        abi, contract_address = load_contract_artifacts()
        print(f"📄 Contract address: {contract_address}")
        
        # Step 3: Create contract instance
        print("3️⃣ Creating contract instance...")
        contract = w3.eth.contract(address=contract_address, abi=abi)
        print(f"✅ Contract instance created successfully")
        
        # Step 4: Setup account
        print("4️⃣ Setting up account...")
        account, account_address = setup_account(w3, private_key)
        
        # Step 5: Check if token exists and get current data
        print("5️⃣ Validating token...")
        try:
            current_data = contract.functions.getPassportData(token_id).call()
            print(f"📋 Current passport data: {current_data}")
        except Exception as e:
            print(f"❌ Token {token_id} does not exist or error reading data: {e}")
            return None
        
        # Step 6: Build transaction
        print("6️⃣ Building transaction...")
        
        # Get gas estimate
        try:
            gas_estimate = contract.functions.updatePassport(
                token_id, new_rank, new_badge
            ).estimate_gas({'from': account_address})
            print(f"⛽ Estimated gas: {gas_estimate}")
        except Exception as e:
            print(f"❌ Error estimating gas: {e}")
            gas_estimate = 300000  # Fallback gas limit
        
        # Build transaction
        transaction = contract.functions.updatePassport(
            token_id, new_rank, new_badge
        ).build_transaction({
            'from': account_address,
            'gas': gas_estimate + 50000,  # Add buffer
            'gasPrice': w3.eth.gas_price,
            'nonce': w3.eth.get_transaction_count(account_address),
        })
        
        print(f"📦 Transaction built: {transaction}")
        
        # Step 7: Sign and send transaction
        print("7️⃣ Signing and sending transaction...")
        
        if account:
            # Sign with private key
            signed_txn = w3.eth.account.sign_transaction(transaction, private_key)
            tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
        else:
            # Send from unlocked account (Ganache)
            tx_hash = w3.eth.send_transaction(transaction)
        
        print(f"📤 Transaction sent: {tx_hash.hex()}")
        
        # Step 8: Wait for confirmation
        print("8️⃣ Waiting for transaction confirmation...")
        tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        if tx_receipt.status == 1:
            print("✅ Transaction confirmed successfully!")
            print(f"🔗 Transaction hash: {tx_hash.hex()}")
            print(f"📊 Block number: {tx_receipt.blockNumber}")
            print(f"⛽ Gas used: {tx_receipt.gasUsed}")
            
            # Verify the update
            print("9️⃣ Verifying update...")
            try:
                updated_data = contract.functions.getEnhancedPassportData(token_id).call()
                print(f"🔄 Updated passport data:")
                print(f"   Rank: {updated_data[0]}")
                print(f"   Badges: {updated_data[1]}")
                
                # Check for events
                if tx_receipt.logs:
                    print("📢 Events emitted:")
                    for log in tx_receipt.logs:
                        try:
                            decoded_log = contract.events.PassportRankUpdated().processLog(log)
                            print(f"   🏆 Rank Updated: Token {decoded_log.args.tokenId} -> {decoded_log.args.newRank}")
                        except:
                            try:
                                decoded_log = contract.events.PassportBadgeAdded().processLog(log)
                                print(f"   🏅 Badge Added: Token {decoded_log.args.tokenId} -> {decoded_log.args.badge}")
                            except:
                                pass
                
            except Exception as e:
                print(f"⚠️  Could not verify update: {e}")
            
            return tx_hash.hex()
        else:
            print("❌ Transaction failed!")
            return None
            
    except Exception as e:
        print(f"❌ Error updating NFT on blockchain: {e}")
        return None

def get_nft_metadata(token_id):
    """
    Get NFT metadata from blockchain
    
    Args:
        token_id (int): The NFT token ID
    
    Returns:
        dict: NFT metadata
    """
    try:
        print(f"📖 Getting metadata for token {token_id}...")
        
        # Setup connection
        w3 = setup_web3_connection()
        abi, contract_address = load_contract_artifacts()
        contract = w3.eth.contract(address=contract_address, abi=abi)
        
        # Get token URI
        token_uri = contract.functions.tokenURI(token_id).call()
        print(f"🔗 Token URI: {token_uri}")
        
        # If it's a data URI, decode it
        if token_uri.startswith("data:application/json;base64,"):
            import base64
            base64_data = token_uri[29:]  # Remove prefix
            json_data = base64.b64decode(base64_data).decode('utf-8')
            metadata = json.loads(json_data)
            print(f"📋 Metadata: {json.dumps(metadata, indent=2)}")
            return metadata
        else:
            print(f"🔗 External URI: {token_uri}")
            return {"uri": token_uri}
            
    except Exception as e:
        print(f"❌ Error getting NFT metadata: {e}")
        return None

def batch_update_nfts(updates, private_key=None):
    """
    Update multiple NFTs in batch
    
    Args:
        updates (list): List of (token_id, rank, badge) tuples
        private_key (str, optional): Private key for signing transactions
    
    Returns:
        list: List of transaction hashes
    """
    results = []
    print(f"🔄 Starting batch update for {len(updates)} NFTs...")
    
    for i, (token_id, rank, badge) in enumerate(updates, 1):
        print(f"\n📦 Processing update {i}/{len(updates)}...")
        tx_hash = update_nft_on_blockchain(token_id, rank, badge, private_key)
        results.append(tx_hash)
        
        # Small delay between transactions
        if i < len(updates):
            print("⏳ Waiting 2 seconds before next transaction...")
            time.sleep(2)
    
    successful = len([r for r in results if r])
    print(f"\n✅ Batch update completed: {successful}/{len(updates)} successful")
    return results

# Example usage and testing
if __name__ == "__main__":
    print("🧪 SovicoPassport Blockchain Integration Test")
    print("=" * 60)
    
    # Test parameters
    test_token_id = 0
    test_rank = "Platinum"
    test_badge = "python_integration_test"
    
    try:
        # Test single update
        print("\n🔬 Testing single NFT update...")
        result = update_nft_on_blockchain(test_token_id, test_rank, test_badge)
        
        if result:
            print(f"✅ Test successful! Transaction: {result}")
            
            # Test metadata retrieval
            print("\n📖 Testing metadata retrieval...")
            metadata = get_nft_metadata(test_token_id)
            
        else:
            print("❌ Test failed!")
            
    except Exception as e:
        print(f"❌ Test error: {e}")
        print("\n💡 Make sure to:")
        print("   1. Start Ganache on http://127.0.0.1:7545")
        print("   2. Deploy SovicoPassport contract")
        print("   3. Mint at least one token for testing")
