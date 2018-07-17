"use strict"
const Storage = artifacts.require('Storage')
const Roles2Library = artifacts.require('Roles2Library')
const { basename, } = require("path")

module.exports = deployer => {
	deployer.then(async () => {
		await deployer.deploy(Roles2Library, Storage.address, "Roles2Library")

		console.info("[MIGRATION] [" + parseInt(basename(__filename)) + "] Roles Library: #deployed")
	})
}