var Marketplace = artifacts.require("./Marketplace.sol");
const should = require('should');

const {makeContractInPeriod, periods} = require("./util")


contract('Marketplace (modifiers)', function (accounts) {
    const defaultBid = {
        intervalId: 0,
        sender: accounts[0],
        amount: 5,
        price: 100
    }

    it("should be possible to place bids and asks in the bidding period", async function () {
        const intervalId = 0
        const contract = await makeContractInPeriod("BIDDING", intervalId)

        const bid = defaultBid
        bid.intervalId = intervalId
        await contract.submitBid.sendTransaction(bid.intervalId, bid.amount, bid.price)
        await contract.submitAsk.sendTransaction(bid.intervalId, bid.amount, bid.price)
    })

    it("should not be possible to place bids and asks outside of bidding period", async function () {
        const intervalId = 0
        for (period of periods) {
            // in that period bidding is allowed
            if (period === "BIDDING") continue

            const contract = await makeContractInPeriod(period, intervalId)
            const bid = defaultBid
            bid.intervalId = intervalId

            await contract.submitAsk.sendTransaction(bid.intervalId, bid.amount, bid.price).should.be.rejected()
        }
    })

    it("should not be possible to clear outside of the clearing period", async function () {
        const intervalId = 0
        for (period of periods) {
            // in that period bidding is allowed
            if (period === "CLEARING") continue

            const contract = await makeContractInPeriod(period, intervalId)

            await contract.clearInterval.sendTransaction(intervalId).should.be.rejected()
        }
    })

    it("should be possible to clear in the clearing period", async function () {
        const intervalId = 0
        const period = "CLEARING"
        const contract = await makeContractInPeriod(period, intervalId)
        await contract.clearInterval.sendTransaction(intervalId).should.not.be.rejected()
    })

    it("should be impossible to clear an interval twice", async function () {
        const intervalId = 0
        const period = "CLEARING"
        const contract = await makeContractInPeriod(period, intervalId)
        await contract.clearInterval.sendTransaction(intervalId).should.not.be.rejected()
        await contract.clearInterval.sendTransaction(intervalId).should.be.rejected()
    })

    it("should refund gas when clearInterval is called at the wrong time", async function () {
        const intervalId = 0
        const period = "BIDDING"
        const contract = await makeContractInPeriod(period, intervalId)
        const priorBalance = web3.eth.getBalance(accounts[0])
        const gasSent = 100000
        const gasPrice = web3.toWei(100, 'shannon') // default gas price https://truffleframework.com/docs/truffle/reference/configuration
        try {
            await contract.clearInterval.sendTransaction(intervalId, {
                gas: gasSent
            })
        }
        catch (e) {
            const postBalance = web3.eth.getBalance(accounts[0])
            const gasUsed = +priorBalance.minus(postBalance).dividedBy(gasPrice)
            gasUsed.should.be.lessThan(gasSent)
        }

    })
})