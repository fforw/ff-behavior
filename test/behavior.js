
const assert = require("power-assert");
const sinon = require("sinon");
const proxyquire = require("proxyquire");

const State = require("../src/state");

const ActionService = require("../src/ActionService");

const Behavior = require("../src/Behavior");

const CONTEXT = {};

describe("Behavior", function(){

    beforeEach(ActionService.reset);

	it("supports sequences", function()
	{
        let waitSpy = sinon.spy(function (ctx, tree)
        {
            return State.SUCCESS;
        });

        let doSpy = sinon.spy(function (ctx, tree, node)
        {
            if (node.flag)
            {
                return State.SUCCESS;
            }
            node.flag = true;
            return State.RUNNING;
        });


        let checkSpy = sinon.spy(function (ctx, tree)
        {
            return tree.count === 0;
        });

        let initSpy = sinon.spy();

        ActionService.register("Wait", waitSpy);

        ActionService.register("Do", {
            init: initSpy,
            update: doSpy
        });
        ActionService.register("Check", checkSpy);

        const b = new Behavior(require("./behaviours/sequence.json"));

        let instance = b.createInstance({
            count: 0
        });

        let result = b.update(CONTEXT, instance);
        assert(result == State.RUNNING);

        result = b.update(CONTEXT, instance);
        assert(result == State.SUCCESS);

        assert(checkSpy.callCount === 2);
        assert(initSpy.callCount === 1);
        assert(doSpy.callCount === 2);
        assert(waitSpy.callCount === 1);

        // context gets fed back to all functions
        assert(checkSpy.getCall(0).args[0] === CONTEXT);
        assert(checkSpy.getCall(1).args[0] === CONTEXT);
        assert(initSpy.getCall(0).args[0] === CONTEXT);
        assert(doSpy.getCall(0).args[0] === CONTEXT);
        assert(doSpy.getCall(1).args[0] === CONTEXT);
        assert(waitSpy.getCall(0).args[0] === CONTEXT);

        instance.getMemory().count = 1;

        result = b.update(CONTEXT, instance);
        assert(result == State.FAILURE);

        assert(checkSpy.callCount === 3);
        assert(initSpy.callCount === 1);
        assert(doSpy.callCount === 2);
        assert(waitSpy.callCount === 1);

    });

    it("supports selectors", function()
    {
        let compareSpy = sinon.spy(function (ctx, tree, node)
        {
            return node.count === tree.count;
        });

        ActionService.register("Compare", compareSpy);

        const b = new Behavior(require("./behaviours/selector.json"));

        let instance = b.createInstance({
            count: 0
        });

        let result = b.update(CONTEXT, instance);
        assert(result == State.SUCCESS);
        assert(compareSpy.callCount === 1);

        instance.getMemory().count = 1;

        result = b.update(CONTEXT, instance);
        assert(result == State.SUCCESS);
        assert(compareSpy.callCount === 3);

    });

	it("supports node memory", function ()
    {
        let compareSpy = sinon.spy(function (ctx, tree, node)
        {
            return node.count === tree.count;
        });

        ActionService.register("Compare", compareSpy);

        const b = new Behavior(require("./behaviours/node-memory.json"));

        let instance = b.createInstance({
            count: 12
        });


        assert(instance.getNodeMemory("myNode").count === 12);
        assert(instance.getNodeMemory("myNode2").count === 11);

        let result = b.update(CONTEXT, instance);

        assert(result == State.FAILURE);
        assert(compareSpy.callCount === 2);

        instance.getNodeMemory("myNode2").count = 12;

        result = b.update(CONTEXT, instance);
        assert(compareSpy.callCount === 4);
        assert(result == State.SUCCESS);
    });

	it("calls node init", function ()
    {
        const doAction = {
            init: sinon.spy(),
            update: sinon.spy(function (ctx, tree, node)
            {
                return (
                    tree.value === node.value ? State.RUNNING :
                        tree.value < node.value ? State.SUCCESS : State.FAILURE
                );
            })
        };
});
