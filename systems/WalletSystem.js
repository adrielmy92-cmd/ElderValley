const WALLET_STORAGE_KEY = "eldervalley-wallet";
const PROFILE_CACHE_PREFIX = "eldervalley-wallet-profile";

export default class WalletSystem {
  constructor(scene) {
    this.scene = scene;
    this.wallet = null;
    this.profile = null;
    this.status = "Conecte uma carteira para comprar casas.";
    this.loadSavedWallet();
    this.bindProviderEvents();
    if (this.connected) {
      this.loadProfile().then(() => this.scene.refreshWalletDock?.()).catch(() => {});
    }
  }

  loadSavedWallet() {
    try {
      const saved = localStorage.getItem(WALLET_STORAGE_KEY);
      this.wallet = saved ? JSON.parse(saved) : null;
    } catch {
      this.wallet = null;
    }
  }

  saveWallet() {
    if (!this.wallet) {
      localStorage.removeItem(WALLET_STORAGE_KEY);
      return;
    }
    localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(this.wallet));
  }

  bindProviderEvents() {
    const ethereum = window.ethereum;
    if (ethereum?.on) {
      ethereum.on("accountsChanged", (accounts) => {
        if (!this.wallet || this.wallet.provider !== "metamask") {
          return;
        }
        if (!accounts?.length) {
          this.disconnect("MetaMask desconectada.");
          return;
        }
        this.wallet.address = accounts[0];
        this.saveWallet();
        this.status = "MetaMask atualizada.";
        this.scene.refreshWalletDock?.();
      });
      ethereum.on("chainChanged", (chainId) => {
        if (!this.wallet || this.wallet.provider !== "metamask") {
          return;
        }
        this.wallet.chainId = chainId;
        this.saveWallet();
        this.status = "Rede atualizada.";
        this.scene.refreshWalletDock?.();
      });
    }
  }

  get connected() {
    return Boolean(this.wallet?.address);
  }

  getShortAddress() {
    if (!this.wallet?.address) {
      return "Carteira nao conectada";
    }
    return `${this.wallet.label}: ${this.wallet.address.slice(0, 6)}...${this.wallet.address.slice(-4)}`;
  }

  async connectMetaMask() {
    const provider = window.ethereum;
    if (!provider?.request) {
      throw new Error("MetaMask nao encontrada neste navegador.");
    }
    const accounts = await provider.request({ method: "eth_requestAccounts" });
    if (!accounts?.length) {
      throw new Error("Nenhuma conta foi autorizada.");
    }
    const chainId = await provider.request({ method: "eth_chainId" }).catch(() => null);
    this.wallet = {
      provider: "metamask",
      label: "MetaMask",
      chain: "EVM",
      chainId,
      address: accounts[0]
    };
    await this.authenticateEvmWallet(provider);
    await this.loadProfile();
    this.status = "MetaMask conectada.";
    this.saveWallet();
    return this.wallet;
  }

  async connectPhantom() {
    const evmProvider = window.phantom?.ethereum;
    if (evmProvider?.request) {
      const accounts = await evmProvider.request({ method: "eth_requestAccounts" });
      if (!accounts?.length) {
        throw new Error("Nenhuma conta Phantom EVM foi autorizada.");
      }
      const chainId = await evmProvider.request({ method: "eth_chainId" }).catch(() => null);
      this.wallet = {
        provider: "phantom-evm",
        label: "Phantom",
        chain: "EVM",
        chainId,
        address: accounts[0]
      };
      await this.authenticateEvmWallet(evmProvider);
      await this.loadProfile();
      this.status = "Phantom EVM conectada.";
      this.saveWallet();
      return this.wallet;
    }

    const solanaProvider = window.phantom?.solana ?? (window.solana?.isPhantom ? window.solana : null);
    if (!solanaProvider?.connect) {
      throw new Error("Phantom nao encontrada neste navegador.");
    }
    const response = await solanaProvider.connect();
    const publicKey = response?.publicKey ?? solanaProvider.publicKey;
    const address = publicKey?.toString?.();
    if (!address) {
      throw new Error("A Phantom nao retornou carteira valida.");
    }
    this.wallet = {
      provider: "phantom",
      label: "Phantom",
      chain: "Solana",
      address
    };
    await this.loadProfile();
    this.status = "Phantom conectada.";
    this.saveWallet();
    return this.wallet;
  }

  disconnect(message = "Carteira desconectada.") {
    const provider = this.wallet?.provider === "phantom"
      ? (window.phantom?.solana ?? (window.solana?.isPhantom ? window.solana : null))
      : null;
    provider?.disconnect?.();
    this.wallet = null;
    this.profile = null;
    this.status = message;
    localStorage.removeItem("eldervalley-session-token");
    this.saveWallet();
    this.scene.refreshWalletDock?.();
  }

  requireWallet() {
    if (!this.connected) {
      throw new Error("Conecte MetaMask ou Phantom primeiro.");
    }
  }

  async prepareHousePurchase(house) {
    this.requireWallet();
    const profile = await this.ensureProfile();
    if (!profile.ownedHouses.some((ownedHouse) => ownedHouse.id === house.key)) {
      profile.ownedHouses.push({
        id: house.key,
        name: house.name,
        price: house.price,
        purchasedAt: new Date().toISOString(),
        source: "demo-wallet"
      });
      await this.saveProfile();
      return {
        ok: true,
        message: `${house.name} salva nessa carteira. Compra on-chain entra quando o contrato estiver pronto.`
      };
    }
    return {
      ok: true,
      message: `${house.name} ja pertence a esta carteira.`
    };
  }

  getProfileKey() {
    if (!this.wallet?.address) {
      return "";
    }
    return `${PROFILE_CACHE_PREFIX}-${this.wallet.chain}-${this.wallet.address.toLowerCase()}`;
  }

  getStorageKey() {
    if (!this.wallet?.address) {
      return "";
    }
    const chain = String(this.wallet.chain ?? "unknown").toLowerCase();
    const address = this.wallet.address.toLowerCase().replace(/[^a-z0-9]/g, "");
    return `wallet-profile-${chain}-${address}`;
  }

  getProfileId() {
    if (!this.wallet?.address) {
      return "";
    }
    if (this.wallet.profileId) {
      return this.wallet.profileId;
    }
    return `wallet:${String(this.wallet.chain ?? "evm").toLowerCase()}:${this.wallet.address.toLowerCase()}`;
  }

  getAuthHeaders() {
    const token = this.wallet?.sessionToken ?? localStorage.getItem("eldervalley-session-token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async authenticateEvmWallet(provider) {
    if (!this.wallet?.address || !provider?.request) {
      throw new Error("Carteira EVM invalida.");
    }
    const challengeResponse = await fetch("/api/auth/nonce", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: this.wallet.address,
        chain: this.wallet.chain,
        provider: this.wallet.provider
      })
    });
    const challenge = await challengeResponse.json();
    if (!challengeResponse.ok || !challenge?.message) {
      throw new Error(challenge?.error ?? "Nao foi possivel criar o desafio da carteira.");
    }
    const signature = await provider.request({
      method: "personal_sign",
      params: [challenge.message, this.wallet.address]
    });
    const verifyResponse = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: this.wallet.address,
        chain: this.wallet.chain,
        provider: this.wallet.provider,
        nonce: challenge.nonce,
        message: challenge.message,
        signature
      })
    });
    const verified = await verifyResponse.json();
    if (!verifyResponse.ok || !verified?.token) {
      throw new Error(verified?.error ?? "Assinatura da carteira nao foi validada.");
    }
    this.wallet.sessionToken = verified.token;
    this.wallet.profileId = verified.profileId;
    this.profile = this.normalizeProfile(verified.profile);
    localStorage.setItem("eldervalley-session-token", verified.token);
    localStorage.setItem("eldervalley-profile-id", verified.profileId);
    this.scene.registry.set("playerSessionToken", verified.token);
    this.scene.registry.set("playerProfileId", verified.profileId);
    this.scene.registry.set("playerProfile", this.profile);
  }

  createDefaultProfile() {
    return {
      version: 1,
      address: this.wallet?.address ?? "",
      chain: this.wallet?.chain ?? "",
      provider: this.wallet?.provider ?? "",
      selectedCharacter: localStorage.getItem("eldervalley-selected-character") ?? "mage-1",
      ownedCharacters: ["mage-1"],
      ownedHouses: [],
      items: [],
      updatedAt: new Date().toISOString()
    };
  }

  async ensureProfile() {
    if (this.profile) {
      return this.profile;
    }
    return this.loadProfile();
  }

  async loadProfile() {
    if (!this.connected) {
      this.profile = null;
      return null;
    }

    const cacheKey = this.getProfileKey();
    const profileId = this.getProfileId();
    let profile = null;
    try {
      const response = await fetch(`/api/profile/${encodeURIComponent(profileId)}`, {
        cache: "no-store",
        headers: this.getAuthHeaders()
      });
      const result = await response.json();
      profile = response.ok ? result?.profile ?? null : null;
    } catch {
      profile = null;
    }

    if (!profile) {
      try {
        profile = JSON.parse(localStorage.getItem(cacheKey) || "null");
      } catch {
        profile = null;
      }
    }

    this.profile = this.normalizeProfile(profile ?? this.createDefaultProfile());
    localStorage.setItem(cacheKey, JSON.stringify(this.profile));
    if (this.profile.selectedCharacter) {
      localStorage.setItem("eldervalley-selected-character", this.profile.selectedCharacter);
      this.scene.selectedCharacter = this.profile.selectedCharacter;
    }
    if (profileId) {
      localStorage.setItem("eldervalley-profile-id", profileId);
      this.scene.registry.set("playerProfileId", profileId);
      this.scene.registry.set("playerProfile", this.profile);
      if (this.wallet?.sessionToken) {
        this.scene.registry.set("playerSessionToken", this.wallet.sessionToken);
      }
    }
    return this.profile;
  }

  normalizeProfile(profile) {
    const normalized = {
      ...this.createDefaultProfile(),
      ...profile
    };
    normalized.address = this.wallet?.address ?? normalized.address;
    normalized.chain = this.wallet?.chain ?? normalized.chain;
    normalized.provider = this.wallet?.provider ?? normalized.provider;
    normalized.ownedCharacters = [...new Set([...(normalized.ownedCharacters ?? []), normalized.selectedCharacter, "mage-1"].filter(Boolean))];
    normalized.ownedHouses = Array.isArray(normalized.ownedHouses) ? normalized.ownedHouses : [];
    normalized.items = Array.isArray(normalized.items) ? normalized.items : [];
    return normalized;
  }

  async saveProfile() {
    if (!this.connected || !this.profile) {
      return;
    }
    this.profile.updatedAt = new Date().toISOString();
    localStorage.setItem(this.getProfileKey(), JSON.stringify(this.profile));
    try {
      await fetch(`/api/profile/${encodeURIComponent(this.getProfileId())}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...this.getAuthHeaders() },
        body: JSON.stringify(this.profile)
      });
    } catch {
      this.status = "Perfil salvo no navegador. Servidor local nao respondeu.";
    }
  }

  isHouseOwned(houseId) {
    return Boolean(this.profile?.ownedHouses?.some((house) => house.id === houseId));
  }

  saveSelectedCharacter(characterId) {
    if (!this.connected) {
      return;
    }
    this.ensureProfile().then(async (profile) => {
      profile.selectedCharacter = characterId;
      if (!profile.ownedCharacters.includes(characterId)) {
        profile.ownedCharacters.push(characterId);
      }
      await this.saveProfile();
    });
  }
}
