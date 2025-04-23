"use client";

import { ChangeEvent, useRef, useState } from "react";
import Link from "next/link";
import { useAccount, useWriteContract } from "wagmi";
import { ArrowLeftIcon, ExclamationTriangleIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { getBallotCreationData, getWhitelistVotersData } from "~~/services/api/ballotApi";
import { notification } from "~~/utils/scaffold-eth";

const CreateBallot = () => {
  const { address: connectedAddress } = useAccount();
  const [ballotName, setBallotName] = useState<string>("");
  const [allowDelegation, setAllowDelegation] = useState<boolean>(false);
  const [maxVotes, setMaxVotes] = useState<string>("100");
  const [proposals, setProposals] = useState<string[]>([""]);
  const [whitelistedAddresses, setWhitelistedAddresses] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { writeContractAsync } = useWriteContract();

  const handleAddProposal = () => {
    if (proposals.length < 5) {
      setProposals([...proposals, ""]);
    }
  };

  const handleRemoveProposal = (index: number) => {
    const updatedProposals = [...proposals];
    updatedProposals.splice(index, 1);
    setProposals(updatedProposals);
  };

  const handleProposalChange = (index: number, value: string) => {
    const updatedProposals = [...proposals];
    updatedProposals[index] = value;
    setProposals(updatedProposals);
  };

  const handleCSVUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result;
      if (typeof text === "string") {
        const addresses = text
          .split(/[\n,]/)
          .map(addr => addr.trim())
          .filter(addr => addr.startsWith("0x") && addr.length === 42)
          .join(", ");

        setWhitelistedAddresses(addresses);
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ballotName.trim()) {
      notification.error("Please enter a ballot name");
      return;
    }

    if (proposals.some(proposal => !proposal.trim())) {
      notification.error("All proposals must have a name");
      return;
    }

    if (!connectedAddress) {
      notification.error("Wallet connection required to create a ballot");
      return;
    }

    try {
      setIsLoading(true);

      const validProposals = proposals.filter(p => p.trim() !== "");

      const payload = {
        proposalNames: validProposals,
        description: ballotName,
        maxVotes: parseInt(maxVotes),
        allowDelegation,
        ownerAddress: connectedAddress,
      };

      const contractData = await getBallotCreationData(payload);

      const txHash = await writeContractAsync({
        address: contractData.factoryAddress as `0x${string}`,
        abi: contractData.factoryInterface,
        functionName: "createBallot",
        args: [
          contractData.params.proposalNames,
          contractData.params.description,
          contractData.params.maxVotes,
          contractData.params.allowDelegation,
        ],
      });

      notification.success("Ballot creation transaction submitted!");
      notification.success("Ballot created! Please check your wallet for transaction confirmation.");

      setBallotName("");
      setProposals([""]);
      setAllowDelegation(false);
      setMaxVotes("100");
      setWhitelistedAddresses("");

      if (whitelistedAddresses.trim()) {
        notification.info(
          "Your ballot is being created. After it's confirmed, you'll need to submit another transaction to whitelist voters.",
        );
      }
    } catch (error) {
      console.error("Error creating ballot:", error);
      notification.error(error instanceof Error ? error.message : "Failed to create ballot");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center mb-8">
        <Link href="/" className="btn btn-ghost gap-1">
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </Link>
        <h1 className="text-3xl font-bold ml-4">Create Ballot</h1>
      </div>

      {connectedAddress ? (
        <div className="bg-base-100 shadow-xl rounded-xl p-8">
          <h2 className="text-2xl font-semibold mb-6">New Ballot Details</h2>

          <form onSubmit={handleSubmit} className="flex flex-col space-y-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text text-lg font-medium">Ballot Name</span>
              </label>
              <input
                type="text"
                placeholder="Enter ballot name"
                className="input input-bordered w-full"
                value={ballotName}
                onChange={e => setBallotName(e.target.value)}
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text text-lg font-medium">Proposals (Max 5)</span>
              </label>
              <div className="space-y-2">
                {proposals.map((proposal, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={`Proposal ${index + 1}`}
                      className="input input-bordered w-full"
                      value={proposal}
                      onChange={e => handleProposalChange(index, e.target.value)}
                      required
                    />
                    {proposals.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-square btn-sm btn-error"
                        onClick={() => handleRemoveProposal(index)}
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}
                {proposals.length < 5 && (
                  <button type="button" className="btn btn-outline btn-sm gap-2" onClick={handleAddProposal}>
                    <PlusIcon className="h-4 w-4" />
                    Add Proposal
                  </button>
                )}
              </div>
            </div>

            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-4">
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={allowDelegation}
                  onChange={e => setAllowDelegation(e.target.checked)}
                />
                <span className="label-text text-lg font-medium">Allow vote delegation</span>
              </label>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text text-lg font-medium">Maximum Number of Votes</span>
              </label>
              <div className="flex flex-wrap gap-3">
                {["10", "100", "1000", "5000"].map(option => (
                  <label key={option} className="cursor-pointer label justify-start gap-2">
                    <input
                      type="radio"
                      name="maxVotes"
                      value={option}
                      className="radio radio-primary"
                      checked={maxVotes === option}
                      onChange={() => setMaxVotes(option)}
                    />
                    <span className="label-text">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text text-lg font-medium">Whitelisted Addresses (Optional)</span>
              </label>
              <textarea
                placeholder="Enter Ethereum addresses separated by commas"
                className="textarea textarea-bordered h-32 rounded-md"
                value={whitelistedAddresses}
                onChange={e => setWhitelistedAddresses(e.target.value)}
              />
              <div className="mt-2">
                <input type="file" accept=".csv" ref={fileInputRef} onChange={handleCSVUpload} className="hidden" />
                <button type="button" className="btn btn-outline btn-sm" onClick={() => fileInputRef.current?.click()}>
                  Upload CSV
                </button>
                <span className="text-xs ml-2 text-base-content/70">Upload a CSV file with addresses to whitelist</span>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button type="submit" className={`btn btn-primary ${isLoading ? "loading" : ""}`} disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Ballot"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center bg-base-100 shadow-xl rounded-xl p-10 max-w-lg mx-auto">
          <ExclamationTriangleIcon className="h-12 w-12 text-warning mb-4" />
          <h2 className="text-2xl font-semibold text-center mb-4">Wallet Connection Required</h2>
          <p className="text-center mb-6">
            You need to connect your wallet to create a new ballot. Please connect your wallet using the button in the
            top right corner.
          </p>
          <Link href="/" className="btn btn-primary">
            Return to Home
          </Link>
        </div>
      )}
    </div>
  );
};

export default CreateBallot;
