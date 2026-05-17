// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title BAZA ($BAZA) — Base Sepolia token with 7-day streak check-ins
/// @notice Days 1–6 mint 10 $BAZA each; day 7 mints 20 $BAZA. Streak resets to 1 if more than 48 hours pass since last check-in.
contract BazaToken {
    string public constant name = "Baza";
    string public constant symbol = "BAZA";
    uint8 public constant decimals = 18;

    uint256 public constant DAILY_REWARD = 10 ether;
    uint256 private constant SEVENTH_DAY_REWARD = 20 ether;
    uint256 private constant STREAK_GRACE_PERIOD = 48 hours;
    uint256 public constant MIN_CHECKIN_INTERVAL = 24 hours;

    uint256 public totalSupply;
    mapping(address account => uint256) public balanceOf;
    mapping(address owner => mapping(address spender => uint256)) public allowance;

    mapping(address account => uint256) public currentStreak;
    mapping(address account => uint256) public lastCheckIn;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event CheckedIn(address indexed user, uint256 streak, uint256 mintedAmount);
    event TokensClaimed(address indexed user, uint256 amount);

    error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed);
    error ERC20InvalidApprover(address approver);
    error ERC20InvalidSpender(address spender);

    function _mint(address to, uint256 value) internal {
        if (to == address(0)) revert ERC20InvalidApprover(to);
        totalSupply += value;
        unchecked {
            balanceOf[to] += value;
        }
        emit Transfer(address(0), to, value);
    }

    function transfer(address to, uint256 value) public returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) public returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) public returns (bool) {
        address spender = msg.sender;
        uint256 currentAllowance = allowance[from][spender];
        if (currentAllowance != type(uint256).max) {
            if (currentAllowance < value) {
                revert ERC20InsufficientBalance(spender, currentAllowance, value);
            }
            unchecked {
                allowance[from][spender] = currentAllowance - value;
            }
        }
        _transfer(from, to, value);
        return true;
    }

    function _transfer(address from, address to, uint256 value) internal {
        if (to == address(0)) revert ERC20InvalidApprover(to);
        uint256 fromBalance = balanceOf[from];
        if (fromBalance < value) {
            revert ERC20InsufficientBalance(from, fromBalance, value);
        }
        unchecked {
            balanceOf[from] = fromBalance - value;
            balanceOf[to] += value;
        }
        emit Transfer(from, to, value);
    }

    /// @notice Mint off-chain game progress: `amount` is treated as whole $BAZA units (18 decimals each).
    function claimTokens(uint256 amount) external {
        require(amount > 0, "amount");
        uint256 minted = amount * (10 ** uint256(decimals));
        _mint(msg.sender, minted);
        emit TokensClaimed(msg.sender, minted);
    }

    /// @notice At least 24 hours between check-ins. Streak continues if last check-in was at most 48 hours ago, otherwise streak becomes 1.
    ///         Reward follows a 7-day cycle: positions 1–6 → 10 $BAZA, position 7 → 20 $BAZA (then repeats).
    function dailyCheckIn() external {
        address user = msg.sender;
        uint256 last = lastCheckIn[user];
        if (last != 0) {
            require(block.timestamp - last >= MIN_CHECKIN_INTERVAL, "wait 24h");
        }

        uint256 streak;
        if (last == 0) {
            streak = 1;
        } else if (block.timestamp - last <= STREAK_GRACE_PERIOD) {
            streak = currentStreak[user] + 1;
        } else {
            streak = 1;
        }

        uint256 dayInCycle = ((streak - 1) % 7) + 1;
        uint256 reward = dayInCycle == 7 ? SEVENTH_DAY_REWARD : DAILY_REWARD;

        lastCheckIn[user] = block.timestamp;
        currentStreak[user] = streak;

        _mint(user, reward);
        emit CheckedIn(user, streak, reward);
    }
}
