const Storage = artifacts.require('Storage')
const StubStorageManager = artifacts.require('StubStorageManager')
const Roles2Library = artifacts.require('Roles2Library')
const Mock = artifacts.require('Mock')

module.exports = function(deployer, network) {
	if (network === 'development') {
		deployer.then(async () => {
			await deployer.deploy(Storage)
			await deployer.deploy(StubStorageManager)
			await deployer.deploy(Mock)

			const storage = await Storage.deployed()
			await storage.setManager(StubStorageManager.address)

			await deployer.deploy(Roles2Library, Storage.address, "Roles2Library")
			const rolesLibrary = await Roles2Library.deployed()
			await rolesLibrary.setupEventsHistory(rolesLibrary.address)

			console.log("[MIGRATION] Test contracts: #done")
		})
	}
}
