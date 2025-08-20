"""
Demo script for testing blockchain integration with SovicoPassport
This script demonstrates how to use the update_nft_on_blockchain function
"""

import os
import sys
from blockchain_integration import (
    update_nft_on_blockchain,
    get_nft_metadata,
    batch_update_nfts,
    setup_web3_connection,
    load_contract_artifacts
)

def main():
    print("🎮 SovicoPassport Blockchain Integration Demo")
    print("=" * 60)
    
    # Demo configuration
    demo_updates = [
        (0, "Diamond", "founder"),
        (0, "Diamond", "early_adopter"),
        (0, "Diamond", "python_master"),
    ]
    
    try:
        # Test connection first
        print("🔍 Testing blockchain connection...")
        w3 = setup_web3_connection()
        
        if not w3.is_connected():
            print("❌ Cannot connect to blockchain. Please start Ganache on http://127.0.0.1:7545")
            return
        
        # Check if contract is deployed
        print("📄 Checking contract deployment...")
        try:
            abi, contract_address = load_contract_artifacts()
            print(f"✅ Contract found at: {contract_address}")
        except Exception as e:
            print(f"❌ Contract not found: {e}")
            print("💡 Please deploy the contract first:")
            print("   cd contracts && npx hardhat run scripts/deploy.js --network localhost")
            return
        
        # Demo 1: Single update
        print("\n" + "="*50)
        print("🔧 Demo 1: Single NFT Update")
        print("="*50)
        
        token_id = 0
        new_rank = "Platinum"
        new_badge = "demo_badge"
        
        print(f"Updating Token #{token_id}:")
        print(f"  New Rank: {new_rank}")
        print(f"  New Badge: {new_badge}")
        
        result = update_nft_on_blockchain(token_id, new_rank, new_badge)
        
        if result:
            print(f"✅ Update successful! Transaction: {result}")
        else:
            print("❌ Update failed!")
            return
        
        # Demo 2: Get metadata
        print("\n" + "="*50)
        print("📖 Demo 2: Get NFT Metadata")
        print("="*50)
        
        metadata = get_nft_metadata(token_id)
        if metadata:
            print("✅ Metadata retrieved successfully!")
        
        # Demo 3: Batch updates
        print("\n" + "="*50)
        print("🔄 Demo 3: Batch NFT Updates")
        print("="*50)
        
        print("Performing multiple updates on the same token to add badges:")
        for i, (tid, rank, badge) in enumerate(demo_updates, 1):
            print(f"  {i}. Token #{tid} -> Rank: {rank}, Badge: {badge}")
        
        results = batch_update_nfts(demo_updates)
        successful = len([r for r in results if r])
        print(f"✅ Batch completed: {successful}/{len(demo_updates)} successful")
        
        # Demo 4: Final metadata check
        print("\n" + "="*50)
        print("🔍 Demo 4: Final State Check")
        print("="*50)
        
        print("Final NFT metadata after all updates:")
        final_metadata = get_nft_metadata(token_id)
        
        print("\n🎉 Demo completed successfully!")
        print("💡 You can now integrate this function into your Flask backend")
        
    except KeyboardInterrupt:
        print("\n⏹️  Demo interrupted by user")
    except Exception as e:
        print(f"\n❌ Demo error: {e}")
        print("\n🔧 Troubleshooting:")
        print("1. Make sure Ganache is running on http://127.0.0.1:7545")
        print("2. Deploy the contract: cd contracts && npx hardhat run scripts/deploy.js --network localhost")
        print("3. Make sure the contract has tokens minted")
        print("4. Install dependencies: pip install -r requirements.txt")

def test_environment():
    """Test if environment is ready for blockchain integration"""
    print("🧪 Environment Test")
    print("-" * 30)
    
    # Check Python packages
    try:
        import web3
        print(f"✅ web3.py version: {web3.__version__}")
    except ImportError:
        print("❌ web3.py not installed. Run: pip install web3")
        return False
    
    try:
        import eth_account
        print(f"✅ eth-account available")
    except ImportError:
        print("❌ eth-account not installed. Run: pip install eth-account")
        return False
    
    # Check if Ganache is running
    try:
        w3 = setup_web3_connection()
        if w3.is_connected():
            print(f"✅ Blockchain connection: Block #{w3.eth.block_number}")
            
            # Check accounts
            accounts = w3.eth.accounts
            print(f"✅ Available accounts: {len(accounts)}")
            if accounts:
                balance = w3.eth.get_balance(accounts[0])
                print(f"✅ First account balance: {w3.from_wei(balance, 'ether')} ETH")
        else:
            print("❌ Cannot connect to blockchain")
            return False
    except Exception as e:
        print(f"❌ Blockchain connection error: {e}")
        return False
    
    # Check contract artifacts
    try:
        abi, address = load_contract_artifacts()
        print(f"✅ Contract artifacts found")
        print(f"   Address: {address}")
        print(f"   ABI functions: {len(abi)} items")
    except Exception as e:
        print(f"❌ Contract artifacts error: {e}")
        return False
    
    print("🎉 Environment test passed!")
    return True

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        # Run environment test
        if test_environment():
            print("\n✅ Ready to run demo!")
        else:
            print("\n❌ Environment not ready. Please fix issues above.")
    else:
        # Run main demo
        main()
