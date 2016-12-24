
const assert = require("power-assert");
const sinon = require("sinon");
const proxyquire = require("proxyquire");

const State = require("../src/state");

const ActionService = require("../src/ActionService");

const Behavior = require("../src/Behavior");

let waitSpy = sinon.spy(function (tree)
{
    return State.SUCCESS;
});

let doSpy = sinon.spy(function (tree)
{
    return State.SUCCESS;
});

let compareSpy = sinon.spy(function (tree, node)
{
    return node.count === tree.count;
});

let checkSpy = sinon.spy(function (tree)
{
    return tree.count === 0;
});

ActionService.register("Wait", waitSpy);

ActionService.register("Do", doSpy);

ActionService.register("Compare", compareSpy);

ActionService.register("Check", checkSpy);

describe("Behavior", function(){

    beforeEach(function ()
    {
        waitSpy.reset();
        doSpy.reset();
        compareSpy.reset();
        checkSpy.reset();
    });

	it("supports sequences", function()
	{

        const b = new Behavior(require("./behaviours/sequence.json"));

        let instance = b.createInstance({
            count: 0
        });

        let result = b.update(instance);
        assert(result == State.SUCCESS);

        assert(checkSpy.callCount === 1);
        assert(doSpy.callCount === 1);
        assert(waitSpy.callCount === 1);

        instance.globalMemory.count = 1;

        result = b.update(instance);
        assert(result == State.FAILURE);

        assert(checkSpy.callCount === 2);
        assert(doSpy.callCount === 1);
        assert(waitSpy.callCount === 1);

    });

    it("supports selectors", function()
    {
        const b = new Behavior(require("./behaviours/selector.json"));

        let instance = b.createInstance({
            count: 0
        });

        let result = b.update(instance);
        assert(result == State.SUCCESS);
        assert(compareSpy.callCount === 1);

        instance.globalMemory.count = 1;

        result = b.update(instance);
        assert(result == State.SUCCESS);
        assert(compareSpy.callCount === 3);

    });

	it("supports node memory", function ()
    {
        const b = new Behavior(require("./behaviours/node-memory.json"));

        let instance = b.createInstance({
            count: 12
        });


        assert(instance.getNodeMemory("myNode").count === 12);
        assert(instance.getNodeMemory("myNode2").count === 11);

        let result = b.update(instance);

        assert(result == State.FAILURE);
        assert(compareSpy.callCount === 2);

        instance.getNodeMemory("myNode2").count = 12;

        result = b.update(instance);
        assert(compareSpy.callCount === 4);
        assert(result == State.SUCCESS);
    });

});
