"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount, useWriteContract } from "wagmi";
import { ArrowLeftIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { getBallotDetails } from "~~/services/api/ballotApi";
import { notification } from "~~/utils/scaffold-eth";

type Proposal = {
  name: string;
  voteCount: string;
};

export default function VotePage({ params }: { params: any }) {
  // Properly unwrap the params Promise using React.use()
  const unwrappedParams = use(params);
  const ballotAddress = (unwrappedParams as { address: string }).address;

  const router = useRouter();
  const { address: userAddress, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [ballotAbi, setBallotAbi] = useState<any>(null);
  const [selectedProposal, setSelectedProposal] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isVoting, setIsVoting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [ballotInfo, setBallotInfo] = useState<{
    description: string;
    isActive: boolean;
    status: { votingOpen: boolean };
  } | null>(null);

  useEffect(() => {
    const fetchBallotDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Since our API fetches by index, we need to find the ballot's index
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/ballots`);
        if (!response.ok) {
          throw new Error("Failed to fetch ballots");
        }

        const allBallots = await response.json();
        const ballotIndex = allBallots.findIndex((b: any) => b.address.toLowerCase() === ballotAddress.toLowerCase());

        if (ballotIndex === -1) {
          throw new Error("Ballot not found");
        }

        // Fetch the ballot details
        const details = await getBallotDetails(ballotIndex);
        setProposals(details.proposals);
        setBallotInfo({
          description: details.description,
          isActive: details.isActive,
          status: details.status,
        });

        // Get the Ballot ABI
        const abiResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/ballots/${ballotAddress}/whitelist`,
        );
        if (!abiResponse.ok) {
          throw new Error("Failed to fetch ballot contract ABI");
        }

        const abiData = await abiResponse.json();
        setBallotAbi(abiData.ballotInterface);
      } catch (err) {
        console.error("Error fetching ballot details:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch ballot details");
      } finally {
        setIsLoading(false);
      }
    };

    if (ballotAddress) {
      fetchBallotDetails();
    }
  }, [ballotAddress]);

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

      // Call the vote function on the ballot contract
      const txHash = await writeContractAsync({
        address: ballotAddress as `0x${string}`,
        abi: ballotAbi,
        functionName: "vote",
        args: [selectedProposal],
      });

      notification.success("Your vote has been submitted!");

      // Wait for a moment and then redirect to the ballot details page
      setTimeout(() => {
        router.push(`/ballot/${ballotAddress}`);
      }, 2000);
    } catch (err) {
      console.error("Error casting vote:", err);
      notification.error(err instanceof Error ? err.message : "Failed to cast vote");
    } finally {
      setIsVoting(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center mb-8">
          <Link href={`/ballot/${ballotAddress}`} className="btn btn-ghost gap-1">
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Ballot
          </Link>
        </div>

        <div className="flex flex-col items-center justify-center bg-base-100 shadow-xl rounded-xl p-10 max-w-lg mx-auto">
          <ExclamationTriangleIcon className="h-12 w-12 text-warning mb-4" />
          <h2 className="text-2xl font-semibold text-center mb-4">Wallet Connection Required</h2>
          <p className="text-center mb-6">
            You need to connect your wallet to vote. Please connect your wallet using the button in the top right
            corner.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center mb-8">
        <Link href={`/ballot/${ballotAddress}`} className="btn btn-ghost gap-1">
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Ballot
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
          <Link href={`/ballot/${ballotAddress}`} className="btn btn-primary mt-6">
            Back to Ballot
          </Link>
        </div>
      ) : ballotInfo && (!ballotInfo.isActive || !ballotInfo.status.votingOpen) ? (
        <div className="bg-warning/20 text-warning rounded-xl p-8 text-center max-w-lg mx-auto">
          <ExclamationTriangleIcon className="h-12 w-12 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-4">Voting Closed</h2>
          <p>This ballot is no longer accepting votes.</p>
          <Link href={`/ballot/${ballotAddress}`} className="btn btn-primary mt-6">
            View Results
          </Link>
        </div>
      ) : (
        <div className="bg-base-100 shadow-xl rounded-xl p-8 max-w-lg mx-auto">
          <h1 className="text-2xl font-bold mb-2">Cast Your Vote</h1>
          <h2 className="text-lg mb-6 text-base-content/70">{ballotInfo?.description}</h2>

          <div className="divider mb-6"></div>

          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Select a proposal:</h3>

            <div className="space-y-3">
              {proposals.map((proposal, index) => (
                <div
                  key={index}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
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
                      {selectedProposal === index && <div className="w-3 h-3 rounded-full bg-primary"></div>}
                    </div>
                    <span className="text-lg">{proposal.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              className={`btn btn-primary ${isVoting ? "loading" : ""}`}
              disabled={selectedProposal === null || isVoting}
              onClick={handleVote}
            >
              {isVoting ? "Submitting..." : "Cast Vote"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
