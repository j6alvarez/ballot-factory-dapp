"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useAccount } from "wagmi";
import { ArrowLeftIcon, UserIcon, UsersIcon } from "@heroicons/react/24/outline";
import { getBallotDetails } from "~~/services/api/ballotApi";
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
  const ballotAddress =
    typeof params.address === "string" ? params.address : Array.isArray(params.address) ? params.address[0] : "";
  const source = searchParams.get("source") || "ballots";

  const { address: userAddress } = useAccount();
  const [ballot, setBallot] = useState<BallotDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [navigationSource, setNavigationSource] = useState<string>("ballots");

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
  }, [ballotAddress]);

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
                      <Link href={`/ballot/${ballotAddress}/vote`} className="btn btn-primary">
                        Cast Your Vote
                      </Link>
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
