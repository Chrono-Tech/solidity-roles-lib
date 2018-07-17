/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 */

pragma solidity ^0.4.21;


import "solidity-storage-lib/contracts/StorageAdapter.sol";
import "solidity-shared-lib/contracts/Owned.sol";
import "solidity-eventshistory-lib/contracts/MultiEventsHistoryAdapter.sol";


/// @title Core of role-based system which controlles access to functions according to
/// set up rules and granted rights. It usually be injected into constructor to get rid
/// of unnecessary security overcomplications.
/// This contract organizes a system around two areas: protection core (Roles2Library)
/// which keeps all the rules and checks if callers fulfill those rules, and other contracts
/// that adopt this approach, for example, inheriting from Roles2LibraryAdapter, and setting
/// roles2Library contract inside their guts, after that they could protect any method with
/// appropriate modifier.
/// There are three main functions: manage roles and set of users that belong to that roles
/// (methods addUserRole, removeUserRole), provide different access levels for specific roles 
/// (methods setRolesCapabilities, addRolesCapabilities, removeRolesCapabilities), open protected
/// methods for a public access (method setPublicCapability).
/// This contract adopts storage upgradability approach so it could be easily updated.
contract Roles2Library is StorageAdapter, Owned, MultiEventsHistoryAdapter {

    uint constant OK = 1;

    uint constant ROLES_SCOPE = 20000;
    uint constant ROLES_ALREADY_EXISTS = ROLES_SCOPE + 1;
    uint constant ROLES_INVALID_INVOCATION = ROLES_SCOPE + 2;
    uint constant ROLES_NOT_FOUND = ROLES_SCOPE + 3;

    event RoleAdded(address indexed self, address indexed user, uint8 indexed role);
    event RoleRemoved(address indexed self, address indexed user, uint8 indexed role);
    event CapabilityAdded(address indexed self, address indexed code, bytes4 sig, uint8 indexed role);
    event CapabilityRemoved(address indexed self, address indexed code, bytes4 sig, uint8 indexed role);
    event PublicCapabilityAdded(address indexed self, address indexed code, bytes4 sig);
    event PublicCapabilityRemoved(address indexed self, address indexed code, bytes4 sig);

    /// @dev Mapping (user => isRoot)
    StorageInterface.AddressBoolMapping internal rootUsers;
    /// @dev Mapping (user => roles bit mask)
    StorageInterface.AddressBytes32Mapping internal userRoles;
    /// @dev Mapping (contract => sig => roles bit mask)
    StorageInterface.AddressBytes4Bytes32Mapping internal capabilityRoles;
    /// @dev Mapping (contract => sig => isPubliclyAvailable)
    StorageInterface.AddressBytes4BoolMapping internal publicCapabilities;

    /// @dev Guards access to functions for only those who can call or contract owner
    modifier authorized {
        if (msg.sender != contractOwner 
            && !canCall(msg.sender, this, msg.sig)
        ) {
            return;
        }
        _;
    }

    constructor(Storage _store, bytes32 _crate) StorageAdapter(_store, _crate) public {
        rootUsers.init("rootUsers");
        userRoles.init("userRoles");
        capabilityRoles.init("capabilityRoles");
        publicCapabilities.init("publicCapabilities");
    }

    /// @notice Checks if provided use can call function with signature in passed contract.
    /// Root user is always allowed to call any protected function.
    /// @param _user caller
    /// @param _code contract address
    /// @param _sig function signature
    /// @return true if a call is allowed, false otherwise
    function canCall(
        address _user, 
        address _code, 
        bytes4 _sig
    ) 
    public 
    view 
    returns (bool) 
    {
        if (isUserRoot(_user) || isCapabilityPublic(_code, _sig)) {
            return true;
        }
        return bytes32(0) != getUserRoles(_user) & getCapabilityRoles(_code, _sig);
    }

    /// @notice Sets events history contract as an emitter of every future events
    /// Only contract owner could call this function.
    /// @param _eventsHistory events history address
    /// @return result of an operation
    function setupEventsHistory(address _eventsHistory) 
    onlyContractOwner 
    external 
    returns (uint) 
    {
        _setEventsHistory(_eventsHistory);
        return OK;        
    }

    /// @notice Gets roles of a user
    /// @return bit mask of user roles
    function getUserRoles(address _user) 
    public 
    view 
    returns (bytes32) 
    {
        return store.get(userRoles, _user);
    }

    /// @notice Checks if user is a root user
    /// @return true if user is root, false otherwise
    function isUserRoot(address _user) 
    public 
    view 
    returns (bool) 
    {
        return store.get(rootUsers, _user);
    }

    /// @notice Checks if a user has provided role
    /// @param _user user address
    /// @param _role role identifier
    /// @return true if user has this role, false otherwise
    function hasUserRole(address _user, uint8 _role) 
    public 
    view 
    returns (bool) 
    {
        return bytes32(0) != (getUserRoles(_user) & _shift(_role));
    }

    /// @notice Gets associated roles that are allowed to call provided method in provided contract
    /// @param _code contract address
    /// @param _sig method signature that is protected
    /// @return bit mask of roles
    function getCapabilityRoles(
        address _code, 
        bytes4 _sig
    ) 
    public 
    view 
    returns (bytes32) 
    {
        return store.get(capabilityRoles, _code, _sig);
    }

    /// @notice Checks if provided method in a contract is publicly available
    /// @param _code contract address
    /// @param _sig method signature that is protected
    /// @return true if it is publicly open, false otherwise
    function isCapabilityPublic(
        address _code, 
        bytes4 _sig
    ) 
    public 
    view 
    returns (bool) 
    {
        return store.get(publicCapabilities, _code, _sig);
    }

    /// @notice Sets up user as a root or take away this ability.
    /// Only contract owner could call this function.
    /// @param _user user address whose rights is changing
    /// @param _enabled if true is passed then user becomes root user, otherwise this right is taken away
    /// @return result of an operation
    function setRootUser(
        address _user, 
        bool _enabled
    ) 
    onlyContractOwner 
    external 
    returns (uint) 
    {
        store.set(rootUsers, _user, _enabled);
        return OK;
    }

    /// @notice Adds provided user to a role layer.
    /// Only authorized callers could invoke this function.
    /// Emits RoleAdded event.
    /// @param _user user address
    /// @param _role role identifier, used in methods protection
    /// @return result of an operation
    function addUserRole(
        address _user, 
        uint8 _role
    ) 
    authorized 
    external 
    returns (uint) 
    {
        if (hasUserRole(_user, _role)) {
            return _emitErrorCode(ROLES_ALREADY_EXISTS);
        }

        return _setUserRole(_user, _role, true);
    }

    /// @notice Removes provided user from roles layer. After that user will not
    /// be able to access functions that are allowed for this role.
    /// Only authorized callers could invoke this function.
    /// Emits RoleRemoved event.
    /// @param _user user address
    /// @param _role role identifier
    /// @return result of an operation
    function removeUserRole(
        address _user, 
        uint8 _role
    ) 
    authorized 
    external 
    returns (uint) 
    {
        if (!hasUserRole(_user, _role)) {
            return _emitErrorCode(ROLES_NOT_FOUND);
        }

        return _setUserRole(_user, _role, false);
    }

    /// @notice Opens protected function to be publicly available. Only for provided contract,
    /// not a family of contracts
    /// Only contract owner could call this function.
    /// Emits PublicCapabilityAdded and PublicCapabilityRemoved events.
    /// @param _code contract address
    /// @param _sig method signature that will be opened
    /// @param _enabled if true then opens up access to a function, closes otherwise
    /// @return result of an operation
    function setPublicCapability(
        address _code, 
        bytes4 _sig, 
        bool _enabled
    ) 
    onlyContractOwner 
    external 
    returns (uint) 
    {
        store.set(publicCapabilities, _code, _sig, _enabled);

        if (_enabled) {
            _getEmitter().emitPublicCapabilityAdded(_code, _sig);
        } else {
            _getEmitter().emitPublicCapabilityRemoved(_code, _sig);
        }
        return OK;
    }

    /// @notice Adds role as able to call passed method in provided contract.
    /// All users associated with this role will receive a possibility to call
    /// this method.
    /// Only contract owner could call this function.
    /// Emits CapabilityAdded event.
    /// @param _role role identifier
    /// @param _code contract address
    /// @param _sig protected function signature
    /// @return result of an operation
    function addRoleCapability(
        uint8 _role, 
        address _code, 
        bytes4 _sig
    ) 
    onlyContractOwner 
    public 
    returns (uint) 
    {
        return _setRoleCapability(_role, _code, _sig, true);
    }

    /// @notice Removes role from contract's allowed roles and take away
    /// a possibility from user to call this function.
    /// Only contract owner could call this function.
    /// Emits CapabilityRemoved event.
    /// @param _role role identifier
    /// @param _code contract address
    /// @param _sig protected function signature
    /// @return result of an operation
    function removeRoleCapability(
        uint8 _role, 
        address _code, 
        bytes4 _sig
    ) 
    onlyContractOwner 
    public 
    returns (uint) 
    {
        if (getCapabilityRoles(_code, _sig) == 0) {
            return _emitErrorCode(ROLES_NOT_FOUND);
        }

        return _setRoleCapability(_role, _code, _sig, false);
    }

    /* EVENTS EMITTING (for events history) */

    function emitRoleAdded(address _user, uint8 _role) public {
        emit RoleAdded(_self(), _user, _role);
    }

    function emitRoleRemoved(address _user, uint8 _role) public {
        emit RoleRemoved(_self(), _user, _role);
    }

    function emitCapabilityAdded(address _code, bytes4 _sig, uint8 _role) public {
        emit CapabilityAdded(_self(), _code, _sig, _role);
    }

    function emitCapabilityRemoved(address _code, bytes4 _sig, uint8 _role) public {
        emit CapabilityRemoved(_self(), _code, _sig, _role);
    }

    function emitPublicCapabilityAdded(address _code, bytes4 _sig) public {
        emit PublicCapabilityAdded(_self(), _code, _sig);
    }

    function emitPublicCapabilityRemoved(address _code, bytes4 _sig) public {
        emit PublicCapabilityRemoved(_self(), _code, _sig);
    }

    /* INTERNAL */

    function _setUserRole(
        address _user, 
        uint8 _role, 
        bool _enabled
    ) 
    internal 
    returns (uint) 
    {
        bytes32 lastRoles = getUserRoles(_user);
        bytes32 shifted = _shift(_role);

        if (_enabled) {
            store.set(userRoles, _user, lastRoles | shifted);
            _getEmitter().emitRoleAdded(_user, _role);
            return OK;
        }

        store.set(userRoles, _user, lastRoles & _bitNot(shifted));
        _getEmitter().emitRoleRemoved(_user, _role);
        return OK;
    }

    function _setRoleCapability(
        uint8 _role, 
        address _code, 
        bytes4 _sig, 
        bool _enabled
    ) 
    internal 
    returns (uint) 
    {
        bytes32 lastRoles = getCapabilityRoles(_code, _sig);
        bytes32 shifted = _shift(_role);

        if (_enabled) {
            store.set(capabilityRoles, _code, _sig, lastRoles | shifted);
            _getEmitter().emitCapabilityAdded(_code, _sig, _role);
        } else {
            store.set(capabilityRoles, _code, _sig, lastRoles & _bitNot(shifted));
            _getEmitter().emitCapabilityRemoved(_code, _sig, _role);
        }

        return OK;
    }

    function _shift(uint8 _role) private pure returns (bytes32) {
        return bytes32(uint(uint(2) ** uint(_role)));
    }

    function _bitNot(bytes32 _input) private pure returns (bytes32) {
        return (_input ^ bytes32(uint(-1)));
    }

    function _getEmitter() private view returns (Roles2Library) {
        return Roles2Library(getEventsHistory());
    }
}
