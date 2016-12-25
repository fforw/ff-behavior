const ActionService = require("./ActionService");
const State = require("./state");

function initIds(node, id, nodeIdxByName)
{
    if (node.id)
    {
        if (nodeIdxByName[node.id])
        {
            throw new Error("Node id '" + node.id + "' used more than once.");
        }
        nodeIdxByName[node.id] = id;
    }

    node._id = id;

    let kids = node.kids;
    if (kids)
    {
        for (let i = 0; i < kids.length; i++)
        {
            initIds(kids[i], ++id, nodeIdxByName);
        }
    }

    return id;
}


function initNodeMemory(array, node)
{
    let handler = ActionService.lookup(node.name);

    if (handler && handler.update.length > 2)
    {
        let mem = {};
        for (let name in node)
        {
            if (node.hasOwnProperty(name) && name !== "name" && name !== "kids" && name !== "id")
            {
                mem[name] = node[name];
            }
        }

        array[node._id] = mem;
    }

    let kids = node.kids;
    if (kids)
    {
        for (let i = 0; i < kids.length; i++)
        {
            initNodeMemory(array, kids[i]);
        }
    }
    return array;
}


function updateNodes(node, ctx, instance)
{
    let nodeName = node.name;

    let kids = node.kids;

    let result;
    switch(nodeName)
    {
        case "Sequence":
            result = State.SUCCESS;
            if (kids)
            {
                for (let i = 0; i < kids.length; i++)
                {
                    let state = updateNodes(kids[i], ctx, instance);
                    if (state !== State.SUCCESS)
                    {
                        result = state;
                        break;
                    }
                }
            }
            break;
        case "Selector":
            result = State.FAILURE;
            if (kids)
            {
                for (let i = 0; i < kids.length; i++)
                {
                    let state = updateNodes(kids[i], ctx, instance);
                    if (state !== State.FAILURE)
                    {
                        result = state;
                        break;
                    }
                }
            }
            break;
        case "Inverter":
            if (kids && kids.length)
            {
                const kidState = updateNodes(kids[0], ctx, instance);

                if (kidState === State.SUCCESS)
                {
                    result = State.FAILURE;
                }
                else if (kidState === State.FAILURE)
                {
                    result = State.SUCCESS;
                }
                else
                {
                    result = kidState;
                }
            }
            break;
        case "Succeeder":
            if (kids && kids.length)
            {
                const kidState = updateNodes(kids[0], ctx, instance);

                result = kidState !== State.RUNNING ? State.SUCCESS : State.RUNNING;
            }
            else
            {
                result = State.SUCCESS;
            }
            break;
        case "Failer":
            if (kids && kids.length)
            {
                const kidState = updateNodes(kids[0], ctx, instance);

                result = kidState !== State.RUNNING ? State.FAILURE : State.RUNNING;
            }
            else
            {
                result = State.FAILURE;
            }
            break;
        case "RepeatUntilSuccess":
            if (kids && kids.length)
            {
                let state;
                do
                {
                    state = updateNodes(kids[0], ctx, instance);
                } while( state !== State.SUCCESS );

                result = State.SUCCESS;
            }
            break;
        case "RepeatUntilFailure":
            if (kids && kids.length)
            {
                let state;
                do
                {
                    state = updateNodes(kids[0], ctx, instance);
                } while( state !== State.FAILURE );

                result = State.SUCCESS;
            }
            break;
        default:
            let handler = ActionService.lookup(nodeName);
            if (!handler)
            {
                throw new Error("Invalid action: " + nodeName);
            }

            if (instance.runningNode !== node && handler.init)
            {
                handler.init(ctx, instance.globalMemory, instance.nodeMemory[node._id])
            }

            result = handler.update(ctx, instance.globalMemory, instance.nodeMemory[node._id]);

            if (typeof result === "boolean")
            {
                result = result ? State.SUCCESS : State.FAILURE;
            }

            if (result === State.RUNNING)
            {
                instance.runningNode = node;
            }
            else if (
                result !== State.SUCCESS &&
                result !== State.FAILURE
            )
            {
                throw new Error("Invalid leaf handler return value: " + result);
            }

            break;
    }

    //console.log("Update", nodeName, " ( id = ", node.id || node._id, ") => ", result);

    return result;
}


/**
 * Behavior tree
 *
 * @constructor
 */
function Behavior(data)
{
    this.rootNode = data.root;
    this.nodeIdxByName = {};
    this.count = initIds(data.root, 0, this.nodeIdxByName)
}

Behavior.prototype.createInstance = function(globalMemory)
{
    return new BehaviorInstance(this, globalMemory);
};

Behavior.prototype.update = function(ctx, instance)
{
    return updateNodes(this.rootNode, ctx, instance);
};

/**
 * Behavior tree state
 *
 * @param behaviour         behaviour
 * @param globalMemory      default global memory
 *
 * @constructor
 */
function BehaviorInstance(behaviour, globalMemory)
{
    this.behaviour = behaviour;
    this.globalMemory = globalMemory || {};
    this.nodeMemory = initNodeMemory(new Array(behaviour.count), behaviour.rootNode);
    this.runningNode = null;
}


BehaviorInstance.prototype.getNodeMemory = function (nodeName)
{
    return this.nodeMemory[this.behaviour.nodeIdxByName[nodeName]];
};

BehaviorInstance.prototype.getMemory = function()
{
    return this.globalMemory;
};



module.exports = Behavior;

