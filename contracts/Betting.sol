// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

contract Betting {
    address payable private owner;
    uint256 private collected_betting_value = 0;
    uint256 private prize_pool = 0;
    uint256 private prize_pool_distribution = 0;
    uint256 private payable_prize = 0;

    enum Status {
        LOSS,
        WIN,
        PENDING
    }

    enum EventStatus {
        ENDED,
        ONGOING,
        BETTING,
        SETTLING,
        SETTLED,
        WAITING
    }

    struct Participant {
        string name;
        string description;
        uint256 baseValue;
        uint256 betsPlaced;
    }

    struct Gamble {
        uint256 amount;
        uint256 participantId;
        address payable gambler;
        Status status;
        bool claimed;
        bool resolved;
    }

    struct Bet {
        bool exists;
        uint256 eventId;
        uint256[] gambleIds;
    }

    struct Event {
        uint256 eventId;
        string name;
        string description;
        Participant[] participants;
        uint256 startTime;
        uint256 settlingTime;
        uint256 endTime;
        EventStatus status;
        uint256 winner;
    }

    mapping(address => Bet) public bets;

    Gamble[] private gambles;
    uint256 totalGambles = 0;

    Event[] public pastEvents;
    Event internal currentEvent;

    bool private resultDeclared = false;

    modifier expired() {
        require(
            currentEvent.status == EventStatus.BETTING,
            "No Longer Accepting Bets"
        );
        _;
    }

    modifier _restricted() {
        require(msg.sender == owner);
        _;
    }

    modifier ongoing() {
        require(currentEvent.status == EventStatus.ONGOING, "Event Ongoing");
        _;
    }

    modifier ended() {
        if (pastEvents.length > 0)
            if (currentEvent.status != EventStatus.WAITING) {
                require(
                    currentEvent.status == EventStatus.ENDED,
                    "Current Event has not Ended"
                );
            }
        _;
    }

    modifier settling() {
        require(
            currentEvent.status == EventStatus.SETTLING,
            "Current Event not in Settling Phase"
        );
        _;
    }

    modifier resultOut() {
        require(resultDeclared, "Results Not Yet Declared");
        _;
    }

    modifier isParticipant(uint256 participantId) {
        require(
            participantId < currentEvent.participants.length,
            "Invalid Participant or No Such Participant"
        );
        _;
    }

    constructor() {
        owner = payable(msg.sender);
    }

    function startEvent() public payable _restricted ongoing {
        currentEvent.status = EventStatus.ONGOING;
    }

    function checkAmount(uint256 amount, uint256 participantId)
        public
        view
        returns (bool)
    {
        return (currentEvent.participants[participantId].baseValue <= amount);
    }

    function getBetsTally() public view _restricted returns (uint256) {
        return collected_betting_value;
    }

    function getPayableAmount()
        public
        view
        _restricted
        resultOut
        returns (uint256)
    {
        return payable_prize;
    }

    function getPrizePool() public view _restricted settling returns (uint256) {
        return prize_pool;
    }

    function getParticipant(uint256 participantId)
        public
        view
        isParticipant(participantId)
        returns (Participant memory)
    {
        return currentEvent.participants[participantId];
    }

    function getParticipants() public view returns (Participant[] memory) {
        return currentEvent.participants;
    }

    function getBetsPlaced() public view returns (Bet memory) {
        Bet memory bet = bets[msg.sender];
        if (bet.eventId == currentEvent.eventId) return bets[msg.sender];
        return Bet(false, currentEvent.eventId, new uint256[](0));
    }

    function getGambleDetails(uint256 gambleId)
        public
        view
        returns (Gamble memory)
    {
        require(gambleId < totalGambles, "No Such Gamble Present");
        if (msg.sender != owner)
            require(gambles[gambleId].gambler == msg.sender, "Not Your Gamble");
        return gambles[gambleId];
    }

    function getEventDetails() public view returns (Event memory) {
        return currentEvent;
    }

    function setEvent(
        string memory name,
        string memory description,
        uint256 startTime,
        uint256 settlingTime
    ) public payable ended {
        if (bytes(currentEvent.name).length > 0) pastEvents.push(currentEvent);

        currentEvent.eventId = pastEvents.length;
        currentEvent.name = name;
        currentEvent.description = description;
        currentEvent.settlingTime = settlingTime;
        currentEvent.startTime = startTime + block.timestamp;
        currentEvent.endTime = 0;

        currentEvent.status = EventStatus.WAITING;
        currentEvent.winner = 0;

        totalGambles = 0;
    }

    function getTotalGambles()
        public
        view
        _restricted
        returns (Gamble[] memory)
    {
        Gamble[] memory memGambles = new Gamble[](totalGambles);
        for (uint256 i = 0; i < totalGambles; i++) {
            memGambles[i] = gambles[i];
        }
        return memGambles;
    }

    function getDeadline() public view settling returns (uint256) {
        return currentEvent.endTime + currentEvent.settlingTime;
    }

    function clearParticipants() public payable _restricted ended {
        delete currentEvent.participants;
    }

    function setParticipants(Participant[] memory participants)
        public
        payable
        _restricted
        ended
    {
        for (uint256 i = 0; i < participants.length; i++) {
            Participant memory participant = participants[i];
            require(
                bytes(participant.name).length != 0,
                "Name of a participant is Empty"
            );
            currentEvent.participants.push(participant);
        }
        currentEvent.status = EventStatus.BETTING;
    }

    function declareResults(uint256 winner)
        public
        payable
        _restricted
        ongoing
        isParticipant(winner - 1)
    {
        currentEvent.winner = winner;
        for (uint256 i = 0; i < totalGambles; i++) {
            if (gambles[i].participantId == (winner - 1)) {
                gambles[i].status = Status.WIN;
                payable_prize += gambles[i].amount;
            } else gambles[i].status = Status.LOSS;
        }
        resultDeclared = true;
    }

    function resolveGamble(uint256 gambleId, uint256 winnings)
        public
        payable
        _restricted
    {
        if (currentEvent.status == EventStatus.SETTLING) {
            uint256 time = block.timestamp;
            uint256 deadline = currentEvent.endTime + currentEvent.settlingTime;
            if (time >= deadline) currentEvent.status == EventStatus.SETTLED;
        }
        require(
            currentEvent.status == EventStatus.SETTLED,
            "Current Event not in Settled Phase"
        );
        require(
            gambles[gambleId].status == Status.WIN,
            "This is a Lost Gamble"
        );

        prize_pool_distribution += winnings;

        if (prize_pool_distribution <= prize_pool) winnings = 0;

        gambles[gambleId].resolved = true;
        gambles[gambleId].gambler.transfer(winnings + gambles[gambleId].amount);
    }

    function startSettlingEvent(uint256 share)
        public
        payable
        _restricted
        ongoing
        resultOut
    {
        require(
            share < (collected_betting_value - payable_prize),
            "Share too Large"
        );

        currentEvent.status = EventStatus.SETTLING;
        currentEvent.endTime = block.timestamp;

        prize_pool = collected_betting_value - payable_prize - share;
        owner.transfer(share);
    }

    function declareEventSettled()
        public
        payable
        _restricted
        settling
        returns (bool)
    {
        if (
            block.timestamp >=
            (currentEvent.endTime + currentEvent.settlingTime)
        ) {
            currentEvent.status = EventStatus.SETTLED;
            return true;
        }
        return false;
    }

    function claimWinnings() public payable settling {
        if (currentEvent.status == EventStatus.SETTLING) {
            uint256 time = block.timestamp;
            uint256 deadline = currentEvent.endTime + currentEvent.settlingTime;
            if (time >= deadline) {
                currentEvent.status == EventStatus.SETTLED;
                require(false, "Current Event not in Settling Phase");
            }
        }

        if (block.timestamp >= currentEvent.startTime)
            currentEvent.status = EventStatus.ONGOING;

        uint256[] storage gambleIds = bets[msg.sender].gambleIds;

        for (uint256 i = 0; i < gambleIds.length; i++) {
            uint256 gambleId = gambleIds[i];
            if (gambles[gambleId].status == Status.WIN)
                gambles[gambleId].claimed = true;
        }
    }

    function transferPendingPrize() public payable _restricted ended {
        require(prize_pool > 0, "Prize Pool is empty");
        owner.transfer(prize_pool);
    }

    function placeBet(uint256 participantId)
        public
        payable
        expired
        isParticipant(participantId)
    {
        if (block.timestamp >= currentEvent.startTime) {
            currentEvent.status = EventStatus.ONGOING;
            require(false, "No Longer Accepting Bets");
        }

        require(checkAmount(msg.value, participantId), "Amount Insufficient");

        uint256 gambleId = totalGambles;

        Gamble memory gamble = Gamble(
            msg.value,
            participantId,
            payable(msg.sender),
            Status.PENDING,
            false,
            false
        );

        Bet storage bet = bets[msg.sender];

        if (bet.eventId != currentEvent.eventId) {
            delete bet.gambleIds;
            bet.eventId = currentEvent.eventId;
        }

        bet.exists = true;
        bet.gambleIds.push(gambleId);

        if (gambles.length > totalGambles) gambles[totalGambles] = gamble;
        else gambles.push(gamble);
        totalGambles++;

        currentEvent.participants[participantId].betsPlaced += 1;
        collected_betting_value += msg.value;
    }

    function transferOwnership(address newOwner) public payable _restricted {
        owner = payable(newOwner);
    }

    function destroyContract() public payable _restricted ended {
        selfdestruct(owner);
    }
}
