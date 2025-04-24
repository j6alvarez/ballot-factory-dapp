"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { ArrowLeftIcon, ClockIcon, DocumentTextIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { getActiveBallots } from "~~/services/api/ballotApi";
import { notification } from "~~/utils/scaffold-eth";

type Ballot = {
  address: string;
  description: string;
  owner: string;
  maxVotes: string;
  allowDelegation: boolean;
  proposalCount: string;
  isActive: boolean;
  votingOpen: boolean;
};

const BallotsList = () => {
  const { address: connectedAddress } = useAccount();
  const [ballots, setBallots] = useState<Ballot[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch active ballots when the component mounts
  useEffect(() => {
    const fetchBallots = async () => {
      try {
        setIsLoading(true);
        const activeBallots = await getActiveBallots();
        setBallots(activeBallots);
      } catch (error) {
        console.error("Error fetching ballots:", error);
        notification.error(error instanceof Error ? error.message : "Failed to fetch ballots");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBallots();
  }, []);

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center mb-8">
        <Link href="/" className="btn btn-ghost gap-1">
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </Link>
        <h1 className="text-3xl font-bold ml-4">Available Ballots</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
        </div>
      ) : ballots.length === 0 ? (
        <div className="bg-base-100 shadow-xl rounded-xl p-8 text-center">
          <DocumentTextIcon className="h-12 w-12 mx-auto mb-4 text-base-content/70" />
          <h2 className="text-2xl font-semibold mb-2">No Active Ballots Found</h2>
          <p className="mb-6 text-base-content/70">There are currently no active ballots available for voting.</p>
          <Link href="/create-ballot" className="btn btn-primary">
            Create a New Ballot
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ballots.map((ballot, index) => (
            <div
              key={index}
              className="bg-base-100 shadow-xl rounded-xl overflow-hidden hover:shadow-2xl transition-shadow"
            >
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-2 line-clamp-1">{ballot.description}</h2>
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm text-base-content/70">
                    <UserGroupIcon className="h-4 w-4" />
                    <span>{ballot.proposalCount} proposals</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-base-content/70">
                    <ClockIcon className="h-4 w-4" />
                    <span>Max votes: {ballot.maxVotes}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${ballot.votingOpen ? "badge-success" : "badge-error"}`}>
                      {ballot.votingOpen ? "Open" : "Closed"}
                    </span>
                    {ballot.allowDelegation && <span className="badge badge-info">Delegation allowed</span>}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <Link href={`/ballot/${ballot.address}?source=ballots`} className="btn btn-primary btn-sm">
                    View Details
                  </Link>
                  {connectedAddress && (
                    <Link href={`/ballot/${ballot.address}/vote`} className="btn btn-outline btn-sm">
                      Vote
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BallotsList;
