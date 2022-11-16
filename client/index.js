import Web3 from "web3";
import { openModal } from "./modal";
import configrations from "../build/contracts/Betting.json";

let account = "";
let hidden = 0;

let eventDetails = {
  eventId: 0,
  name: "",
  description: "",
  participants: [],
  startTime: 0,
  settlingTime: 0,
  endTime: 0,
  status: 0,
  winner: 0,
};

let eventStatus = {
  0: "ENDED",
  1: "ONGOING",
  2: "BETTING",
  3: "SETTLING",
  4: "SETTLED",
};

const web3 = new Web3(Web3.givenProvider || "http://127.0.0.1:7545");
const CONTRACT_ABI = configrations.abi;
const CONTRACT_ADDRESS = configrations.networks["5777"].address;
const contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);

function buildParticipantDiv(
  name,
  description,
  baseValue,
  betsPlaced,
  getElement = false
) {
  const participant = document.createElement("div");
  participant.id = `participant-${name}`;

  const participantDivs = `
  <div id="participant-name-${name}" class="text-cen">${name}</div>
  <br/>
  <div id="participant-description-${name}" class="text-cen">${description}</div>
  <br/>
  <div id="participant-base-value-${name}" class="text-cen">
      <p class="text t-no">Base Value</p>
      <p class="t-no">${baseValue}</p>
  </div>
  <br/>
  <div id="participant-bets-placed-${name}" class="text-cen">
      <p class="text t-no">Bets Placed</p>
      <p class="t-no">${betsPlaced}</p>
  </div>
  `;

  if (getElement) {
    participant.innerHtml = participantDivs;
    return participant;
  }
  return participantDivs;
}

function buildEventDivs(getElement = false) {
  const eventDetailsDiv = document.createElement("div");
  eventDetailsDiv.id = "event";

  if (eventDetails.name != "") {
    let winner = "";

    if (eventDetails.winner == 0) {
      winner = "Not Yet Declared";
    } else {
      winner = buildParticipantDiv(
        eventDetails.participants[eventDetails.winner - 1]?.name,
        eventDetails.participants[eventDetails.winner - 1]?.description,
        eventDetails.participants[eventDetails.winner - 1]?.baseValue,
        eventDetails.participants[eventDetails.winner - 1]?.betsPlaced,
        false
      );
    }

    eventDetailsDiv.innerHTML = `
    <div id="name" class="text-cen">${eventDetails.name}</div>
    <br/>
    <div id="description" class="text-cen">${eventDetails.description}</div>
    <br/>
    <div id="start-time" class="text-cen">
        <p class="text">Start Time</p>
        <p>${new Date(eventDetails.startTime * 1000).getDate()}</p>
    </div>
    <br/>
    <div id="end-time">
        <p class="text">End Time</p>
        <p>${
          eventDetails.endTime
            ? new Date(eventDetails.endTime * 1000).getDate()
            : "Not Yet Declared"
        }</p>
    </div>
    <br/>
    <div id="status">
        <p class="text">Status</p>
        <p>${eventStatus[eventDetails.status]}</p>
    </div>
    <br/>
    <div id="winner" >
        <p class="text">Winner</p>
        <p>${winner}</p>
    </div>
    `;
  } else {
    eventDetailsDiv.innerHTML = `<div class="text-cen">No Ongoing Event</div>`;
  }

  if (getElement) return eventDetailsDiv;

  return eventDetailsDiv.innerHTML;
}

async function refresh() {
  const Event = await contract.methods.getEventDetails().call({
    from: account,
  });

  eventDetails.eventId = Number.parseInt(Event.eventId);
  eventDetails.endTime = Number.parseInt(Event.endTime);
  eventDetails.startTime = Number.parseInt(Event.startTime);
  eventDetails.status = Number.parseInt(Event.status);
  eventDetails.winner = Number.parseInt(Event.winner);
  eventDetails.settlingTime = Number.parseInt(Event.settlingTime);
  eventDetails.name = Event.name;
  eventDetails.participants = Event.participants;
  eventDetails.description = Event.description;

  // console.log(eventDetails);
}

const addressHolder = document.getElementById("address");

const connectWalletButton = document.getElementById("connect-wallet");
const refreshButton = document.getElementById("refresh");
const eventDetailsBody = document.getElementById("event-details");
const placeBetButton = document.getElementById("place-bet");

function replaceEventDetails() {
  const nodes = eventDetailsBody.childNodes;

  // console.log(eventDetails.winner > 0 && eventDetails.participants.length > 0);

  for (let i = 0; i < nodes.length; i++) {
    eventDetailsBody.removeChild(nodes[i]);
  }

  const divs = buildEventDivs(true);

  eventDetailsBody.appendChild(divs);
}

connectWalletButton.addEventListener("click", async () => {
  try {
    const accounts = await web3.eth.requestAccounts();
    account = accounts[0];

    if (account != "") {
      addressHolder.textContent = account;
      connectWalletButton.parentElement.removeChild(connectWalletButton);
    }
  } catch (error) {
    addressHolder.textContent = "Some Error Occured Try Connecting Again";
  }
});

refreshButton.addEventListener("click", async () => {
  await refresh();
  replaceEventDetails();
});

placeBetButton.addEventListener("click", async () => {
  await refresh();
  replaceEventDetails();

  function getParticipantButtons() {
    let buttonDivs = "";

    for (let index in eventDetails.participants) {
      let participant = eventDetails.participants[index];
      buttonDivs += `
        <button id="bet-${participant.name}" class="btn simple bold">${participant.name}</button>
        `;
    }

    if (buttonDivs == "") buttonDivs = "No Participants";

    return buttonDivs;
  }

  openModal(
    "modal-place-bets",
    '<div class="text-cen bold">Place Bet</div>',
    getParticipantButtons(),
    ""
  );

  for (let index = 0; index < eventDetails.participants.length; index++) {
    let participant = eventDetails.participants[index];
    document
      .getElementById(`bet-${participant.name}`)
      .addEventListener("click", async () => {
        document.body.style.overflow = "hidden";
        hidden++;
        openModal(
          `modal-bet-${participant.name}`,
          `<div class="d-flex a-f-cen bold">${participant.name}</div>`,
          `
          <div class="d-flex a-f-cen f-col">
          ${buildParticipantDiv(...participant)}
          </div>
          `,
          `<div class="d-flex a-f-cen">
            <button id="bet-${participant.name}-button" class="btn simple bold">Bet</button>
          </div>`
        );

        document
          .getElementById(`bet-${participant.name}-button`)
          .addEventListener("click", () => {
            openModal(
              `modal-amount-${participant.name}`,
              `<div class="text-cen bold">Amount(WEI)</div>`,
              `
              <div class="d-flex a-f-cen f-col">
                <div class="input-holder">
                    <input id="amount-${participant.name}" class="input-field text-cen" 
                      min="${participant.baseValue}" type="number" 
                      placeholder="${participant.baseValue}" 
                      value="${participant.baseValue}"/>
                    <span class="focus-border"></span>
                </div>
              </div>
              `,
              `
                <div class="d-flex a-f-cen">
                  <button id="confirm-${participant.name}-bet" class="btn simple bold">Confirm</button>
                </div>
              `,
              true,
              async () => {
                let amount = document
                  .getElementById(`amount-${participant.name}`)
                  .value.toString();
                await contract.methods.placeBet(index).send({
                  from: account,
                  gas: 2383743,
                  value: amount,
                });
              }
            );
          });
      });
  }
});

async function main() {
  await refresh();
  replaceEventDetails();
}

main();
