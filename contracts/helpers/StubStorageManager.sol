pragma solidity ^0.4.23;


contract StubStorageManager {
    function isAllowed(address _actor, bytes32 _role) public view returns (bool) {
        return true;
    }
}
