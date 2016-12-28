const assert = require("power-assert");
const sinon = require("sinon");

const State = require("../src/state");

const Behavior = require("../src/Behavior");

const CONTEXT = {};

describe("Behavior", function(){

    beforeEach(Behavior.resetActions);

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

        Behavior.registerAction("Wait", waitSpy);

        Behavior.registerAction("Do", {
            init: initSpy,
            update: doSpy
        });
        Behavior.registerAction("Check", checkSpy);

        const b = Behavior.load(require("./behaviours/sequence.json"));

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

        Behavior.registerAction("Compare", compareSpy);

        const b = Behavior.load(require("./behaviours/selector.json"));

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

        Behavior.registerAction("Compare", compareSpy);

        const b = Behavior.load(require("./behaviours/node-memory.json"));

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

        Behavior.registerAction("Do", doAction);

        const b = Behavior.load(require("./behaviours/node-init.json"));

        const instance = b.createInstance({
            value: 2
        });

        let result = b.update(CONTEXT, instance);

        assert(result == State.RUNNING);
        assert(doAction.init.callCount === 2);
        assert(doAction.init.getCall(0).args[2].value === 1);
        assert(doAction.init.getCall(1).args[2].value === 2);
        assert(doAction.update.callCount === 2);

        doAction.init.reset();
        doAction.update.reset();

        instance.getMemory().value = 1;

        result = b.update(CONTEXT, instance);

        assert(result == State.RUNNING);

        // .init must be called even if we go from RUNNING on one node directly to RUNNING on another
        assert(doAction.init.callCount === 1);
        assert(doAction.init.getCall(0).args[2].value === 1);
        assert(doAction.update.callCount === 1);

    });

    it("Inverter inverts", function ()
    {
        Behavior.registerAction("Check", function (ctx, tree)
        {
            return tree.value === 0 ? State.SUCCESS :
                tree.value < 0 ? State.RUNNING : State.FAILURE;
        });

        const b = Behavior.load(require("./behaviours/inverter.json"));

        const instance = b.createInstance({
            value: 1
        });

        assert(b.update(CONTEXT, instance) == State.SUCCESS);

        instance.getMemory().value = 0;

        assert(b.update(CONTEXT, instance) == State.FAILURE);

        // not inverted
        instance.getMemory().value = -1;
        assert(b.update(CONTEXT, instance) == State.RUNNING);
    });

    it("Succeeder always succeeds", function ()
    {
        Behavior.registerAction("Check", function (ctx, tree)
        {
            return tree.value === 0 ? State.SUCCESS :
                tree.value < 0 ? State.RUNNING : State.FAILURE;
        });

        const b = Behavior.load(require("./behaviours/succeeder.json"));

        const instance = b.createInstance({
            value: 1
        });

        assert(b.update(CONTEXT, instance) == State.SUCCESS);

        instance.getMemory().value = 0;

        assert(b.update(CONTEXT, instance) == State.SUCCESS);

        // not changed
        instance.getMemory().value = -1;
        assert(b.update(CONTEXT, instance) == State.RUNNING);
    });

    it("Failer always fails", function ()
    {
        Behavior.registerAction("Check", function (ctx, tree)
        {
            return tree.value === 0 ? State.SUCCESS :
                tree.value < 0 ? State.RUNNING : State.FAILURE;
        });

        const b = Behavior.load(require("./behaviours/failer.json"));

        const instance = b.createInstance({
            value: 1
        });

        assert(b.update(CONTEXT, instance) == State.FAILURE);

        instance.getMemory().value = 0;

        assert(b.update(CONTEXT, instance) == State.FAILURE);

        // not changed
        instance.getMemory().value = -1;
        assert(b.update(CONTEXT, instance) == State.RUNNING);
    });

    it("RepeatUntilSuccess works", function ()
    {
        let thriceAction = {

            init: function (ctx, tree, node)
            {
                node.count = 0;
            },
            update: sinon.spy(function (ctx, tree, node)
            {
                if (node.count === 3)
                {
                    return node.result;
                }
                node.count++;
                return State.RUNNING;
            })
        };
        Behavior.registerAction("Thrice", thriceAction);

        const b = Behavior.load(require("./behaviours/repeat-until-success.json"));

        const instance = b.createInstance();

        assert(b.update(CONTEXT, instance) == State.SUCCESS);

        assert(thriceAction.update.callCount === 4);

    });

    it("RepeatUntilFailure works", function ()
    {
        let thriceAction = {

            init: function (ctx, tree, node)
            {
                node.count = 0;
            },
            update: sinon.spy(function (ctx, tree, node)
            {
                if (node.count === 3)
                {
                    return node.result;
                }
                node.count++;
                return State.RUNNING;
            })
        };
        Behavior.registerAction("Thrice", thriceAction);

        const b = Behavior.load(require("./behaviours/repeat-until-failure.json"));

        const instance = b.createInstance();

        assert(b.update(CONTEXT, instance) == State.SUCCESS);

        assert(thriceAction.update.callCount === 4);

    });


});
