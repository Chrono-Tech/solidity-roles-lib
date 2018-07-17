# Roles smart contract library [![Build Status](https://travis-ci.org/ChronoBank/solidity-roles-lib.svg?branch=master)](https://travis-ci.org/ChronoBank/solidity-roles-lib) [![Coverage Status](https://coveralls.io/repos/github/ChronoBank/solidity-roles-lib/badge.svg?branch=master)](https://coveralls.io/github/ChronoBank/solidity-roles-lib?branch=master)

Part of [LaborX project](https://github.com/ChronoBank). Provides a couple of smart contracts to set up role-based access to system's contracts.

- **Roles2Library** - smart contract that is a foundation of roles-based system, organizes access to functions in secured way;
- **Roles2LibraryAdapter** - basic contract that is intended to store a reference to a roles2Library and contains protection modifier to guard functions for role-based access.

## Installation

Organized as npm package this smart contracts could be easily added to a project by

```bash
npm install -s solidity-roles-lib
```

## Usage

Right before you decided to use them add this library to package dependencies and import any contract according to this pattern, for example:

```javascript
import "solidity-shared-lib/contracts/Roles2Library.sol";
```

or

```javascript
import "solidity-shared-lib/contracts/Roles2LibraryAdapter.sol";
```

Cause you might want to use **Roles2Library** without any changes (if you want to then skip this paragraph), you will need to deploy this contract. But due to imperfection of **truffle** framework when you write in migration files `const Roles2Library = artifacts.require("Roles2Library")` this artifact will not be found. You have two options:
1. Inherit from _Roles2Library_ and **truffle** will automatically grap contract's artifact;
2. Create a solidity file, for example, **Imports.sol** and add an `import` statement of _Roles2Library_. (I would recommend this one because it will not produce one more contract name and looks more reasonable.)

## Details

Contracts that wants to adopt storage approach should do the following:

1. Define a contract that will inherit from **Roles2LibraryAdapter** contract and implement constructor:

```javascript
contract JobsController is Roles2LibraryAdapter {

	constructor(address _roles2Library) Roles2LibraryAdapter(_roles2Library) public {
		// TODO: initialization here
	}
	//...
}
```

3. Protect any of your functions with `auth` modifier to restrict an access to only authorized members:

```javascript
//...
function actionExample() external auth returns (uint) {
	//... 
}
//...
```

4. In your migrations or during contracts set up organize rules (roles) that should be able to access your protected functions. For more details look at **Roles2Library** documentation and migration templates.

```javascript
const Roles = {
	ADMIN: 2,
	MODERATOR: 4,
	USER: 11,
}

const jobController = await JobsController.deployed()
// Allow only defined role to call protected function
const sig = jobsController.contract.actionExample.getData().slice(0, 10)
await roles2Library.addRoleCapability(Roles.ADMIN, jobsController.address, sig)
//...

```

## Migrations

Migration templates are presented in `./migrations_templates` folder so you can use them as a scaffolding for your own configuration. Basic scenarios covered by migration templates are:

- deploying and initializing _Roles2Library_ contract;
- deploying user's smart contract which is inherited from _Roles2LibraryAdapter_ contract;
- setuping role rules for user's contract

---

For more information and use cases look at tests.