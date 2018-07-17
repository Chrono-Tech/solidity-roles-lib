"use strict"
const Roles2Library = artifacts.require("Roles2Library")
const StorageManager = artifacts.require("StorageManager")
const UserContract = artifacts.require("Roles2LibraryAdapter") // TODO: should be any user's contract that uses Roles2LibraryAdapter as a base contract
const { basename, } = require("path")

module.exports = deployer => {
	deployer.then(async () => {
		const roles2Library = await Roles2Library.deployed()

		await deployer.deploy(UserContract, roles2Library.address)

		// NOTE: if needed set up events history
		// const userContract = await UserContract.deployed()
		// const eventsHistory = userContract // EventsHistory or MultiEventsHistory. See solidity-eventshistory-lib
		// await storageManager.setupEventsHistory(eventsHistory.address)

		// NOTE: if needed provide storage access rights
		// const storageManager = await StorageManager.deployed()
		// await storageManager.giveAccess(UserContract.address, "UserContract") // NOTE: provides write access to a userContract into a storage if needed
		// await storageManager.blockAccess(UserContract.address, "UserContract") // NOTE: denies write access to a userContract into a storage if needed

		console.info("[MIGRATION] [" + parseInt(basename(__filename)) + "] UserContract: #deployed #initialized")
	})
}
