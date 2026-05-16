import { createPublicClient, createWalletClient, custom, http } from "viem";
import { baseSepolia } from "viem/chains";
import nacl from "tweetnacl";
import { env } from "./env";

let cachedClient: any | null = null;
let cachedAccount: `0x${string}` | null = null;
let cachedPermit: any | null = null;

function getEthereum() {
  const eth = (window as any).ethereum;

  if (!eth) {
    throw new Error("No wallet found. Install MetaMask.");
  }

  return eth;
}

function getRpcUrl() {
  return env.rpcUrl || "https://base-sepolia-rpc.publicnode.com";
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeEncryptedInput(encrypted: any) {
  return {
    ...encrypted,
    ctHash:
      typeof encrypted?.ctHash === "bigint"
        ? encrypted.ctHash
        : BigInt(encrypted?.ctHash ?? 0),
  };
}

async function getConnectedAccount(): Promise<`0x${string}`> {
  const ethereum = getEthereum();

  const accounts = (await ethereum.request({
    method: "eth_requestAccounts",
  })) as string[];

  const account = accounts?.[0] as `0x${string}` | undefined;

  if (!account) {
    throw new Error("Wallet connection failed.");
  }

  return account;
}

async function getWalletClients(): Promise<{
  publicClient: any;
  walletClient: any;
  account: `0x${string}`;
}> {
  const ethereum = getEthereum();
  const account = await getConnectedAccount();

  const publicClient: any = createPublicClient({
    chain: baseSepolia,
    transport: http(getRpcUrl()),
  });

  const walletClient: any = createWalletClient({
    chain: baseSepolia,
    account,
    transport: custom(ethereum),
  });

  return { publicClient, walletClient, account };
}

async function clearStoredPermits(client?: any) {
  cachedPermit = null;

  try {
    const permits =
      client && typeof client?.permits?.getPermits === "function"
        ? client.permits.getPermits() || []
        : [];

    for (const permit of permits) {
      if (permit?.hash && typeof client?.permits?.removePermit === "function") {
        try {
          client.permits.removePermit(permit.hash);
        } catch {
          // Ignore permit cleanup failure.
        }
      }
    }

    if (client && typeof client?.permits?.removeActivePermit === "function") {
      try {
        client.permits.removeActivePermit();
      } catch {
        // Ignore permit cleanup failure.
      }
    }
  } catch {
    // Ignore permit cleanup failure.
  }

  try {
    localStorage.removeItem("cofhesdk-permits");
  } catch {
    // Ignore localStorage cleanup failure.
  }
}

async function makeClient() {
  const sdkWeb: any = await import("@cofhe/sdk/web");
  const sdkChains: any = await import("@cofhe/sdk/chains");

  const supportedChain =
    sdkChains.getChainById?.(84532) ??
    sdkChains.chains?.baseSepolia ??
    { id: 84532, name: "base-sepolia" };

  const config = sdkWeb.createCofheConfig({
    supportedChains: [supportedChain],
    useWorkers: false,
  });

  const client = sdkWeb.createCofheClient(config);
  const { publicClient, walletClient, account } = await getWalletClients();

  await client.connect(publicClient as any, walletClient as any);

  cachedAccount = account;

  return client;
}

export async function getCofheClient() {
  if (!cachedClient) {
    cachedClient = await makeClient();
  }

  return cachedClient;
}

async function buildManualSelfPermit(forceFresh = false) {
  const client = await getCofheClient();
  const { publicClient, walletClient, account } = await getWalletClients();
  const permitsPkg: any = await import("@cofhe/sdk/permits");

  if (!forceFresh && cachedPermit?.hash) {
    return cachedPermit;
  }

  await clearStoredPermits(client);

  const validated = permitsPkg.validateSelfPermitOptions({
    issuer: account,
    name: "Zalary self permit",
  });

  const sodiumKeypair = nacl.box.keyPair();

  const sealingPair = new permitsPkg.SealingKey(
    bytesToHex(sodiumKeypair.secretKey),
    bytesToHex(sodiumKeypair.publicKey)
  );

  const unsignedPermit = {
    hash: permitsPkg.PermitUtils.getHash(validated),
    ...validated,
    sealingPair,
    _signedDomain: undefined,
  };

  const signedPermit = await permitsPkg.PermitUtils.sign(
    unsignedPermit,
    publicClient as any,
    walletClient as any
  );

  const chainId = await publicClient.getChainId();

  try {
    permitsPkg.setPermit(chainId, account, signedPermit);
  } catch {
    // Ignore permit cache failure.
  }

  try {
    permitsPkg.setActivePermitHash(chainId, account, signedPermit.hash);
  } catch {
    // Ignore permit cache failure.
  }

  cachedPermit = signedPermit;

  return signedPermit;
}

export async function getSelfPermit(forceFresh = false) {
  return buildManualSelfPermit(forceFresh);
}

export async function resetCofhePermits() {
  const client = await getCofheClient();

  await clearStoredPermits(client);

  return buildManualSelfPermit(true);
}

export async function encryptUint64(amount: bigint) {
  const client = await getCofheClient();
  const account = cachedAccount ?? (await getConnectedAccount());
  const sdk: any = await import("@cofhe/sdk");

  const [encrypted] = await client
    .encryptInputs([sdk.Encryptable.uint64(amount)])
    .setAccount(account)
    .setChainId(84532)
    .setUseWorker(false)
    .execute();

  if (typeof sdk.assertCorrectEncryptedItemInput === "function") {
    sdk.assertCorrectEncryptedItemInput(encrypted);
  }

  return normalizeEncryptedInput(encrypted);
}

export async function decryptUint64ForView(handle: string) {
  const client = await getCofheClient();
  const sdk: any = await import("@cofhe/sdk");

  try {
    const permit = await buildManualSelfPermit(false);

    return await client
      .decryptForView(handle, sdk.FheTypes.Uint64)
      .withPermit(permit)
      .execute();
  } catch {
    const permit = await buildManualSelfPermit(true);

    return client
      .decryptForView(handle, sdk.FheTypes.Uint64)
      .withPermit(permit)
      .execute();
  }
}

export async function decryptBoolForView(handle: string) {
  const client = await getCofheClient();
  const sdk: any = await import("@cofhe/sdk");

  try {
    const permit = await buildManualSelfPermit(false);

    return await client
      .decryptForView(handle, sdk.FheTypes.Bool)
      .withPermit(permit)
      .execute();
  } catch {
    const permit = await buildManualSelfPermit(true);

    return client
      .decryptForView(handle, sdk.FheTypes.Bool)
      .withPermit(permit)
      .execute();
  }
}

export async function decryptForTx(handle: string) {
  const client = await getCofheClient();

  try {
    const permit = await buildManualSelfPermit(false);

    return await client.decryptForTx(handle).withPermit(permit).execute();
  } catch {
    const permit = await buildManualSelfPermit(true);

    return client.decryptForTx(handle).withPermit(permit).execute();
  }
}