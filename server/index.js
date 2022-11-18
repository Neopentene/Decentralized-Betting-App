import Web3 from "web3";
import configrations from "../build/contracts/Betting.json";

const web3 = new Web3(Web3.givenProvider || "http://127.0.0.1:7545");
const CONTRACT_ABI = configrations.abi;
const CONTRACT_ADDRESS = configrations.networks["5777"].address;
const contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);

async function setEvent(account) {
  await contract.methods
    .setEvent("Test Event", "Test Description", 432000, 360)
    .send({
      from: account,
      gas: 1282834,
    });

  console.log("Event Added");
}

async function setParticipants(account) {
  const Participants = [
    {
      id: 0,
      name: "First Participant",
      description: "Working",
      baseValue: 1000000,
      betsPlaced: 0,
    },
    {
      id: 1,
      name: "Second Participant",
      description: "Working",
      baseValue: 500000,
      betsPlaced: 0,
    },
  ];

  await contract.methods.setParticipants(Participants).send({
    from: account,
    gas: 672197,
  });

  console.log("Participants Added");
}

document
  .getElementById("connect-wallet")
  .addEventListener("click", async () => {
    const accounts = await web3.eth.requestAccounts();

    await contract.methods.clearParticipants().send({
      from: accounts[0],
      gas: 672197,
    });
    console.log("Participants Cleared");
    await setEvent(accounts[0]);
    await setParticipants(accounts[0]);

    console.log("Success");
  });
