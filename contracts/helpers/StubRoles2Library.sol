pragma solidity ^0.4.18;


import "../Roles2LibraryAdapter.sol";


contract StubRoles2Library is Roles2LibraryInterface {

    uint constant OK = 1;

    bool public allowAllCall = true;

    function setAllCanCall(bool _enabled) public returns (uint) {
        allowAllCall = _enabled;
    }

    function addUserRole(address, uint8) public returns (uint) {
        return OK;
    }

    function canCall(address, address, bytes4) public view returns (bool) {
        return allowAllCall;
    }
}
