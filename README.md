# Ballot Factory dApp

This decentralized application allows users to create and manage ballots on the Ethereum blockchain. The project consists of:

- Smart contracts built with Solidity
- Frontend interface built with Scaffold ETH 2 (Next.js)
- Backend API service built with NestJS

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Yarn](https://yarnpkg.com/) or [npm](https://www.npmjs.com/) package manager
- [Git](https://git-scm.com/)
- [MetaMask](https://metamask.io/) or any Ethereum wallet browser extension

## Project Structure

- `contracts/`: Solidity smart contracts
  - `Ballot.sol`: The core ballot contract
  - `BallotFactory.sol`: Factory contract for deploying multiple ballot instances
- `frontend/`: Scaffold ETH 2 frontend application
- `api/`: NestJS backend service
- `scripts/`: Deployment and testing scripts

## Setup and Installation

### Clone the Repository

```bash
git clone <repository-url>
cd ballot-factory-dapp
```

### Install Dependencies

1. Install root project dependencies:

```bash
npm install
# or
yarn install
```

2. Install frontend dependencies:

```bash
cd frontend
yarn install
# or
npm install
cd ..
```

3. Install API dependencies:

```bash
cd api
npm install
# or
yarn install
cd ..
```

## Running the Application

### 1. Start a Local Blockchain

```bash
npx hardhat node
# or
yarn hardhat node
```

This will start a local Ethereum node and deploy your contracts to it.

### 2. Deploy the Smart Contracts

In a new terminal:

```bash
npx hardhat run scripts/DeployBallotFactory.ts --network localhost
# or
yarn hardhat run scripts/DeployBallotFactory.ts --network localhost
```

### 3. Start the NestJS Backend

In a new terminal:

```bash
cd api
npm run start:dev
# or
yarn start:dev
```

The API will be available at http://localhost:3001

### 4. Start the Frontend

In a new terminal:

```bash
cd frontend/packages/nextjs
npm run dev
# or
yarn dev
```

The frontend will be available at http://localhost:3000

## Running Tests

### Smart Contract Tests

```bash
npx hardhat test
# or
yarn hardhat test
```

To run a specific test file:

```bash
npx hardhat test test/BallotFactory.test.ts
# or
yarn hardhat test test/BallotFactory.test.ts
```

## Interacting with the dApp

1. Connect your MetaMask wallet to the application
2. Create new ballots with customizable proposals
3. Vote on existing ballots
4. Delegate your votes (if allowed by the ballot)
5. View all active ballots and their results

## Contract Features

- Create customizable ballots with up to 5 proposals
- Set maximum votes per ballot
- Enable/disable vote delegation
- Track ballot status (active/inactive)
- View ballot results and statistics

## API Endpoints

The NestJS backend provides the following endpoints:

- `GET /ballots`: Get all ballots
- `GET /ballots/active`: Get all active ballots
- `GET /ballots/user/:address`: Get ballots created by a specific user
- `GET /ballots/:id`: Get details of a specific ballot

## Deployment to Live Networks

To deploy to a live network (like Sepolia testnet):

1. Add your private key to the environment:

```bash
export PRIVATE_KEY=your-private-key
```

2. Deploy the contracts:

```bash
npx hardhat run scripts/DeployBallotFactory.ts --network sepolia
# or
yarn hardhat run scripts/DeployBallotFactory.ts --network sepolia
```

## Troubleshooting

- If you encounter any issues with the frontend, try clearing your browser cache or refreshing the page
- For MetaMask connection issues, ensure your wallet is connected to the correct network
- Check the console logs for any error messages

## License

This project is licensed under the MIT License - see the LICENSE file for details.
