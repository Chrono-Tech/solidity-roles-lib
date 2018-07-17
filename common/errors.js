const errorScope = { roles: 20000, }

const errorCodes = {
	UNAUTHORIZED: 0,
	OK: 1,

	ROLES_ALREADY_EXISTS: errorScope.roles + 1,
	ROLES_INVALID_INVOCATION: errorScope.roles + 2,
	ROLES_NOT_FOUND: errorScope.roles + 3,
}

module.exports = errorCodes
