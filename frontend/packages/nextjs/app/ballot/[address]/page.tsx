"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAccount, useWriteContract } from "wagmi";
import { ArrowLeftIcon, CheckCircleIcon, UserIcon, UsersIcon } from "@heroicons/react/24/outline";
import { checkWhitelistedVoter, getBallotDetails } from "~~/services/api/ballotApi";
import { notification } from "~~/utils/scaffold-eth";

type BallotDetails = {
  address: string;
  description: string;
  owner: string;
  proposalCount: string;
  maxVotes: string;
  allowDelegation: boolean;
  isActive: boolean;
  status: {
    totalVoters: string;
    votesCount: string;
    votingOpen: boolean;
    allowDelegation: boolean;
    maxVotes: string;
  };
  proposals: {
    name: string;
    voteCount: string;
  }[];
};

export default function BallotDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const ballotAddress =
    typeof params.address === "string" ? params.address : Array.isArray(params.address) ? params.address[0] : "";
  const source = searchParams.get("source") || "ballots";

  const { address: userAddress, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [ballot, setBallot] = useState<BallotDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [navigationSource, setNavigationSource] = useState<string>("ballots");
  const [selectedProposal, setSelectedProposal] = useState<number | null>(null);
  const [isVoting, setIsVoting] = useState<boolean>(false);
  const [ballotAbi, setBallotAbi] = useState<any>(null);
  const [isWhitelisted, setIsWhitelisted] = useState<boolean>(false);
  const [hasVoted, setHasVoted] = useState<boolean>(false);
  const [showVoteInterface, setShowVoteInterface] = useState<boolean>(false);
  const [showDelegateInterface, setShowDelegateInterface] = useState<boolean>(false);
  const [delegateAddress, setDelegateAddress] = useState<string>("");
  const [isDelegating, setIsDelegating] = useState<boolean>(false);

  useEffect(() => {
    const fetchBallotDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/ballots`);
        if (!response.ok) {
          throw new Error("Failed to fetch ballots");
        }

        const allBallots = await response.json();
        const ballotIndex = allBallots.findIndex((b: any) => b.address.toLowerCase() === ballotAddress.toLowerCase());

        if (ballotIndex === -1) {
          throw new Error("Ballot not found");
        }

        const details = await getBallotDetails(ballotIndex);
        setBallot(details);

        // Modified: Get the Ballot ABI from the API endpoint
        try {
          const abiResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/ballots/${ballotAddress}/abi`,
          );
          if (abiResponse.ok) {
            const abiData = await abiResponse.json();
            if (abiData.success && abiData.ballotAbi) {
              setBallotAbi(abiData.ballotAbi);
            } else {
              throw new Error("Failed to get ballot contract ABI from response");
            }
          } else {
            throw new Error("Failed to get ballot contract ABI");
          }
        } catch (abiError) {
          console.error("Error fetching ballot ABI:", abiError);
          // Continue anyway with other operations
        }

        // Check if user is whitelisted
        if (userAddress) {
          try {
            const whitelistResponse = await checkWhitelistedVoter(ballotAddress, userAddress);
            setIsWhitelisted(whitelistResponse.isWhitelisted);
            setHasVoted(whitelistResponse.hasVoted);
          } catch (error) {
            console.error("Error checking whitelist status:", error);
          }
        }
      } catch (err) {
        console.error("Error fetching ballot details:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch ballot details");
        notification.error(err instanceof Error ? err.message : "Failed to fetch ballot details");
      } finally {
        setIsLoading(false);
      }
    };

    if (ballotAddress) {
      fetchBallotDetails();
    }
  }, [ballotAddress, userAddress]);

  const handleVote = async () => {
    if (selectedProposal === null) {
      notification.error("Please select a proposal to vote for");
      return;
    }

    if (!isConnected || !userAddress) {
      notification.error("Please connect your wallet to vote");
      return;
    }

    try {
      setIsVoting(true);

      const txHash = await writeContractAsync({
        address: ballotAddress as `0x${string}`,
        abi: ballotAbi,
        functionName: "vote",
        args: [selectedProposal],
      });

      notification.success("Your vote has been submitted!");

      setTimeout(() => {
        router.refresh();
        setShowVoteInterface(false);
        setSelectedProposal(null);
        setHasVoted(true);

        setTimeout(() => {
          const fetchUpdatedDetails = async () => {
            try {
              const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/ballots`);
              if (!response.ok) {
                throw new Error("Failed to fetch ballots");
              }

              const allBallots = await response.json();
              const ballotIndex = allBallots.findIndex(
                (b: any) => b.address.toLowerCase() === ballotAddress.toLowerCase(),
              );

              if (ballotIndex === -1) {
                throw new Error("Ballot not found");
              }

              const details = await getBallotDetails(ballotIndex);
              setBallot(details);
            } catch (error) {
              console.error("Error refreshing ballot details:", error);
            }
          };

          fetchUpdatedDetails();
        }, 2000);
      }, 1000);
    } catch (err) {
      console.error("Error casting vote:", err);
      notification.error(err instanceof Error ? err.message : "Failed to cast vote");
    } finally {
      setIsVoting(false);
    }
  };

  const handleDelegate = async () => {
    if (!delegateAddress) {
      notification.error("Please enter a delegate address");
      return;
    }

    if (!isConnected || !userAddress) {
      notification.error("Please connect your wallet to delegate your vote");
      return;
    }

    // Basic address format validation
    if (!delegateAddress.startsWith("0x") || delegateAddress.length !== 42) {
      notification.error("Please enter a valid Ethereum address");
      return;
    }

    try {
      setIsDelegating(true);

      const txHash = await writeContractAsync({
        address: ballotAddress as `0x${string}`,
        abi: ballotAbi,
        functionName: "delegate",
        args: [delegateAddress],
      });

      notification.success("Your vote has been delegated successfully!");

      setTimeout(() => {
        router.refresh();
        setShowDelegateInterface(false);
        setDelegateAddress("");
        setHasVoted(true);

        setTimeout(() => {
          const fetchUpdatedDetails = async () => {
            try {
              const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/ballots`);
              if (!response.ok) {
                throw new Error("Failed to fetch ballots");
              }

              const allBallots = await response.json();
              const ballotIndex = allBallots.findIndex(
                (b: any) => b.address.toLowerCase() === ballotAddress.toLowerCase(),
              );

              if (ballotIndex === -1) {
                throw new Error("Ballot not found");
              }

              const details = await getBallotDetails(ballotIndex);
              setBallot(details);
            } catch (error) {
              console.error("Error refreshing ballot details:", error);
            }
          };

          fetchUpdatedDetails();
        }, 2000);
      }, 1000);
    } catch (err) {
      console.error("Error delegating vote:", err);
      notification.error(err instanceof Error ? err.message : "Failed to delegate vote");
    } finally {
      setIsDelegating(false);
    }
  };

  const totalVotes = ballot?.proposals.reduce((sum, proposal) => sum + parseInt(proposal.voteCount), 0) || 0;

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center mb-8">
        <Link href={source === "my-ballots" ? "/my-ballots" : "/ballots"} className="btn btn-ghost gap-1">
          <ArrowLeftIcon className="h-4 w-4" />
          {source === "my-ballots" ? "Back to My Ballots" : "Back to Ballots"}
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="bg-error/20 text-error rounded-xl p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">Error</h2>
          <p>{error}</p>
          <Link href="/ballots" className="btn btn-primary mt-6">
            Back to Ballots
          </Link>
        </div>
      ) : ballot ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-base-100 shadow-xl rounded-xl p-8">
              <h1 className="text-3xl font-bold mb-4">{ballot.description}</h1>

              <div className="divider"></div>

              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-4">Current Results</h2>

                <div className="space-y-6">
                  {ballot.proposals.map((proposal, i) => {
                    const percentage =
                      totalVotes > 0 ? Math.round((parseInt(proposal.voteCount) / totalVotes) * 100) : 0;

                    return (
                      <div key={i}>
                        <div className="flex justify-between mb-1">
                          <span className="font-medium">{proposal.name}</span>
                          <span className="text-base-content/70">
                            {proposal.voteCount} votes ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-base-300 rounded-full h-4">
                          <div className="bg-primary h-4 rounded-full" style={{ width: `${percentage}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-8 text-center">
                  <p className="text-base-content/70 mb-4">
                    Total votes cast: {ballot.status.votesCount} of {ballot.status.maxVotes} maximum
                  </p>

                  {ballot.status.votingOpen ? (
                    userAddress ? (
                      hasVoted ? (
                        <div className="alert alert-success shadow-lg">
                          <div>
                            <CheckCircleIcon className="h-6 w-6" />
                            <span>You have already voted in this ballot.</span>
                          </div>
                        </div>
                      ) : isWhitelisted ? (
                        <>
                          {showVoteInterface ? (
                            <div className="bg-base-200 p-4 rounded-xl">
                              <h3 className="text-lg font-semibold mb-4">Select a proposal to vote for:</h3>
                              <div className="space-y-3 mb-4">
                                {ballot.proposals.map((proposal, index) => (
                                  <div
                                    key={index}
                                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                      selectedProposal === index
                                        ? "border-primary bg-primary/10"
                                        : "border-base-300 hover:border-primary/50"
                                    }`}
                                    onClick={() => setSelectedProposal(index)}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div
                                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                          selectedProposal === index ? "border-primary" : "border-base-300"
                                        }`}
                                      >
                                        {selectedProposal === index && (
                                          <div className="w-3 h-3 rounded-full bg-primary"></div>
                                        )}
                                      </div>
                                      <span>{proposal.name}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="flex justify-between mt-4">
                                <button
                                  className="btn btn-outline btn-sm"
                                  onClick={() => {
                                    setShowVoteInterface(false);
                                    setSelectedProposal(null);
                                  }}
                                >
                                  Cancel
                                </button>
                                <button
                                  className={`btn btn-primary btn-sm ${isVoting ? "loading" : ""}`}
                                  disabled={selectedProposal === null || isVoting}
                                  onClick={handleVote}
                                >
                                  {isVoting ? "Submitting..." : "Cast Vote"}
                                </button>
                              </div>
                            </div>
                          ) : showDelegateInterface ? (
                            <div className="bg-base-200 p-4 rounded-xl">
                              <h3 className="text-lg font-semibold mb-4">Enter address to delegate your vote:</h3>
                              <div className="mb-4">
                                <input
                                  type="text"
                                  placeholder="0x..."
                                  className="input input-bordered w-full"
                                  value={delegateAddress}
                                  onChange={e => setDelegateAddress(e.target.value)}
                                />
                              </div>
                              <div className="flex justify-between mt-4">
                                <button
                                  className="btn btn-outline btn-sm"
                                  onClick={() => {
                                    setShowDelegateInterface(false);
                                    setDelegateAddress("");
                                  }}
                                >
                                  Cancel
                                </button>
                                <button
                                  className={`btn btn-primary btn-sm ${isDelegating ? "loading" : ""}`}
                                  disabled={!delegateAddress || isDelegating}
                                  onClick={handleDelegate}
                                >
                                  {isDelegating ? "Delegating..." : "Delegate Vote"}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col sm:flex-row gap-2 justify-center">
                              <button className="btn btn-primary" onClick={() => setShowVoteInterface(true)}>
                                Cast Your Vote
                              </button>
                              {ballot.status.allowDelegation && (
                                <button className="btn btn-secondary" onClick={() => setShowDelegateInterface(true)}>
                                  Delegate Vote
                                </button>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="alert alert-warning shadow-lg">
                          <div>
                            <UserIcon className="h-6 w-6" />
                            <span>Your address is not whitelisted for this ballot.</span>
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="alert alert-info shadow-lg">
                        <div>
                          <UserIcon className="h-6 w-6" />
                          <span>Connect your wallet to vote on this ballot.</span>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="alert alert-warning shadow-lg">
                      <div>
                        <span>Voting is closed for this ballot.</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-base-100 shadow-xl rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">Ballot Information</h2>

              <div className="space-y-4">
                <div>
                  <div className="text-sm text-base-content/70">Address</div>
                  <div className="font-mono text-xs break-all">{ballot.address}</div>
                </div>

                <div>
                  <div className="text-sm text-base-content/70">Owner</div>
                  <div className="font-mono text-xs break-all">{ballot.owner}</div>
                </div>

                <div>
                  <div className="text-sm text-base-content/70">Total Voters</div>
                  <div className="flex items-center gap-2">
                    <UsersIcon className="h-4 w-4" />
                    <span>{ballot.status.totalVoters}</span>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-base-content/70">Status</div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${ballot.status.votingOpen ? "badge-success" : "badge-error"}`}>
                      {ballot.status.votingOpen ? "Open" : "Closed"}
                    </span>
                    {ballot.allowDelegation && <span className="badge badge-info">Delegation Allowed</span>}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-base-content/70">Maximum Votes</div>
                  <div>{ballot.maxVotes}</div>
                </div>

                <div>
                  <div className="text-sm text-base-content/70">Proposals</div>
                  <div>{ballot.proposalCount}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-base-100 shadow-xl rounded-xl p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">Ballot Not Found</h2>
          <p>The ballot you are looking for does not exist or has been removed.</p>
          <Link href="/ballots" className="btn btn-primary mt-6">
            View All Ballots
          </Link>
        </div>
      )}
    </div>
  );
}
