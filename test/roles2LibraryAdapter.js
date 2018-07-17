const Mock = artifacts.require('Mock')
const StubRoles2LibraryAdapter = artifacts.require('StubRoles2LibraryAdapter')
const StubRoles2Library = artifacts.require('StubRoles2Library')

const Reverter = require('./helpers/reverter')
const ErrorsScope = require('../common/errors')
const eventsHelper = require('./helpers/eventsHelper')

contract('Roles2LibraryAdapter', accounts => {
	const reverter = new Reverter(web3)

	const users = {
		contractOwner: accounts[0],
		user1: accounts[1],
		user2: accounts[2],
	}

	const contracts = {
		mock: null,
		testRoles2Library: null,
		testRolesAdapter: null,
	}

	let snapshotId

	const assertExpectations = async (expected = 0, callsCount = null) => {
		assert.equal(
			(await contracts.mock.expectationsLeft()).toString(16),
			expected.toString(16)
		)

		const expectationsCount = await contracts.mock.expectationsCount()
		assert.equal(
			(await contracts.mock.callsCount()).toString(16),
			callsCount === null ? expectationsCount.toString(16) : callsCount.toString(16)
		)
	}

	before(async () => {
		await reverter.promisifySnapshot()
		snapshotId = reverter.snapshotId

		contracts.mock = await Mock.deployed()
		contracts.testRoles2Library = await StubRoles2Library.new({ from: users.contractOwner, })
		contracts.testRolesAdapter = await StubRoles2LibraryAdapter.new(contracts.testRoles2Library.address, { from: users.contractOwner, })

		await reverter.promisifySnapshot()
	})

	after(async () => {
		await reverter.promisifyRevert(snapshotId)
	})

	context("adapter", () => {

		describe("with different roles2Library canCall allowance", () => {

			beforeEach(async () => {
				await contracts.testRolesAdapter.setRoles2Library(contracts.mock.address, { from: users.contractOwner, })
			})

			afterEach(async () => {
				await reverter.promisifyRevert()
			})

			it("should protect with auth", async () => {
				const caller = users.user1

				await contracts.mock.expect(
					contracts.testRolesAdapter.address,
					0,
					contracts.testRoles2Library.contract.canCall.getData(caller, contracts.testRolesAdapter.address, contracts.testRolesAdapter.contract.setRoles2Library.getData(0x0).slice(0, 10)),
					await contracts.mock.convertUIntToBytes32(1) // true
				)

				assert.equal(
					(await contracts.testRolesAdapter.setRoles2Library.call(0x0, { from: caller, })).toNumber(),
					ErrorsScope.OK
				)
				const tx = await contracts.testRolesAdapter.setRoles2Library(0x0, { from: caller, })
				{
					const event = (await eventsHelper.findEvent([contracts.testRolesAdapter,], tx, "AuthFailedError"))[0]
					assert.isUndefined(event)
				}
				await assertExpectations()
			})

			it("should NOT allow for not allowed caller with UNAUTHORIZED code", async () => {
				const allowedCaller = users.user1
				const notAllowedCaller = users.user2
				const callSig = contracts.testRolesAdapter.contract.setRoles2Library.getData(0x0).slice(0, 10)

				await contracts.mock.expect(
					contracts.testRolesAdapter.address,
					0,
					contracts.testRoles2Library.contract.canCall.getData(allowedCaller, contracts.testRolesAdapter.address, callSig),
					0 // false
				)
				assert.equal(
					(await contracts.testRolesAdapter.setRoles2Library.call(0x0, { from: notAllowedCaller, })).toNumber(),
					ErrorsScope.UNAUTHORIZED
				)

				const tx = await contracts.testRolesAdapter.setRoles2Library(0x0, { from: notAllowedCaller, })
				{
					const event = (await eventsHelper.findEvent([contracts.testRolesAdapter,], tx, "AuthFailedError"))[0]
					assert.isDefined(event)
					assert.equal(event.args.code, contracts.testRolesAdapter.address)
					assert.equal(event.args.sender, notAllowedCaller)
					assert.equal(event.args.sig, callSig)
				}
				await assertExpectations(1, 1)
			})
		})


		describe("when roles2Library equal 0x0", () => {
			const caller = users.user1

			beforeEach(async () => {
				await contracts.testRolesAdapter.setRoles2Library(0x0, { from: caller, })
			})

			afterEach(async () => {
				await reverter.promisifyRevert()
			})

			it("should NOT allow to call protected functions", async () => {
				assert.equal(
					(await contracts.testRolesAdapter.setRoles2Library.call(contracts.mock.address, { from: caller, })).toNumber(),
					ErrorsScope.UNAUTHORIZED
				)
				const tx = await contracts.testRolesAdapter.setRoles2Library(contracts.mock.address, { from: caller, })
				{
					const event = (await eventsHelper.findEvent([contracts.testRolesAdapter,], tx, "AuthFailedError"))[0]
					assert.isDefined(event)
					assert.equal(event.args.sender, caller)
				}
			})
		})

		describe("when call from inside a contract", () => {
			const expectedReturn = 256
			const caller = users.user1
			const onlyTest1Caller = users.user2

			describe("for 'getTest1' method", () => {
				let callSig

				beforeEach(async () => {
					await contracts.testRolesAdapter.setRoles2Library(contracts.mock.address, { from: users.contractOwner, })

					callSig = contracts.testRolesAdapter.contract.getTest1.getData().slice(0, 10)
					await contracts.mock.expect(
						contracts.testRolesAdapter.address,
						0,
						contracts.testRoles2Library.contract.canCall.getData(onlyTest1Caller, contracts.testRolesAdapter.address, callSig),
						await contracts.mock.convertUIntToBytes32(1) // true
					)
				})

				afterEach(async () => {
					await reverter.promisifyRevert()
				})

				it(`should allow to permitted caller with return ${expectedReturn.toString(16)} value`, async () => {
					assert.equal(
						(await contracts.testRolesAdapter.getTest1.call({ from: onlyTest1Caller, })).toString(16),
						expectedReturn.toString(16)
					)
					await contracts.testRolesAdapter.getTest1({ from: onlyTest1Caller, })
					await assertExpectations()
				})

				it(`should NOT be allowed to not permitted caller with UNAUTHORIZED code`, async () => {
					assert.equal(
						(await contracts.testRolesAdapter.getTest1.call({ from: caller, })).toString(16),
						'0'
					)

					const tx = await contracts.testRolesAdapter.getTest1({ from: caller, })
					{
						const event = (await eventsHelper.findEvent([contracts.testRolesAdapter,], tx, "AuthFailedError"))[0]
						assert.isDefined(event)
						assert.equal(event.args.code, contracts.testRolesAdapter.address)
						assert.equal(event.args.sender, caller)
						assert.equal(event.args.sig, callSig)
					}
				})
			})

			describe("for 'getProtectedTest1 method", () => {
				let callSig
				beforeEach(async () => {
					await contracts.testRolesAdapter.setRoles2Library(contracts.mock.address, { from: users.contractOwner, })

					{
						callSig = contracts.testRolesAdapter.contract.getProtectedTest1.getData().slice(0, 10)
						await contracts.mock.expect(
							contracts.testRolesAdapter.address,
							0,
							contracts.testRoles2Library.contract.canCall.getData(caller, contracts.testRolesAdapter.address, callSig),
							await contracts.mock.convertUIntToBytes32(1) // true
						)
					}
					{
						const callSig1 = contracts.testRolesAdapter.contract.getTest1.getData().slice(0, 10)
						await contracts.mock.expect(
							contracts.testRolesAdapter.address,
							0,
							contracts.testRoles2Library.contract.canCall.getData(onlyTest1Caller, contracts.testRolesAdapter.address, callSig1),
							await contracts.mock.convertUIntToBytes32(1) // true
						)
					}
				})

				afterEach(async () => {
					await reverter.promisifyRevert()
				})

				it(`should allow to permitted caller with ${expectedReturn.toString(16)} value`, async () => {
					assert.equal(
						(await contracts.testRolesAdapter.getProtectedTest1.call({ from: caller, })).toString(16),
						expectedReturn.toString(16)
					)

					await contracts.testRolesAdapter.getProtectedTest1({ from: caller, })
					await assertExpectations(1, 1)
				})

				it(`should NOT be allowed to not permitted caller with UNAUTHORIZED code`, async () => {
					assert.equal(
						(await contracts.testRolesAdapter.getProtectedTest1.call({ from: onlyTest1Caller, })).toString(16),
						'0'
					)

					const tx = await contracts.testRolesAdapter.getProtectedTest1({ from: onlyTest1Caller, })
					{
						const event = (await eventsHelper.findEvent([contracts.testRolesAdapter,], tx, "AuthFailedError"))[0]
						assert.isDefined(event)
						assert.equal(event.args.code, contracts.testRolesAdapter.address)
						assert.equal(event.args.sender, onlyTest1Caller)
						assert.equal(event.args.sig, callSig)
					}
					await assertExpectations(2, 1)
				})
			})
		})

	})

})