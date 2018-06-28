const Storage = artifacts.require('Storage')
const StubStorageManager = artifacts.require('StubStorageManager')
const Roles2Library = artifacts.require('Roles2Library')

module.exports = function(deployer, network) {
    if (network === 'development') {
        deployer.then(async () => {
            await deployer.deploy(Storage)
            await deployer.deploy(StubStorageManager)

            const storage = await Storage.deployed()
            await storage.setManager(StubStorageManager.address)

            await deployer.deploy(Roles2Library, Storage.address, "Roles2Library")

            console.log("[MIGRATION] Test contracts: #done")
        })
    }
}
