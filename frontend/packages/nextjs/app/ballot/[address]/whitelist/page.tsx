"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ethers } from "ethers";
import { useAccount, useWalletClient } from "wagmi";
import { ArrowLeftIcon, LockClosedIcon, LockOpenIcon, PlusIcon } from "@heroicons/react/24/outline";
import { getBallotDetails, getWhitelistVotersData, setVotingStateData } from "~~/services/api/ballotApi";
import { notification } from "~~/utils/scaffold-eth";

type Ballot = {
  address: string;
  description: string;
  owner: string;
  maxVotes: string;
  allowDelegation: boolean;
  proposalCount: string;
  isActive: boolean;
};

const WhitelistVoters = () => {
  const { address } = useParams();
  const router = useRouter();
  const { address: connectedAddress, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [ballot, setBallot] = useState<Ballot | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [voterAddresses, setVoterAddresses] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isTogglingVotingState, setIsTogglingVotingState] = useState<boolean>(false);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [votingOpen, setVotingOpen] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchBallotDetails = async () => {
      try {
        setIsLoading(true);

        // Step 1: Fetch all ballots to find the correct index
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/ballots`);
        if (!response.ok) {
          throw new Error("Failed to fetch ballots");
        }

        const allBallots = await response.json();
        // Find the ballot with the matching address from the URL
        const ballotIndex = allBallots.findIndex(
          (b: any) => b.address.toLowerCase() === (address as string).toLowerCase(),
        );

        if (ballotIndex === -1) {
          throw new Error("Ballot not found");
        }

        // Step 2: Fetch the correct ballot details using the found index
        const ballotDetails = await getBallotDetails(ballotIndex);
        setBallot(ballotDetails);
        setVotingOpen(ballotDetails.status.votingOpen);

        if (connectedAddress && ballotDetails.owner.toLowerCase() === connectedAddress.toLowerCase()) {
          setIsOwner(true);
        } else {
          setIsOwner(false);
        }
      } catch (error) {
        console.error("Error fetching ballot details:", error);
        notification.error(error instanceof Error ? error.message : "Failed to fetch ballot details");
      } finally {
        setIsLoading(false);
      }
    };

    if (address) {
      fetchBallotDetails();
    }
  }, [address, connectedAddress]);

  const handleWhitelistVoters = async () => {
    if (!ballotValidations()) return;

    try {
      setIsSubmitting(true);

      const addresses = voterAddresses
        .split(/[,\n\s]+/)
        .map(addr => addr.trim())
        .filter(addr => addr !== "");

      if (addresses.length === 0) {
        notification.error("Please enter at least one valid address");
        return;
      }

      console.log(`[Frontend Component] Preparing to whitelist ${addresses.length} voters for ballot: ${address}`);

      const whitelistData = {
        voters: addresses,
        ownerAddress: connectedAddress,
      };

      const txData = await getWhitelistVotersData(address as string, whitelistData);

      if (!walletClient) {
        notification.error("Wallet client not available");
        return;
      }

      console.log(`[Frontend Component] Constructing transaction with data from API`);

      // Encode the function call using the ABI and parameters from the API response
      const iface = new ethers.Interface(txData.ballotInterface);
      const data = iface.encodeFunctionData(txData.functionName, [txData.params.voters]);

      console.log(`[Frontend Component] Encoded transaction data:`, {
        to: txData.ballotAddress,
        functionName: txData.functionName,
        votersCount: txData.params.voters.length,
        dataFirstBytes: data.substring(0, 66) + "...", // Log just the beginning of the data
      });

      console.log(`[Frontend Component] Sending transaction to the blockchain`);
      const hash = await walletClient.sendTransaction({
        to: txData.ballotAddress as `0x${string}`,
        data: data as `0x${string}`,
        value: BigInt(0),
      });

      console.log(`[Frontend Component] Transaction sent successfully with hash:`, hash);

      notification.success(
        <div className="flex flex-col">
          <span>Voters are being whitelisted.</span>
          <Link href={`/ballot/${address}`} className="underline">
            View ballot details
          </Link>
        </div>,
      );

      setVoterAddresses("");

      setTimeout(() => {
        router.push(`/ballot/${address}`);
      }, 3000);
    } catch (error) {
      console.error("[Frontend Component] Error whitelisting voters:", error);
      notification.error(error instanceof Error ? error.message : "Failed to whitelist voters");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleVotingState = async () => {
    if (!isConnected) {
      notification.error("Please connect your wallet");
      return;
    }

    if (!ballot) {
      notification.error("Ballot details not available");
      return;
    }

    if (!isOwner) {
      notification.error("Only the ballot owner can change voting state");
      return;
    }

    try {
      // Set button to loading state
      setIsTogglingVotingState(true);

      // Calculate the new voting state (opposite of current)
      const newVotingState = !votingOpen;

      // Update UI optimistically
      setVotingOpen(newVotingState);

      // Call the API to get transaction data for setting voting state
      const txData = await setVotingStateData(address as string, newVotingState, connectedAddress as string);

      if (!walletClient) {
        // Reset UI state if wallet client isn't available
        setVotingOpen(!newVotingState); // Revert to original state
        setIsTogglingVotingState(false);
        notification.error("Wallet client not available");
        return;
      }

      // Encode the function call
      const iface = new ethers.Interface(txData.ballotInterface);
      const encodedData = iface.encodeFunctionData(txData.functionName, [txData.params.isOpen]);

      console.log("[Frontend Component] Encoded setVotingState data:", {
        to: txData.ballotAddress,
        functionName: txData.functionName,
        isOpen: txData.params.isOpen,
        encodedData: encodedData.substring(0, 66) + "...",
      });

      // Send transaction
      try {
        const hash = await walletClient.sendTransaction({
          to: txData.ballotAddress as `0x${string}`,
          data: encodedData as `0x${string}`,
          value: BigInt(0),
        });

        // Show success notification with transaction info
        notification.success(
          <div className="flex flex-col">
            <span>Ballot voting is now {newVotingState ? "open" : "closed"}.</span>
            <span className="text-xs mt-1">Transaction: {hash.substring(0, 10)}...</span>
            <Link href={`/ballot/${address}`} className="underline mt-1">
              View ballot details
            </Link>
          </div>,
        );

        // Fetch the latest ballot details after a delay
        setTimeout(async () => {
          try {
            // Step a: Fetch all ballots to find the correct index again
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/ballots`);
            if (!response.ok) {
              throw new Error("Failed to fetch ballots");
            }

            const allBallots = await response.json();
            // Find the ballot with the matching address
            const ballotIndex = allBallots.findIndex(
              (b: any) => b.address.toLowerCase() === (address as string).toLowerCase(),
            );

            if (ballotIndex === -1) {
              throw new Error("Ballot not found");
            }

            // Step b: Fetch the correct ballot details using the found index
            const ballotDetails = await getBallotDetails(ballotIndex);

            // Update UI if blockchain state differs from our optimistic update
            if (ballotDetails.status.votingOpen !== newVotingState) {
              setVotingOpen(ballotDetails.status.votingOpen);
              notification.info(
                <div className="flex flex-col">
                  <span>The voting state has been synchronized with the blockchain.</span>
                </div>,
              );
            }
          } catch (error) {
            console.error("Error refreshing ballot details:", error);
          } finally {
            // Always ensure the toggle state is reset
            setIsTogglingVotingState(false);
          }
        }, 5000); // 5 second delay for transaction processing
      } catch (error) {
        // Handle wallet rejection/error
        console.error("Transaction error:", error);
        // Revert the optimistic update since transaction failed
        setVotingOpen(!newVotingState);
        notification.error(error instanceof Error ? error.message : "Transaction was rejected or failed");
        setIsTogglingVotingState(false);
      }
    } catch (error) {
      console.error("Error toggling voting state:", error);
      notification.error(error instanceof Error ? error.message : "Failed to change voting state");
      setIsTogglingVotingState(false);
    }
  };

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        const content = e.target?.result as string;
        setVoterAddresses(content);
      };
      reader.readAsText(file);
    }
  };

  const ballotValidations = () => {
    if (!isConnected) {
      notification.error("Please connect your wallet");
      return false;
    }

    if (!ballot) {
      notification.error("Ballot details not available");
      return false;
    }

    if (!isOwner) {
      notification.error("Only the ballot owner can whitelist voters");
      return false;
    }

    if (!ballot.isActive) {
      notification.error("Cannot whitelist voters for an inactive ballot");
      return false;
    }

    return true;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!ballot) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center mb-8">
          <Link href="/my-ballots" className="btn btn-ghost gap-1">
            <ArrowLeftIcon className="h-4 w-4" />
            Back to My Ballots
          </Link>
        </div>
        <div className="bg-base-100 shadow-xl rounded-xl p-8 text-center">
          <h2 className="text-2xl font-semibold mb-2">Ballot Not Found</h2>
          <p className="mb-6 text-base-content/70">
            The ballot you are looking for does not exist or could not be loaded.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center mb-8">
        <Link href="/my-ballots" className="btn btn-ghost gap-1">
          <ArrowLeftIcon className="h-4 w-4" />
          Back to My Ballots
        </Link>
        <h1 className="text-3xl font-bold ml-4">Whitelist Voters</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-base-100 shadow-xl rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Ballot Details</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-base-content/70">Description</p>
                <p className="font-medium">{ballot.description}</p>
              </div>
              <div>
                <p className="text-sm text-base-content/70">Address</p>
                <p className="font-mono text-sm break-all">{ballot.address}</p>
              </div>
              <div>
                <p className="text-sm text-base-content/70">Status</p>
                <p className={ballot.isActive ? "text-green-500 font-medium" : "text-red-500 font-medium"}>
                  {ballot.isActive ? "Active" : "Inactive"}
                </p>
              </div>
              <div>
                <p className="text-sm text-base-content/70">Proposals</p>
                <p className="font-medium">{ballot.proposalCount}</p>
              </div>
              <div>
                <p className="text-sm text-base-content/70">Max Votes</p>
                <p className="font-medium">{ballot.maxVotes}</p>
              </div>
              <div>
                <p className="text-sm text-base-content/70">Delegation</p>
                <p className="font-medium">{ballot.allowDelegation ? "Allowed" : "Not Allowed"}</p>
              </div>
              <div>
                <p className="text-sm text-base-content/70">Voting</p>
                <div className="flex items-center justify-between mt-1">
                  <p className={votingOpen ? "text-green-500 font-medium" : "text-red-500 font-medium"}>
                    {votingOpen ? "Open" : "Closed"}
                  </p>
                  {isOwner && (
                    <button
                      className={`btn btn-sm ${votingOpen ? "btn-error" : "btn-success"} gap-1`}
                      onClick={handleToggleVotingState}
                      disabled={isTogglingVotingState}
                    >
                      {isTogglingVotingState ? (
                        <span className="loading loading-spinner loading-xs"></span>
                      ) : votingOpen ? (
                        <>
                          <LockClosedIcon className="h-4 w-4" />
                          Close Voting
                        </>
                      ) : (
                        <>
                          <LockOpenIcon className="h-4 w-4" />
                          Open Voting
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-base-100 shadow-xl rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Whitelist Voters</h2>

            {!isConnected ? (
              <div className="text-center p-6">
                <p className="mb-4 text-base-content/70">Please connect your wallet to whitelist voters.</p>
              </div>
            ) : !isOwner ? (
              <div className="text-center p-6">
                <p className="mb-4 text-base-content/70">Only the ballot owner can whitelist voters.</p>
              </div>
            ) : !ballot.isActive ? (
              <div className="text-center p-6">
                <p className="mb-4 text-base-content/70">Cannot whitelist voters for an inactive ballot.</p>
              </div>
            ) : (
              <div>
                <div className="form-control w-full mb-4">
                  <label className="label">
                    <span className="label-text">Enter addresses to whitelist</span>
                  </label>
                  <textarea
                    className="textarea textarea-bordered h-32 rounded-md font-mono"
                    placeholder="Enter Ethereum addresses separated by commas"
                    value={voterAddresses}
                    onChange={e => setVoterAddresses(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <div className="mt-2">
                    <input type="file" accept=".csv" ref={fileInputRef} onChange={handleCSVUpload} className="hidden" />
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Upload CSV
                    </button>
                    <span className="text-xs ml-2 text-base-content/70">
                      Upload a CSV file with addresses to whitelist
                    </span>
                  </div>
                </div>

                <button
                  className="btn btn-primary w-full flex items-center gap-2"
                  onClick={handleWhitelistVoters}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Processing...
                    </>
                  ) : (
                    <>
                      <PlusIcon className="h-4 w-4" />
                      Whitelist Voters
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhitelistVoters;
