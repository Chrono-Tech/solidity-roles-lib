/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 */

pragma solidity ^0.4.18;


interface Roles2LibraryInterface {
    function addUserRole(address _user, uint8 _role) external returns (uint);
    function canCall(address _src, address _code, bytes4 _sig) external view returns (bool);
}


/// @title Base smart contract for those contracts that wants to be integrated into roles-based
/// system built on Roles2Library contract.
/// Provides internal variable to store roles2Library address and have protection modifier
/// which allows users to guard selected functions for role access.
contract Roles2LibraryAdapter {

    uint constant UNAUTHORIZED = 0;
    uint constant OK = 1;

    event AuthFailedError(address code, address sender, bytes4 sig);

    /// @dev Roles2Library address
    Roles2LibraryInterface internal roles2Library;

    /// @dev Guards selected method for role-only access.
    /// Emits AuthFailedError event.
    modifier auth {
        if (!_isAuthorized(msg.sender, msg.sig)) {
            emit AuthFailedError(this, msg.sender, msg.sig);
            return;
        }
        _;
    }

    constructor(address _roles2Library) public {
        require(_roles2Library != 0x0);
        roles2Library = Roles2LibraryInterface(_roles2Library);
    }

    /// @notice Updates link to roles2Library contract.
    /// Allowed only for authorized by roles2Library callers
    /// @param _roles2Library new instance of roles2Library contract
    /// @return result of an operation
    function setRoles2Library(Roles2LibraryInterface _roles2Library) 
    auth 
    external 
    returns (uint) 
    {
        roles2Library = _roles2Library;
        return OK;
    }

    function _isAuthorized(address _src, bytes4 _sig) 
    internal 
    view 
    returns (bool) 
    {
        if (_src == address(this)) {
            return true;
        }

        if (address(roles2Library) == 0x0) {
            return false;
        }

        return roles2Library.canCall(_src, this, _sig);
    }
}
