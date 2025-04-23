// API service for ballots
// This file provides functions to interact with the ballot API

// Get the API URL from environment variables with a fallback
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Get ballot creation data from the API
 * @param ballotData The ballot data to create
 * @returns The data needed to create a ballot using the wallet
 */
export const getBallotCreationData = async (ballotData: any) => {
  const response = await fetch(`${API_URL}/ballots/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(ballotData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to get ballot creation data');
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
  const response = await fetch(`${API_URL}/ballots/${ballotAddress}/whitelist`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(whitelistData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to get whitelist voters data');
  }

  return await response.json();
};

/**
 * Get all ballots
 * @returns All ballots
 */
export const getAllBallots = async () => {
  const response = await fetch(`${API_URL}/ballots`);
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to get ballots');
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
    throw new Error(errorData.message || 'Failed to get active ballots');
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
    throw new Error(errorData.message || 'Failed to get user ballots');
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
    throw new Error(errorData.message || 'Failed to get ballot details');
  }

  return await response.json();
};
