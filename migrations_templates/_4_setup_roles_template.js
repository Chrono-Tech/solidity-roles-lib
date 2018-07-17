"use strict"
const Roles2Library = artifacts.require("Roles2Library")
const UserContract = artifacts.require("Roles2LibraryAdapter") // TODO: should be any user's contract that uses Roles2LibraryAdapter as a base contract
const { basename, } = require("path")

module.exports = (deployer, network, accounts) => {
	deployer.then(async () => {
		const Roles = {
			ADMIN: 2,
			MODERATOR: 4,
			USER: 11,
		}

		const roles2Library = await Roles2Library.deployed()
		const userContract = await UserContract.deployed()

		// Setup public capability - open protected function for any call
		{
			const sig = userContract.contract.setRoles2Library.getData(0x0).slice(0, 10)
			await roles2Library.setPublicCapability(userContract.address, sig, true)
		}

		// Allow only defined role to call protected functions
		{
			{
				const sig = userContract.contract.setRoles2Library.getData(0x0).slice(0, 10)
				await roles2Library.addRoleCapability(Roles.ADMIN, userContract.address, sig)
			}
			{
				const sig = userContract.contract.setRoles2Library.getData(0x0).slice(0, 10)
				await roles2Library.addRoleCapability(Roles.MODERATOR, userContract.address, sig)
			}
		}

		// Add one more user to a role
		{
			await roles2Library.addUserRole(accounts[0], Roles.USER)
		}

		console.info("[MIGRATION] [" + parseInt(basename(__filename)) + "] System roles: #setup")
	})
}
