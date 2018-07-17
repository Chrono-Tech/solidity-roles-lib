"use strict"
const Roles2Library = artifacts.require("Roles2Library")
const StorageManager = artifacts.require("StorageManager")
const { basename, } = require("path")

module.exports = (deployer, network, accounts) => {
	deployer.then(async () => {
		const storageManager = await StorageManager.deployed()
		const roles2Library = await Roles2Library.deployed()

		await storageManager.giveAccess(roles2Library.address, "Roles2Library")

		// const eventsHistory = roles2Library // EventsHistory or MultiEventsHistory. See solidity-eventshistory-lib
		// await roles2Library.setupEventsHistory(eventsHistory.address)

		// NOTE: authorize or reject storageManager in events history

		await roles2Library.setRootUser(accounts[0], true)

		console.info("[MIGRATION] [" + parseInt(basename(__filename)) + "] Roles2Library: #initialized")
	})
}
