// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract PrivatePayment {
    mapping(bytes32 => uint256) public commitments;
    address public verifier;
    address public owner;

    // Events for tracking commits and withdrawals
    event CommitmentMade(bytes32 indexed commitment, uint256 amount, address indexed sender);
    event WithdrawalPerformed(bytes32 indexed commitment, uint256 amount, address indexed receiver);

    // Modifier to restrict certain functions to the contract owner
    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    constructor(address _verifier) {
        verifier = _verifier;
        owner = msg.sender;
    }

    // Allow owner to update verifier (for flexibility)
    function setVerifier(address _newVerifier) external onlyOwner {
        verifier = _newVerifier;
    }

    function commit(bytes32 commitment, uint256 amount) external payable {
        require(msg.value == amount, "Incorrect amount");
        commitments[commitment] = amount;
        emit CommitmentMade(commitment, amount, msg.sender);
    }

    function withdraw(bytes calldata proof, bytes32 commitment, address receiver) external {
        require(commitments[commitment] > 0, "No such commitment");
        (bool success,) = verifier.call(abi.encodeWithSignature("verifyProof(bytes,bytes32)", proof, commitment));
        require(success, "Invalid proof");

        uint256 amount = commitments[commitment];
        payable(receiver).transfer(amount);
        delete commitments[commitment];
        emit WithdrawalPerformed(commitment, amount, receiver);
    }

    // Function to check contract balance (optional utility)
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
