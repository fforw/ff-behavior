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

    node.id = id;

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
    if (handler && handler.length > 1)
    {

        let mem = {};
        for (let name in node)
        {
            if (node.hasOwnProperty(name) && name !== "name" && name !== "kids" && name !== "id")
            {
                mem[name] = node[name];
            }
        }

        array[node.id] = mem;
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


function updateNodes(node, instance)
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
                    let state = updateNodes(kids[i], instance);
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
                    let state = updateNodes(kids[i], instance);
                    if (state !== State.FAILURE)
                    {
                        result = state;
                        break;
                    }
                }
            }
            break;
        default:
            let handler = ActionService.lookup(nodeName);
            if (!handler)
            {
                throw new Error("Invalid action: " + nodeName);
            }

            result = handler(instance.globalMemory, instance.nodeMemory[node.id]);

            if (typeof result === "boolean")
            {
                result = result ? State.SUCCESS : State.FAILURE;
            }
    }

    //console.log("Update", nodeName, " => ", result);

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

Behavior.prototype.update = function(instance)
{
    return updateNodes(this.rootNode, instance);
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
}


BehaviorInstance.prototype.getNodeMemory = function (nodeName)
{
    return this.nodeMemory[this.behaviour.nodeIdxByName[nodeName]];
};



module.exports = Behavior;

