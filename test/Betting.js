const Betting = artifacts.require("Betting");
const assert = require("assert");
const { error } = require("console");

contract("Betting", (accounts) => {
  const OWNER = accounts[0];
  let share = 0;
  // console.log(accounts);

  it("Clearing Participants", async () => {
    const instance = await Betting.deployed();
    await instance.clearParticipants({
      from: OWNER,
      gas: 672197,
      value: 0,
    });

    const Participants = await instance.getParticipants();
    // console.log("Participants:", Participants);
    // console.log("Length:", Participants?.length);

    assert.equal(Participants?.length, 0, "Length not zero");
  });

  it("Making an Event", async () => {
    const instance = await Betting.deployed();
    await instance.setEvent("Test Event", "Test Description", 60, 120, {
      from: OWNER,
      gas: 672197,
      value: 0,
    });

    const Event = await instance.getEventDetails();
    // console.log(Event);

    assert.equal(Event.name, "Test Event", "Name mismatched");
  });

  it("Adding Participants", async () => {
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

    const instance = await Betting.deployed();
    await instance.setParticipants(Participants, {
      from: OWNER,
      gas: 672197,
      value: 0,
    });

    const ParticipantsAdded = await instance.getParticipants();
    // console.log("Participants:", ParticipantsAdded);

    assert.equal(
      ParticipantsAdded[0]?.name,
      Participants[0].name,
      "Participants don't match"
    );
  });

  it("Getting Event", async () => {
    const instance = await Betting.deployed();
    const Event = await instance.getEventDetails();

    // console.log("Event:", Event);

    assert(Event?.name, "Test Event", "Name mismatched");
  });

  it("Getting Participants", async () => {
    const instance = await Betting.deployed();
    const Participants = await instance.getParticipants({
      from: OWNER,
      gas: 672197,
      value: 0,
    });

    // console.log("Participants:", Participants);

    assert(Participants?.length, 2, "Participants Don't Match");
  });

  it("Adding Bets", async () => {
    let instance = await Betting.deployed();
    // console.log(instance.methods);

    await instance.placeBet(1, {
      from: accounts[0],
      gas: 672197,
      value: 10000000,
    });

    await instance.placeBet(0, {
      from: accounts[2],
      gas: 672197,
      value: 10000000,
    });

    await instance.placeBet(1, {
      from: accounts[2],
      gas: 672197,
      value: 10000000,
    });

    await instance.placeBet(1, {
      from: accounts[1],
      gas: 672197,
      value: 1000000,
    });

    // console.log("Bets Added");
  });

  it("Getting Gamble Details", async () => {
    const instance = await Betting.deployed();
    const gamble = await instance.getGambleDetails(1, {
      from: accounts[0],
      gas: 89218,
    });

    // console.log("Gamble:", gamble);
    assert(gamble.gambler, accounts[1], "Gamble does not match");
  });

  it("Getting all Bets of one Gambler", async () => {
    const instance = await Betting.deployed();
    const bet = await instance.getBetsPlaced({
      from: accounts[2],
      gas: 672197,
      value: 0,
    });

    // console.log(bet);
  });

  it("Forcibly Starting Event", async () => {
    const instance = await Betting.deployed();
    await instance.forciblyStartEvent({
      from: accounts[0],
      gas: 672197,
      value: 0,
    });
  });

  it("Checking Forcibly Started Event", async () => {
    const instance = await Betting.deployed();
    const Event = await instance.getEventDetails();
    // console.log(Event);

    assert(Event.status, "1", "Event did not Start");
  });

  it("Start Settling Event", async () => {
    const instance = await Betting.deployed();
    await instance.declareResults(1, {
      from: OWNER,
      gas: 672197,
    });

    const totalBettingValue = BigInt(await instance.getBetsTally());
    const payableAmount = BigInt(await instance.getPayableAmount());

    share = BigInt(totalBettingValue - payableAmount);
    share = (40n * share) / 100n;

    console.log("Before Share Transfer", await web3.eth.getBalance(OWNER));

    await instance.startSettlingEvent(share, {
      from: accounts[0],
      gas: 672197,
      value: 0,
    });

    console.log("After Share Transfer", await web3.eth.getBalance(OWNER));

    // console.log("totalBettingValue:", totalBettingValue);
    // console.log("payableAmount:", payableAmount);

    // console.log("share:", share);
  });

  it("Check Settling Event", async () => {
    const instance = await Betting.deployed();
    const Event = await instance.getEventDetails();
    // console.log(Event);

    assert(Event.status == "3", true, "Event Settling did not start");
  });

  it("Get the list of gambles", async () => {
    const instance = await Betting.deployed();
    const gambles = await instance.getTotalGambles({
      from: OWNER,
    });
    // console.log(gambles);

    assert(gambles[1].status == "1", true, "Gamble Results did not match");
  });

  it("Claim the gamble", async () => {
    const instance = await Betting.deployed();
    await instance.claimWinnings({
      from: accounts[2],
    });

    const gamble = await instance.getGambleDetails(1, {
      from: OWNER,
    });
    // console.log(gamble);

    assert(gamble.claimed, true, "Gamble was not claimed");
  });

  it("Waiting and Triggering Settle Event", async () => {
    const instance = await Betting.deployed();
    console.log("Waiting for 150000 millis");
    await new Promise((exe) => setTimeout(exe, 150000));
    let result = false;
    try {
      result = await instance.declareEventSettled({
        from: OWNER,
        gas: 672197,
      });

      if (!result) {
        throw error;
      }
    } catch (error) {
      console.log("Waiting for another 150000 millis");
      await new Promise((exe) => setTimeout(exe, 150000));
      result = await instance.declareEventSettled({
        from: OWNER,
        gas: 672197,
      });
    }

    const Event = await instance.getEventDetails();

    assert(Event.status == "4" && result, true, "Gamble was not claimed");
  });

  it("Resolve Winnings", async () => {
    const instance = await Betting.deployed();

    const gambles = await instance.getTotalGambles({
      from: OWNER,
    });

    const Event = await instance.getEventDetails();
    const winnerId = Number.parseInt(Event.winner);

    const betsPlaced = BigInt(Event.participants[winnerId - 1].betsPlaced);
    const totalBets = BigInt(gambles.length);

    for (let index in gambles) {
      const gamble = gambles[index];
      console.log(`Index ${index}:`, gamble.status == "1");

      if (gamble.status == "1" && gamble.claimed) {
        console.log(
          "Before Winning:",
          await web3.eth.getBalance(gamble.gambler)
        );

        let winnings = BigInt(gamble.amount);
        winnings = winnings - (winnings * betsPlaced) / totalBets;

        await instance.resolveGamble(index, winnings, {
          from: OWNER,
          gas: 98238,
        });

        console.log(
          "After Winning:",
          await web3.eth.getBalance(gamble.gambler)
        );
      }
    }

    assert(gambles[1].status == "1", true, "Gamble Results did not match");
  });
});
