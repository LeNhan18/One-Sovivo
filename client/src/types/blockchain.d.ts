// Global type declarations for blockchain integration

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, handler: (...args: any[]) => void) => void;
      removeListener: (event: string, handler: (...args: any[]) => void) => void;
      selectedAddress: string | null;
    };
  }
}

// Contract configuration types
export interface ContractConfig {
  address: string;
  rpcUrl: string;
}

export interface NetworkConfig {
  [key: string]: ContractConfig;
}

export {};
