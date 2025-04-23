"use client";

import Image from "next/image";
import Link from "next/link";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { ClipboardDocumentCheckIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();

  return (
    <>
      <div className="flex items-center flex-col flex-grow">
        <div className="px-5">
          <div className="flex flex-col items-center mb-8">
            <div className="relative w-96 h-48">
              <Image
                src="/images/ballot-logo.png"
                alt="Ballot.xyz logo"
                fill
                style={{ objectFit: "contain" }}
                priority
              />
            </div>
            <p className="text-center text-2xl mb-2 text-primary">Ballots for communities, done right.</p>
          </div>

          <div className="flex justify-center items-center space-x-2 flex-col">
            {connectedAddress ? (
              <>
                <p className="my-2 font-medium">Connected Address:</p>
                <Address address={connectedAddress} />
              </>
            ) : (
              <div className="alert alert-info shadow-lg max-w-md flex">
                <div className="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    className="stroke-current flex-shrink-0 w-6 h-6 mr-2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                  <span>Connect your wallet to create a ballot and vote!</span>
                </div>
              </div>
            )}
          </div>

          <div className="max-w-2xl mx-auto mt-8">
            <p className="text-center text-lg mb-2">
              Create, manage, and vote on transparent blockchain-based ballots for your community, organization, or
              project.
            </p>
          </div>
        </div>

        <div className="flex-grow bg-base-300 w-full mt-16 px-8 py-12">
          <div className="flex justify-center items-center gap-12 flex-col md:flex-row">
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <ClipboardDocumentCheckIcon className="h-8 w-8 fill-secondary" />
              <p className="font-bold mt-3 mb-2">Create a Ballot</p>
              <p>Create a new ballot with custom proposals for your community to vote on.</p>
              <Link href="/create-ballot" passHref className="link mt-4 btn btn-sm btn-primary">
                Get Started
              </Link>
            </div>
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <UserGroupIcon className="h-8 w-8 fill-secondary" />
              <p className="font-bold mt-3 mb-2">View Active Ballots</p>
              <p>Browse and participate in ongoing ballots that need your vote.</p>
              <Link href="/ballots" passHref className="link mt-4 btn btn-sm btn-primary">
                View Ballots
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
