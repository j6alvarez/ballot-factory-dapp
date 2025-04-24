// API service for ballots
// This file provides functions to interact with the ballot API

// Get the API URL from environment variables with a fallback
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/**
 * Get ballot creation data from the API
 * @param ballotData The ballot data to create
 * @returns The data needed to create a ballot using the wallet
 */
export const getBallotCreationData = async (ballotData: any) => {
  const response = await fetch(`${API_URL}/ballots/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(ballotData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to get ballot creation data");
  }

  return await response.json();
};

/**
 * Get whitelist voters data from the API
 * @param ballotAddress The address of the ballot
 * @param whitelistData The whitelist data
 * @returns The data needed to whitelist voters using the wallet
 */
export const getWhitelistVotersData = async (ballotAddress: string, whitelistData: any) => {
  console.log(`[Frontend] Sending whitelist request to API for ballot: ${ballotAddress}`);
  console.log(`[Frontend] Request data:`, JSON.stringify(whitelistData, null, 2));

  const response = await fetch(`${API_URL}/ballots/${ballotAddress}/whitelist`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(whitelistData),
  });

  const statusText = `${response.status} ${response.statusText}`;
  console.log(`[Frontend] API response status: ${statusText}`);

  if (!response.ok) {
    const errorData = await response.json();
    console.error(`[Frontend] API error:`, errorData);
    throw new Error(errorData.message || "Failed to get whitelist voters data");
  }

  const responseData = await response.json();
  console.log(
    `[Frontend] API response data:`,
    JSON.stringify(
      {
        success: responseData.success,
        ballotAddress: responseData.ballotAddress,
        functionName: responseData.functionName,
        votersCount: responseData.params?.voters?.length || 0,
      },
      null,
      2,
    ),
  );

  return responseData;
};

/**
 * Get all ballots
 * @returns All ballots
 */
export const getAllBallots = async () => {
  const response = await fetch(`${API_URL}/ballots`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to get ballots");
  }

  return await response.json();
};

/**
 * Get active ballots
 * @returns Active ballots
 */
export const getActiveBallots = async () => {
  const response = await fetch(`${API_URL}/ballots/active`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to get active ballots");
  }

  return await response.json();
};

/**
 * Get ballots by user address
 * @param address The user address
 * @returns Ballots created by the user
 */
export const getUserBallots = async (address: string) => {
  const response = await fetch(`${API_URL}/ballots/user/${address}`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to get user ballots");
  }

  return await response.json();
};

/**
 * Get ballot details by index
 * @param index The ballot index
 * @returns Ballot details
 */
export const getBallotDetails = async (index: number) => {
  const response = await fetch(`${API_URL}/ballots/${index}`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to get ballot details");
  }

  return await response.json();
};

/**
 * Set voting state for a ballot (open or close)
 * @param ballotAddress The address of the ballot
 * @param isOpen Whether voting should be open
 * @param ownerAddress The owner address
 * @returns The data needed to set voting state using the wallet
 */
export const setVotingStateData = async (ballotAddress: string, isOpen: boolean, ownerAddress: string) => {
  const response = await fetch(`${API_URL}/ballots/${ballotAddress}/set-voting-state`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ isOpen, ownerAddress }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to get voting state data");
  }

  return await response.json();
};

/**
 * Get vote data for a ballot
 * @param ballotAddress The address of the ballot
 * @param proposalIndex The index of the proposal to vote for
 * @param voterAddress The address of the voter
 * @returns The data needed to vote using the wallet
 */
export const getVoteData = async (ballotAddress: string, proposalIndex: number, voterAddress: string) => {
  const response = await fetch(`${API_URL}/ballots/${ballotAddress}/vote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ proposalIndex, voterAddress }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to get vote data");
  }

  return await response.json();
};

/**
 * Check if an address is whitelisted for a ballot
 * @param ballotAddress The address of the ballot
 * @param voterAddress The address to check
 * @returns Whether the address is whitelisted
 */
export const checkWhitelistedVoter = async (ballotAddress: string, voterAddress: string) => {
  const response = await fetch(`${API_URL}/ballots/${ballotAddress}/whitelist/check/${voterAddress}`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to check if voter is whitelisted");
  }

  return await response.json();
};
